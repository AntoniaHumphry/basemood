'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, LogOut, Wallet } from 'lucide-react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from 'wagmi';
import { base } from 'wagmi/chains';
import {
  baseAccountConnector,
  coinbaseConnector,
  metaMaskConnector,
  okxConnector,
} from '@/lib/wagmi';

const walletOptions = [
  { label: 'OKX Wallet', connector: okxConnector },
  { label: 'MetaMask', connector: metaMaskConnector },
  { label: 'Coinbase Wallet', connector: coinbaseConnector },
  { label: 'Base Account', connector: baseAccountConnector },
] as const;

function shortenAddress(address?: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnect() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const { address, chainId, isConnected } = useAccount();
  const { connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== base.id;
  const status = useMemo(() => {
    if (!isConnected) return 'Not connected';
    if (isWrongNetwork) return 'Wrong network';
    return 'Base mainnet';
  }, [isConnected, isWrongNetwork]);

  useEffect(() => {
    const ethereum = window.ethereum as
      | { isCoinbaseBrowser?: boolean; selectedAddress?: string }
      | undefined;

    if (!isConnected && ethereum?.isCoinbaseBrowser && ethereum.selectedAddress) {
      connectAsync({ connector: coinbaseConnector }).catch(() => undefined);
    }
  }, [connectAsync, isConnected]);

  async function handleConnect(
    connector: (typeof walletOptions)[number]['connector'],
    label: string,
  ) {
    setMessage('');
    try {
      await connectAsync({ connector });
      setOpen(false);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : `Could not connect ${label}.`,
      );
    }
  }

  async function handleSwitchNetwork() {
    setMessage('');
    try {
      await switchChainAsync({ chainId: base.id });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not switch to Base mainnet.',
      );
    }
  }

  if (isConnected) {
    return (
      <div className="wallet-card">
        <div className={`pill ${isWrongNetwork ? 'warn' : 'ok'}`}>
          <CheckCircle2 size={16} aria-hidden="true" />
          {status}
        </div>
        <div className="wallet-address">{shortenAddress(address)}</div>
        {isWrongNetwork ? (
          <button
            className="small-button"
            type="button"
            onClick={handleSwitchNetwork}
            disabled={isSwitching}
          >
            Switch to Base
          </button>
        ) : null}
        <button
          className="small-button"
          type="button"
          onClick={() => disconnect()}
        >
          <LogOut size={16} aria-hidden="true" />
          Disconnect
        </button>
        {message ? <div className="message error">{message}</div> : null}
      </div>
    );
  }

  return (
    <div className="wallet-zone">
      <button
        className="wallet-trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <Wallet size={17} aria-hidden="true" />
        Connect Wallet
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div className="wallet-menu">
          {walletOptions.map((option) => (
            <button
              className="wallet-option"
              key={option.label}
              type="button"
              disabled={isPending}
              onClick={() => handleConnect(option.connector, option.label)}
            >
              <Wallet size={17} aria-hidden="true" />
              {option.label}
            </button>
          ))}
          {message ? <div className="message error">{message}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
