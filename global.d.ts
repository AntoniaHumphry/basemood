import type { EIP1193Provider } from 'viem';

declare global {
  interface Window {
    ethereum?: EIP1193Provider & {
      isCoinbaseBrowser?: boolean;
      isOkxWallet?: boolean;
      isOKExWallet?: boolean;
      selectedAddress?: string;
      providers?: Array<
        EIP1193Provider & {
          isOkxWallet?: boolean;
          isOKExWallet?: boolean;
        }
      >;
    };
  }
}

export {};
