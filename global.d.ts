import type { EIP1193Provider } from 'viem';

declare global {
  interface Window {
    okxwallet?: EIP1193Provider & {
      ethereum?: EIP1193Provider;
      isOkxWallet?: true;
      isOKExWallet?: true;
    };
    ethereum?: EIP1193Provider & {
      isCoinbaseBrowser?: boolean;
      isOkxWallet?: true;
      isOKExWallet?: true;
      selectedAddress?: string;
      providers?: Array<
        EIP1193Provider & {
          isCoinbaseWallet?: true;
          isMetaMask?: true;
          isOkxWallet?: true;
          isOKExWallet?: true;
        }
      >;
    };
  }
}

export {};
