<div align="left">

#### Hackathon — Ripple Social Club × Living Room Labs

</div>

<div align="center">

# MoneyX-Ray

**AI-powered bank statement analysis in seconds.**

[Live demo](https://money-xray.vercel.app) · Built with JavaScript, Claude & Vercel

</div>

---

## What it is

Upload a bank statement and Money X-Ray gives you an instant, plain-English breakdown of where your money actually goes — spending by category, the subscriptions quietly draining your account, and how long your money would last. No spreadsheets, no manual tagging.

> The live site runs in demo mode on a sample statement, so anyone can try it for free. To analyse your own statement, deploy your own copy with your own API key (instructions below).

## How it works

Money X-Ray splits the work between the AI and the code, deliberately:

- The **AI reads and judges** — it categorises each transaction (groceries, transport, subscriptions, etc.) and flags what counts as spending versus transfers or income.
- The **code does all the maths** — every total, category sum, and projection is calculated in code, never by the AI.

This matters: language models are unreliable at arithmetic, so Money X-Ray never lets the AI add anything up. The AI labels; the code counts. That's why the totals always reconcile exactly.

The flow: parse the statement into transactions → AI classifies each one → code aggregates the totals → results render as a breakdown.

## Features

- Spending breakdown by category with a doughnut chart
- Subscription detection with annual cost totals
- 1-year financial runway projection
- Honest handling of transfers, income, and refunds (excluded from spending)
- Graceful offline fallback if the API is unavailable

## Deploy your own copy

To run Money X-Ray on your own bank statements, deploy your own copy with your own Anthropic API key. Your key stays private to your deployment, and your data never touches anyone else's server.

1. **Fork this repo** to your own GitHub account (Fork button, top right).
2. **Import it into Vercel** at [vercel.com/new](https://vercel.com/new) and select your forked repo.
3. **Add your API key** as an environment variable:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key from [console.anthropic.com](https://console.anthropic.com)
   - (Leave `DEMO_MODE` unset — that flag is only used to lock the public demo. Without it, your copy gets the full uploader automatically.)
4. **Deploy.** No build step needed — it's a static frontend plus serverless functions.

That's it. Your deployment will have the real file uploader, so you can analyse your own statements (CSV).

A sample statement (`sample_statement.csv`) is included in the repo for testing.

## Run locally (optional)

To run it on your own machine:

1. Clone your fork: `git clone <your-fork-url>`
2. Install dependencies: `npm install`
3. Create a `.env` file with: `ANTHROPIC_API_KEY=your-key-here`
4. Run with the Vercel CLI: `vercel dev`
5. Open the local URL it gives you (usually `http://localhost:3000`).

## Roadmap

Turning Money X-Ray from a one-off snapshot into an ongoing tool:

- [ ] Month-by-month timeline — track how spending changes over the year
- [ ] AI Money Coach — ask follow-up questions about your finances in plain English
- [ ] Financial health score — a single 0–100 verdict with a quick explanation
- [ ] Editable categories — customise category rules instead of the defaults
- [ ] Export & share — download your report as a PDF or image
- [ ] Local-only privacy mode — run the analysis without your data leaving your device


