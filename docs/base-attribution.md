# Base Attribution

Offchain attribution is hardcoded in `app/layout.tsx` with the Base App ID meta tag.

Onchain attribution is configured in `lib/wagmi.ts` through viem's `dataSuffix` support. Set `NEXT_PUBLIC_BUILDER_CODE` to the `bc_...` Builder Code, or set `NEXT_PUBLIC_DATA_SUFFIX` to the Encoded String from base.dev.
