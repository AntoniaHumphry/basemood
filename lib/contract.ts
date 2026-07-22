import type { Address } from 'viem';
import { zeroAddress } from 'viem';

export const BASE_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? '8453',
) as 8453;

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  zeroAddress) as Address;

export const IS_CONTRACT_CONFIGURED = CONTRACT_ADDRESS !== zeroAddress;

export const POINTS_PER_RECORD = 10;
export const REFERRAL_POINTS = 3;
