'use client';

import { QueryClient } from '@tanstack/react-query';
import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { injected } from 'wagmi/connectors';
import type { EIP1193Provider, Hex } from 'viem';

const ATTRIBUTION_DATA_SUFFIX_PLACEHOLDER =
  '[ENCODED_STRING_PLACEHOLDER]' as `0x${string}`;

function getDataSuffix(): Hex | undefined {
  const value =
    process.env.NEXT_PUBLIC_DATA_SUFFIX ??
    ATTRIBUTION_DATA_SUFFIX_PLACEHOLDER;

  return /^0x[0-9a-fA-F]+$/.test(value) ? (value as Hex) : undefined;
}

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
  appChainIds: [base.id],
});

export const config = createConfig({
  chains: [base],
  connectors: [okxConnector, metaMaskConnector, coinbaseConnector],
  dataSuffix: getDataSuffix(),
  multiInjectedProviderDiscovery: false,
  ssr: true,
  transports: {
    [base.id]: http(),
  },
});

export const queryClient = new QueryClient();
