// Reads and writes problems in the /problems folder at the repo root.
// Each problem is a folder: statement.md, meta.json and tests/N.in + tests/N.out
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROBLEMS_DIR = path.join(__dirname, '..', 'problems');

function readMeta(slug) {
  const meta = JSON.parse(fs.readFileSync(path.join(PROBLEMS_DIR, slug, 'meta.json'), 'utf8'));
  return { slug, ...meta };
}

function readTests(slug) {
  const dir = path.join(PROBLEMS_DIR, slug, 'tests');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.in'))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((f) => ({
      input: fs.readFileSync(path.join(dir, f), 'utf8'),
      output: fs.readFileSync(path.join(dir, f.replace(/\.in$/, '.out')), 'utf8'),
    }));
}

export function listProblems() {
  return fs
    .readdirSync(PROBLEMS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => readMeta(d.name))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export function getProblem(slug) {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  if (!fs.existsSync(path.join(PROBLEMS_DIR, slug))) return null;
  return {
    ...readMeta(slug),
    statement: fs.readFileSync(path.join(PROBLEMS_DIR, slug, 'statement.md'), 'utf8'),
    tests: readTests(slug),
  };
}

export function saveProblem({ slug, title, difficulty, tags, order, timeLimitMs, statement, tests }) {
  const cleanSlug = String(slug || '').trim().toLowerCase();
  if (!cleanSlug || !/^[a-z0-9-]+$/.test(cleanSlug)) {
    throw new Error('Slug must only contain lowercase letters, numbers, and hyphens (e.g. "two-sum")');
  }
  if (!title || !title.trim()) {
    throw new Error('Title is required');
  }

  const problemDir = path.join(PROBLEMS_DIR, cleanSlug);
  const testsDir = path.join(problemDir, 'tests');

  fs.mkdirSync(testsDir, { recursive: true });

  const parsedTags = Array.isArray(tags)
    ? tags
    : String(tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

  const meta = {
    title: title.trim(),
    difficulty: difficulty || 'Easy',
    tags: parsedTags,
    order: Number(order) || 99,
    timeLimitMs: Number(timeLimitMs) || 2000,
  };

  fs.writeFileSync(path.join(problemDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(problemDir, 'statement.md'), String(statement || '').trim() + '\n', 'utf8');

  // Clear existing test cases in tests/
  if (fs.existsSync(testsDir)) {
    for (const file of fs.readdirSync(testsDir)) {
      if (file.endsWith('.in') || file.endsWith('.out')) {
        fs.unlinkSync(path.join(testsDir, file));
      }
    }
  }

  // Write new test cases
  const testList = Array.isArray(tests) ? tests : [];
  testList.forEach((test, idx) => {
    const num = idx + 1;
    fs.writeFileSync(path.join(testsDir, `${num}.in`), String(test.input ?? ''), 'utf8');
    fs.writeFileSync(path.join(testsDir, `${num}.out`), String(test.output ?? ''), 'utf8');
  });

  return { slug: cleanSlug, ...meta, statement, tests: testList };
}
