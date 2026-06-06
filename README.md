# MoneyX-Ray

**AI-powered bank statement analysis in seconds.**

MoneyX-Ray is a financial analysis web app built during a hackathon. It allows users to upload a bank statement CSV and instantly receive a clear financial report with spending insights, income analysis, category breakdowns, recurring subscriptions, runway estimation, and an AI-generated summary.

---

## Overview

Most people have access to their bank statements, but they do not always have the time, patience, or financial knowledge to properly understand where their money is going.

MoneyX-Ray solves this by turning a raw bank statement CSV into a simple, visual, and easy-to-understand financial dashboard.

The goal is to help users quickly understand:

- How much they spent
- How much they earned
- Where their money went
- Which subscriptions are recurring
- How long their money could last based on current spending
- What financial insights can be extracted from their statement

---

## Features

- Upload and analyse a bank statement CSV
- Calculate total spending analysed
- Calculate average monthly spend
- Calculate total income received
- Detect recurring subscriptions
- Estimate yearly subscription costs
- Categorise transactions automatically
- Display spending breakdown with charts
- Show spending by category
- Estimate financial runway
- Generate a plain-English AI financial summary
- Option to analyse another statement

---

## Example Insights

MoneyX-Ray can identify insights such as:

- Total spending over the analysed period
- Income received during the month
- Percentage of income saved
- Largest spending categories
- Recurring monthly subscriptions
- Yearly cost of subscriptions
- Potential areas to optimise spending

Example:

> You earned £2,500 in May and spent £1,264, saving 49% of your income. Rent dominates your expenses, but gym membership and dining costs offer room to optimise further if you are looking to increase savings.

---

## Dashboard Sections

### Total Spending Analysed

Displays the total amount spent during the analysed period.

### Key Metrics

Shows the user's:

- Average monthly spend
- Total income
- Monthly subscription cost
- Estimated yearly subscription cost

### Spending Breakdown

A visual chart showing how spending is distributed across different categories.

### By Category

A detailed category list showing:

- Housing
- Groceries and shopping
- Transport
- Health and fitness
- Bills and utilities
- Dining and entertainment
- Savings and transfers
- Refunds and credits

### Recurring Subscriptions

Detects repeated payments and shows the monthly and yearly cost.

### Financial Runway

Estimates how many months of runway the user has based on their available balance and spending behaviour.

### AI Summary

Provides a short, human-readable financial insight based on the analysed data.

---

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python / Flask |
| Data Input | CSV bank statement upload |
| Analysis | Transaction parsing and categorisation |
| AI | AI-generated financial summary |
| Visualisation | Charts and dashboard cards |

---

## CSV Format

The app expects a bank statement CSV with transaction information. A simple example format:

```csv
Date,Description,Money In,Money Out,Balance
2026-05-01,Salary,2500.00,,2500.00
2026-05-02,Rent Payment,,750.00,1750.00
2026-05-03,Grocery Store,,54.32,1695.68
2026-05-04,Gym Membership,,29.99,1665.69
```

The exact column names may depend on the implementation, but the core required information is:

- Date
- Description
- Money in / income
- Money out / spending
- Balance

---

## How It Works

1. The user uploads a bank statement CSV.
2. The app reads and processes the transaction data.
3. Transactions are separated into income, spending, transfers, refunds, and subscriptions.
4. Spending is categorised into clear financial categories.
5. The dashboard calculates key metrics.
6. The AI summary turns the data into a clear explanation.
7. The user receives a visual financial report in seconds.

---

## Why I Built This

I built MoneyX-Ray during a hackathon to explore how AI can make personal finance easier to understand.

Bank statements are usually full of useful information, but they are not always easy to interpret. This project aims to make financial data more accessible by turning raw transactions into clear insights, visual breakdowns, and simple explanations.

---

## Future Improvements

Potential future features include:

- Multi-month statement analysis
- Spending trend comparisons
- Smarter subscription detection
- Personalised budgeting recommendations
- Savings goal tracking
- Spending alerts
- Exportable PDF reports
- Support for more bank CSV formats
- User accounts and saved reports
- More advanced AI financial coaching

---

## Demo Summary

MoneyX-Ray turns a raw bank statement into a financial X-ray of your money.

It helps users understand their spending, income, subscriptions, and financial runway without manually analysing spreadsheets.

---

## Status

Hackathon project / prototype.

---

## Disclaimer

MoneyX-Ray is designed for educational and personal finance insight purposes only. It does not provide professional financial advice.
