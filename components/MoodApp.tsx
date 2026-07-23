'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Brain,
  CheckCircle2,
  Copy,
  Flame,
  Frown,
  History,
  Loader2,
  Moon,
  SmilePlus,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react';
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useSendCalls,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { base } from 'wagmi/chains';
import {
  concatHex,
  encodeFunctionData,
  getAddress,
  isAddress,
  zeroAddress,
  type Address,
} from 'viem';
import { baseMoodAbi } from '@/lib/abi';
import {
  CONTRACT_ADDRESS,
  IS_CONTRACT_CONFIGURED,
  POINTS_PER_RECORD,
  REFERRAL_POINTS,
} from '@/lib/contract';
import { DATA_SUFFIX } from '@/lib/wagmi';
import { WalletConnect } from '@/components/WalletConnect';

const moods = [
  { id: 0, label: 'Happy', color: '#ffd166', icon: SmilePlus },
  { id: 1, label: 'Calm', color: '#7bdcb5', icon: Moon },
  { id: 2, label: 'Focused', color: '#8ecae6', icon: Brain },
  { id: 3, label: 'Tired', color: '#c7c9d1', icon: Frown },
  { id: 4, label: 'Stressed', color: '#ff8fab', icon: Activity },
  { id: 5, label: 'Excited', color: '#ffb085', icon: Zap },
] as const;

type MoodId = (typeof moods)[number]['id'];
type MoodEntry = readonly [number, bigint, bigint, bigint];

function formatDate(timestamp?: bigint) {
  if (!timestamp || timestamp === 0n) return 'No record yet';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(Number(timestamp) * 1000);
}

function getReferrer(address?: Address): Address {
  if (typeof window === 'undefined') return zeroAddress;
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (!ref || !isAddress(ref)) return zeroAddress;
  const normalized = getAddress(ref);
  if (address && normalized.toLowerCase() === address.toLowerCase()) {
    return zeroAddress;
  }
  return normalized;
}

export function MoodApp() {
  const [selectedMood, setSelectedMood] = useState<MoodId>(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [showReward, setShowReward] = useState(false);
  const { address, chainId, isConnected } = useAccount();
  const {
    mutateAsync: sendTransaction,
    data: hash,
    isPending: isAwaitingSignature,
    reset,
  } = useSendTransaction();
  const {
    mutateAsync: sendCalls,
    isPending: isAwaitingCalls,
  } = useSendCalls();

  const readsEnabled =
    isConnected && Boolean(address) && IS_CONTRACT_CONFIGURED;

  const commonContract = {
    address: CONTRACT_ADDRESS,
    abi: baseMoodAbi,
    chainId: base.id,
  } as const;

  const { data: totalPoints, refetch: refetchPoints } = useReadContract({
    ...commonContract,
    functionName: 'getTotalPoints',
    args: address ? [address] : undefined,
    query: { enabled: readsEnabled },
  });

  const { data: lastRecordedAt, refetch: refetchLastRecordedAt } =
    useReadContract({
      ...commonContract,
      functionName: 'getLastRecordedAt',
      args: address ? [address] : undefined,
      query: { enabled: readsEnabled },
    });

  const { data: hasRecordedToday, refetch: refetchHasRecordedToday } =
    useReadContract({
      ...commonContract,
      functionName: 'hasRecordedToday',
      args: address ? [address] : undefined,
      query: { enabled: readsEnabled },
    });

  const { data: historyCount, refetch: refetchHistoryCount } = useReadContract({
    ...commonContract,
    functionName: 'getHistoryCount',
    args: address ? [address] : undefined,
    query: { enabled: readsEnabled },
  });

  const historyIndexes = useMemo(() => {
    const count = Number(historyCount ?? 0n);
    return Array.from({ length: Math.min(count, 5) }, (_, offset) =>
      BigInt(count - offset - 1),
    );
  }, [historyCount]);

  const { data: historyData, refetch: refetchHistory } = useReadContracts({
    contracts:
      address && historyIndexes.length
        ? historyIndexes.map((index) => ({
            ...commonContract,
            functionName: 'getMoodEntry',
            args: [address, index],
          }))
        : [],
    query: { enabled: readsEnabled && historyIndexes.length > 0 },
  });

  const refreshMoodState = useCallback(async () => {
    await Promise.all([
      refetchPoints(),
      refetchLastRecordedAt(),
      refetchHasRecordedToday(),
      refetchHistoryCount(),
      refetchHistory(),
    ]);
  }, [
    refetchHasRecordedToday,
    refetchHistory,
    refetchHistoryCount,
    refetchLastRecordedAt,
    refetchPoints,
  ]);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
    hash,
    chainId: base.id,
    query: {
      enabled: Boolean(hash),
    },
  });

  const referralLink =
    typeof window !== 'undefined' && address
      ? `${window.location.origin}${window.location.pathname}?ref=${address}`
      : 'Connect wallet to create your referral link';

  const connectedToBase = isConnected && chainId === base.id;
  const isBusy = isAwaitingSignature || isAwaitingCalls || isConfirming;
  const canRecord =
    connectedToBase &&
    IS_CONTRACT_CONFIGURED &&
    hasRecordedToday === false &&
    !isBusy;

  const recordButtonLabel = (() => {
    if (isBusy) return 'Confirming Mood';
    if (!isConnected) return 'Connect Wallet First';
    if (!IS_CONTRACT_CONFIGURED) return 'Contract Not Configured';
    if (!connectedToBase) return 'Switch to Base First';
    if (hasRecordedToday) return 'Mood Recorded Today';
    return "Record Today's Mood";
  })();

  async function handleRecordMood() {
    if (!address) {
      setStatusMessage('Connect a wallet before recording your mood.');
      return;
    }
    if (!IS_CONTRACT_CONFIGURED) {
      setStatusMessage('Contract address is not configured yet.');
      return;
    }
    if (chainId !== base.id) {
      setStatusMessage('Switch to Base mainnet before recording.');
      return;
    }

    setShowReward(false);
    setStatusMessage('Waiting for wallet signature...');
    reset();

    try {
      const referrer = getReferrer(address);
      const callData = encodeFunctionData({
        abi: baseMoodAbi,
        functionName: 'recordMood',
        args: [selectedMood, referrer],
      });

      try {
        await sendCalls({
          account: address,
          calls: [
            {
              to: CONTRACT_ADDRESS,
              data: callData,
              dataSuffix: DATA_SUFFIX || undefined,
            },
          ],
          capabilities: DATA_SUFFIX
            ? { dataSuffix: { value: DATA_SUFFIX, optional: true } }
            : undefined,
          chainId: base.id,
          experimental_fallback: true,
        });
        setStatusMessage('Mood call sent. Waiting for wallet confirmation.');
        return;
      } catch {
        setStatusMessage('Preparing a standard wallet transaction...');
      }

      const txHash = await sendTransaction({
        account: address,
        chainId: base.id,
        data: DATA_SUFFIX ? concatHex([callData, DATA_SUFFIX]) : callData,
        to: CONTRACT_ADDRESS,
      });
      setStatusMessage(`Transaction sent: ${txHash.slice(0, 10)}...`);
    } catch {
      setStatusMessage('Transaction was not completed. Please try again.');
    }
  }

  async function copyReferralLink() {
    if (!address) return;
    await navigator.clipboard.writeText(referralLink);
    setStatusMessage('Referral link copied.');
  }

  useEffect(() => {
    if (!isConfirmed) return;
    queueMicrotask(() => {
      setShowReward(true);
      setStatusMessage('Mood recorded on Base. Your dashboard is refreshing.');
      refreshMoodState().catch(() =>
        setStatusMessage('Mood recorded, but refresh failed. Reload to update.'),
      );
    });
  }, [isConfirmed, refreshMoodState]);

  const history = ((historyData ?? []) as Array<{ result?: unknown; status: string }>)
    .map((item) => (item.status === 'success' ? item.result : undefined))
    .filter(
      (entry): entry is MoodEntry =>
        Array.isArray(entry) &&
        entry.length === 4 &&
        typeof entry[0] === 'number' &&
        typeof entry[1] === 'bigint' &&
        typeof entry[2] === 'bigint' &&
        typeof entry[3] === 'bigint',
    );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={22} aria-hidden="true" />
          </div>
          <div>
            <h1>BaseMood</h1>
            <p>One mood, one day, on Base.</p>
          </div>
        </div>
        <WalletConnect />
      </header>

      <section className="dashboard">
        <div className="hero-panel">
          <section className="panel">
            <div className="section-title">
              <div>
                <h2>Today&apos;s mood</h2>
                <p>Choose the state you want to keep onchain.</p>
              </div>
              <span className={`pill ${hasRecordedToday ? 'ok' : ''}`}>
                {hasRecordedToday ? (
                  <CheckCircle2 size={15} aria-hidden="true" />
                ) : (
                  <Sun size={15} aria-hidden="true" />
                )}
                {hasRecordedToday ? 'Recorded today' : 'Open today'}
              </span>
            </div>

            <div className="mood-grid">
              {moods.map((mood) => {
                const Icon = mood.icon;
                return (
                  <button
                    className={`mood-button ${
                      selectedMood === mood.id ? 'selected' : ''
                    }`}
                    key={mood.id}
                    style={
                      {
                        '--mood-color': mood.color,
                      } as React.CSSProperties
                    }
                    type="button"
                    disabled={hasRecordedToday === true}
                    onClick={() => setSelectedMood(mood.id)}
                  >
                    <span className="mood-icon">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <span className="mood-label">{mood.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="status-row">
              <button
                className="primary-action"
                type="button"
                disabled={!canRecord}
                onClick={handleRecordMood}
              >
                {isBusy ? (
                  <Loader2 className="spin" size={18} aria-hidden="true" />
                ) : (
                  <Sparkles size={18} aria-hidden="true" />
                )}
                {recordButtonLabel}
              </button>
              <div className="reward">
                {showReward ? `+${POINTS_PER_RECORD} points` : ''}
              </div>
              <div className="message">{statusMessage || nextActionText()}</div>
            </div>
          </section>

          <section className="panel">
            <div className="section-title">
              <div>
                <h2>Points record</h2>
                <p>Daily records earn {POINTS_PER_RECORD} points.</p>
              </div>
            </div>
            <div className="stat-grid">
              <div className="stat">
                <span>Total points</span>
                <strong>{totalPoints?.toString() ?? '0'}</strong>
              </div>
              <div className="stat">
                <span>Mood count</span>
                <strong>{historyCount?.toString() ?? '0'}</strong>
              </div>
              <div className="stat">
                <span>Last record</span>
                <strong>{formatDate(lastRecordedAt)}</strong>
              </div>
            </div>
          </section>
        </div>

        <aside className="hero-panel">
          <section className="panel">
            <div className="section-title">
              <div>
                <h2>Referral link</h2>
                <p>Referrers earn {REFERRAL_POINTS} points on first record.</p>
              </div>
            </div>
            <div className="referral-row">
              <div className="referral-actions">
                <input
                  className="referral-link"
                  readOnly
                  value={referralLink}
                  aria-label="Referral link"
                />
                <button
                  className="small-button"
                  type="button"
                  disabled={!address}
                  onClick={copyReferralLink}
                  aria-label="Copy referral link"
                  title="Copy referral link"
                >
                  <Copy size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-title">
              <div>
                <h2>Recent history</h2>
                <p>Your latest onchain mood entries.</p>
              </div>
              <History size={18} aria-hidden="true" />
            </div>
            <div className="history-list">
              {history.length ? (
                history.map((entry, index) => {
                  const [moodId, timestamp, dayId, pointsEarned] = entry;
                  const mood = moods[Number(moodId)] ?? moods[0];
                  const Icon = mood.icon;
                  return (
                    <div className="history-item" key={`${dayId}-${index}`}>
                      <span
                        className="mood-icon"
                        style={
                          {
                            '--mood-color': mood.color,
                          } as React.CSSProperties
                        }
                      >
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <div>
                        <strong>{mood.label}</strong>
                        <span>
                          Day {dayId.toString()} / {formatDate(timestamp)}
                        </span>
                      </div>
                      <div className="history-points">
                        +{pointsEarned.toString()}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">
                  <div>
                    <Flame size={22} aria-hidden="true" />
                    <div>No mood records yet.</div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );

  function nextActionText() {
    if (!isConnected) return 'Connect a wallet to start your mood record.';
    if (!IS_CONTRACT_CONFIGURED) {
      return 'Deploy BaseMood and set NEXT_PUBLIC_CONTRACT_ADDRESS.';
    }
    if (!connectedToBase) return 'Switch to Base mainnet before recording.';
    if (hasRecordedToday) return 'You can record again after the next UTC day.';
    if (isConfirming) return 'Waiting for Base confirmation...';
    return 'Ready to record. Gas is the only cost.';
  }
}
