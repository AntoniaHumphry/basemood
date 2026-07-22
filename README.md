# BaseMood

BaseMood is a mobile-first Base Mini App for recording one onchain mood per wallet per UTC day.

## Local Development

```bash
npm install
npm run dev
```

## Required Environment

Copy `.env.example` to `.env.local` and fill in the deployed contract address after deploying `contracts/BaseMood.sol`.

## Contract

The frontend calls `recordMood(uint8 mood, address referrer)` and reads points, daily status, last record time, history count, and recent history directly from the deployed Base mainnet contract.
