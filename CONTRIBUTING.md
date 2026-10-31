# Contributing to CodeArena

Welcome, HackDay x Hacktoberfest 2026 participant! (Not registered yet? See [The event](README.md#the-event).) Here's how to go from zero to a judged pull request.

## How Hack Day works

- Every issue has exactly one tag, and the tag sets its points:

| Tag | Points | Typical time |
| --- | --- | --- |
| `documentation` | 1 | under 1 hour |
| `beginner` | 10 | 30 minutes to 2 hours |
| `hard` | 20 | 3 to 6 hours |

- **PRs are not merged during the event.** The repo stays exactly as it is, so every team starts from the same code. Judges score each PR on its own at the end.
- **Several teams can work on the same issue.** You don't need to claim anything; just pick an issue and start.
- Every issue stands alone, so your PR must work by itself and must not depend on anyone else's PR.
- Only PRs opened before the cut-off time announced on the day count.

## 1. Pick an issue

- Browse the [Issues](../../issues). New to open source? Start with `documentation` or `beginner` (also labelled `good first issue`).
- Read the whole issue: it says what's wrong, how to see it, where to look and when it counts as done.

## 2. Make your change

```bash
# fork the repo on GitHub first, then:
git clone https://github.com/<your-username>/HacktoberFest_EES.git
cd HacktoberFest_EES
git checkout -b fix-dark-mode     # one branch per issue
npm install
npm run dev
```

Keep the change focused on the issue. A small PR that does one thing well beats a big one that does five things halfway.

## 3. Open a pull request

- Title: your team name and what you changed, e.g. `[Team Ohm] Fix dark mode so it covers the whole page`
- In the description, write `Closes #<issue number>`, explain what you changed and how you tested it, and add a screenshot or GIF if the change is visible.
- One issue per PR. Make sure `npm run build` still works.

## How PRs are judged

Each PR earns its tag's points, scaled by quality:

| What judges check | Weight |
| --- | --- |
| It works: the issue's "Done when" is met and the app still runs | 50% |
| Code quality: focused, readable, no unrelated changes | 30% |
| PR description: clear explanation, `Closes #N`, screenshot | 20% |

## Adding a new problem

Each problem lives in its own folder under `problems/`:

```
problems/two-sum/
  meta.json        title, difficulty, tags, time limit (timeLimitMs in milliseconds)
  statement.md     the problem statement in Markdown
  tests/1.in       input for test 1
  tests/1.out      expected output for test 1
  tests/2.in ...
```

`meta.json` looks like this:

```json
{
  "title": "Two Sum",
  "difficulty": "Easy",
  "tags": ["arrays"],
  "order": 6,
  "timeLimitMs": 2000
}
```

- Use a lowercase folder name with dashes (`two-sum`, not `Two Sum`).
- Add at least 5 tests, including tricky edge cases.
- Write your own solution and make sure it gets Accepted before you open the PR.

## Ground rules

- **Never run submitted code on the server.** No `eval`, `exec` or `child_process` in `server/`. User code only runs in the browser.
- Be kind. Everyone here is learning, and that includes the organisers.
