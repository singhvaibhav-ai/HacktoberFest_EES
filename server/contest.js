import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const CONTEST_FILE = path.join(DATA_DIR, 'contest.json');
const ROOT_CONTEST_FILE = path.join(__dirname, 'contest.json');

export function loadContestConfig() {
  const startEnv = process.env.CONTEST_START;
  const endEnv = process.env.CONTEST_END;
  const freezeEnv = process.env.CONTEST_FREEZE_MINUTES;

  if (startEnv && endEnv) {
    return {
      start: startEnv,
      end: endEnv,
      freezeMinutes: freezeEnv ? parseInt(freezeEnv, 10) : 30,
    };
  }

  for (const file of [CONTEST_FILE, ROOT_CONTEST_FILE]) {
    if (fs.existsSync(file)) {
      try {
        const raw = fs.readFileSync(file, 'utf8');
        const data = JSON.parse(raw);
        if (data && data.start && data.end) {
          return {
            start: data.start,
            end: data.end,
            freezeMinutes: data.freezeMinutes !== undefined ? parseInt(data.freezeMinutes, 10) : 30,
          };
        }
      } catch {
        // ignore parse error
      }
    }
  }

  return null;
}

export function getContestState(now = Date.now()) {
  const config = loadContestConfig();
  if (!config) {
    return {
      enabled: false,
      status: 'running',
      isFrozen: false,
      start: null,
      end: null,
      freezeAt: null,
      freezeMinutes: 30,
      serverTime: new Date(now).toISOString(),
      remainingMs: 0,
    };
  }

  const startTime = new Date(config.start).getTime();
  const endTime = new Date(config.end).getTime();
  const freezeMinutes = config.freezeMinutes ?? 30;
  const freezeTime = endTime - (freezeMinutes * 60 * 1000);

  let status = 'running';
  let isFrozen = false;
  let remainingMs = 0;

  if (now < startTime) {
    status = 'upcoming';
    remainingMs = startTime - now;
  } else if (now > endTime) {
    status = 'ended';
    remainingMs = 0;
  } else {
    status = 'running';
    remainingMs = endTime - now;
    if (now >= freezeTime) {
      isFrozen = true;
    }
  }

  return {
    enabled: true,
    status,
    isFrozen,
    start: new Date(startTime).toISOString(),
    end: new Date(endTime).toISOString(),
    freezeAt: new Date(freezeTime).toISOString(),
    freezeMinutes,
    serverTime: new Date(now).toISOString(),
    remainingMs,
  };
}
