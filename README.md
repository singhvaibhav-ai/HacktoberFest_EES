![HackDay x Hacktoberfest 2026, NIT Jamshedpur](docs/banner.jpg)

# CodeArena

A tiny online judge, like a mini LeetCode, built for **HackDay x Hacktoberfest 2026 at NIT Jamshedpur**, organised by the Electrical Engineering Society.

## The event

- **When:** Saturday, 31 October 2026, 9:30 AM to 3:30 PM
- **Where:** NIT Jamshedpur
- **Teams:** 3 members (at least one girl in every team)
- **Prizes:** T-shirts, Arduino boards and goodies for top performers, and a laptop sticker pack for every participant

**Register in both places to take part:**

1. [NIT Jamshedpur registration form](https://forms.gle/sGuPKwaUhMbXUrnbA)
2. [Hacktoberfest Hack Day registration on MLH](https://events.mlh.com/events/14996-hacktoberfest-hack-day-jamshedpur-x-nit-jamshedpur)

Pick a problem, write a solution, hit **Submit**, and get a verdict: Accepted, Wrong Answer, Time Limit Exceeded, Runtime Error or Compilation Error.

It works... mostly. Some verdicts are wrong, the leaderboard page is empty, only Python is supported, and dark mode is half-done. **That's where you come in.** Check the [Issues](../../issues) tab, pick one, and send a pull request.

## How it works

Your code never runs on a server. It runs **inside your own browser**:

- Python runs through [Pyodide](https://pyodide.org/), which is Python compiled to WebAssembly.
- Lua runs through [Fengari](https://fengari.io/), a Lua VM written in JavaScript.
- The code runs in a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API), so an infinite loop can't freeze the page. When the time limit runs out, the page kills the worker.
- The page compares your output with the expected output and works out the verdict.
- The small Express server stores team accounts and submissions, and serves problems and the leaderboard.
- Like LeetCode, anyone can read problems and write code, but you need a team account to **submit**.

```
client/            React + Vite frontend
  public/python-worker.js   runs Python in a Web Worker
  public/lua-worker.js      runs Lua in a Web Worker (Fengari)
  src/judge/                runner, output comparison, verdicts
  src/pages/                Problem list, problem page, leaderboard, log in / sign up
  src/auth.jsx              who is logged in (React context)
server/            Express API (stores data in server/data/db.json)
  auth.js                   sign up, log in, log out, sessions
problems/          one folder per problem
```

## Run it locally

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
git clone https://github.com/<your-username>/HacktoberFest_EES.git
cd HacktoberFest_EES
npm install
npm run dev
```

Open http://localhost:5173, click **Sign up** to create a team account, and solve **Hello, Arena!**

- The frontend runs on port 5173 and the API on port 4000.
- The first submission takes a few seconds while Python loads in your browser.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you start. It explains the tags and points, how PRs are judged, how to add a problem and what a good PR looks like. PRs are not merged during the event; each one is judged on its own.

## License

[MIT](LICENSE)
