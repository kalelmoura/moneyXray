<div align="left">

#### Hackathon — Ripple Social Club × Living Room Labs

</div>

<div align="center">

# MoneyX-Ray

**AI-powered bank statement analysis in seconds.**

</div>

### Overview:
Upload any bank statement and get an instant AI breakdown of your spending categories, recurring subscriptions, and financial runway — powered by Claude AI.

## Features

- Spending breakdown with a doughnut chart
- Subscription detection with annual cost totals
- 1-year financial runway projection
- Graceful offline fallback if the API is unavailable

## Improvements

Future features to turn Money X-Ray from a one-off snapshot into an ongoing tool:

- [ ] Month-by-month timeline — upload a statement per month and track how
      your spending changes over the year
- [ ] AI Money Coach — ask follow-up questions about your finances in plain
      English and get tailored answers
- [ ] Financial health score — a single 0–100 verdict with a quick explanation
- [ ] Editable categories — customise category rules instead of relying on
      the defaults
- [ ] Export & share — download your report as a PDF or image
- [ ] Local-only privacy mode — run the analysis without your data leaving
      your device

## Deploy

1. Fork this repo to your own GitHub account.
2. Import this repo into [Vercel](https://vercel.com/new)
3. Add environment variable: `ANTHROPIC_API_KEY` — your own key from
   https://console.anthropic.com.
4. Deploy. no build step needed.

A sample CSV (`sample.csv`) is included for testing.

