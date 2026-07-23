'use client';

import { QueryClient } from '@tanstack/react-query';
import {
  cookieStorage,
  createConfig,
  createStorage,
  http,
} from 'wagmi';
import { base } from 'wagmi/chains';
import { baseAccount } from 'wagmi/connectors';
import { coinbaseWallet } from 'wagmi/connectors';
import { injected } from 'wagmi/connectors';
import { Attribution } from 'ox/erc8021';
import type { EIP1193Provider, Hex } from 'viem';

const ATTRIBUTION_DATA_SUFFIX_PLACEHOLDER =
  '[ENCODED_STRING_PLACEHOLDER]' as `0x${string}`;
const BUILDER_CODE = process.env.NEXT_PUBLIC_BUILDER_CODE ?? 'bc_75u6khho';

export function getDataSuffix(): Hex | undefined {
  const value =
    process.env.NEXT_PUBLIC_DATA_SUFFIX ??
    ATTRIBUTION_DATA_SUFFIX_PLACEHOLDER;

  if (/^0x[0-9a-fA-F]+$/.test(value)) return value as Hex;
  if (BUILDER_CODE.startsWith('bc_')) {
    return Attribution.toDataSuffix({ codes: [BUILDER_CODE] }) as Hex;
  }

  return undefined;
}

export const DATA_SUFFIX = getDataSuffix();

export const okxConnector = injected({
  target() {
    return {
      id: 'okx',
      name: 'OKX Wallet',
      provider(windowObject) {
        const typedWindow = windowObject as
          | (Window & {
              okxwallet?: EIP1193Provider & {
                ethereum?: EIP1193Provider;
                isOkxWallet?: true;
                isOKExWallet?: true;
              };
            })
          | undefined;
        const okxWallet = typedWindow?.okxwallet;
        const ethereum = typedWindow?.ethereum;
        const providers = [
          okxWallet?.ethereum,
          okxWallet,
          ...(ethereum?.providers ?? []),
          ethereum,
        ].filter(Boolean) as Array<
          EIP1193Provider & {
            isOkxWallet?: true;
            isOKExWallet?: true;
          }
        >;

        const provider = providers.find(
          (provider) => provider?.isOkxWallet || provider?.isOKExWallet,
        );
        return provider as never;
      },
    };
  },
});

export const metaMaskConnector = injected({ target: 'metaMask' });

export const coinbaseConnector = coinbaseWallet({
  appName: 'BaseMood',
});

export const baseAccountConnector = baseAccount({
  appName: 'BaseMood',
  preference: { options: 'all' },
});

export const config = createConfig({
  chains: [base],
  connectors: [
    okxConnector,
    metaMaskConnector,
    coinbaseConnector,
    baseAccountConnector,
  ],
  dataSuffix: DATA_SUFFIX,
  multiInjectedProviderDiscovery: false,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [base.id]: http(),
  },
});

export const queryClient = new QueryClient();
