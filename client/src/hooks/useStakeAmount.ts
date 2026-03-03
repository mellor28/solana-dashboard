/**
 * useStakeAmount — shared hook for the user's staked SOL balance.
 *
 * Tracks:
 *  - originalStake:   the amount staked at the very beginning (set once, never changes)
 *  - baseStake:       the confirmed balance at last manual sync (what user entered)
 *  - baseEpoch:       the Solana epoch number at the time of last manual sync
 *  - currentStake:    baseStake + estimated rewards earned since baseEpoch (auto-increments each epoch)
 *  - lastSynced:      ISO timestamp of the last manual sync
 *
 * Auto-increment logic:
 *  Solana has ~365.25 epochs/year (each epoch ≈ 2.5 days, 432,000 slots at ~0.4s/slot).
 *  Reward per epoch = baseStake × (APY / epochsPerYear)  [simple, not compound — close enough]
 *  currentStake = baseStake × (1 + APY/epochsPerYear)^epochsElapsed
 *
 * When the user manually syncs their real balance from Marinade, baseStake and baseEpoch
 * are both updated so future auto-increments start from the confirmed real number.
 *
 * All values persist to localStorage across page refreshes.
 *
 * Design: Glassmorphic Space Dashboard
 */

import { useState, useCallback, useEffect } from "react";

const CURRENT_KEY   = "sol_stake_amount";        // baseStake (confirmed balance)
const ORIGINAL_KEY  = "sol_stake_original";       // originalStake (never changes)
const SYNCED_KEY    = "sol_stake_last_synced";    // lastSynced timestamp
const BASE_EPOCH_KEY = "sol_stake_base_epoch";    // epoch number at last sync

const DEFAULT_STAKE = 100.22;
const EPOCHS_PER_YEAR = 365.25 / 2.5; // ≈ 146.1 epochs/year

const HELIUS_KEY = "d34a711e-1e25-489a-8652-2d8709d22b4c";
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;

function loadNum(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = parseFloat(raw);
    return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
  } catch { return fallback; }
}

function saveNum(key: string, val: number) {
  try { localStorage.setItem(key, val.toString()); } catch {}
}

async function fetchCurrentEpoch(): Promise<number> {
  const res = await fetch(HELIUS_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getEpochInfo", params: [] }),
  });
  const data = await res.json();
  return data.result.epoch as number;
}

/** Compound interest over N epochs */
function compoundRewards(base: number, apy: number, epochsElapsed: number): number {
  if (epochsElapsed <= 0) return base;
  const ratePerEpoch = apy / 100 / EPOCHS_PER_YEAR;
  return base * Math.pow(1 + ratePerEpoch, epochsElapsed);
}

export function useStakeAmount(liveApy: number = 6.10) {
  // baseStake = confirmed balance at last manual sync
  const [baseStake, setBaseStakeState] = useState<number>(() =>
    loadNum(CURRENT_KEY, DEFAULT_STAKE)
  );

  // epoch number at last manual sync
  const [baseEpoch, setBaseEpochState] = useState<number>(() =>
    loadNum(BASE_EPOCH_KEY, 0)
  );

  // current live epoch from Helius
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);

  // originalStake — set once, never changes
  const [originalStake] = useState<number>(() => {
    const saved = loadNum(ORIGINAL_KEY, 0);
    if (saved > 0) return saved;
    const current = loadNum(CURRENT_KEY, DEFAULT_STAKE);
    saveNum(ORIGINAL_KEY, current);
    return current;
  });

  const [lastSynced, setLastSyncedState] = useState<Date | null>(() => {
    try {
      const raw = localStorage.getItem(SYNCED_KEY);
      if (!raw) return null;
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    } catch { return null; }
  });

  // Fetch current epoch on mount and every 10 minutes
  useEffect(() => {
    const load = async () => {
      try {
        const epoch = await fetchCurrentEpoch();
        setCurrentEpoch(epoch);
        // If we have no baseEpoch yet, set it to current epoch
        const stored = loadNum(BASE_EPOCH_KEY, 0);
        if (stored === 0 || stored > epoch) {
          saveNum(BASE_EPOCH_KEY, epoch);
          setBaseEpochState(epoch);
        }
      } catch {}
    };
    load();
    const interval = setInterval(load, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-incremented current stake: compounds from baseStake over elapsed epochs
  const epochsElapsed = currentEpoch > 0 && baseEpoch > 0
    ? Math.max(0, currentEpoch - baseEpoch)
    : 0;

  const currentStake = epochsElapsed > 0
    ? compoundRewards(baseStake, liveApy, epochsElapsed)
    : baseStake;

  const rewardsAccumulated = Math.max(0, currentStake - originalStake);
  const epochRewards = currentStake - baseStake; // rewards since last manual sync

  /** Manual sync: user enters their confirmed balance from Marinade */
  const setCurrentStake = useCallback((amount: number) => {
    if (isNaN(amount) || amount <= 0) return;
    saveNum(CURRENT_KEY, amount);
    setBaseStakeState(amount);
    // Record current epoch as the new baseline
    const epoch = currentEpoch > 0 ? currentEpoch : loadNum(BASE_EPOCH_KEY, 0);
    saveNum(BASE_EPOCH_KEY, epoch);
    setBaseEpochState(epoch);
    const now = new Date();
    try { localStorage.setItem(SYNCED_KEY, now.toISOString()); } catch {}
    setLastSyncedState(now);
  }, [currentEpoch]);

  /** Reset original stake (start fresh tracking) */
  const resetOriginalStake = useCallback((amount: number) => {
    if (isNaN(amount) || amount <= 0) return;
    saveNum(ORIGINAL_KEY, amount);
    saveNum(CURRENT_KEY, amount);
    setBaseStakeState(amount);
    const epoch = currentEpoch > 0 ? currentEpoch : loadNum(BASE_EPOCH_KEY, 0);
    saveNum(BASE_EPOCH_KEY, epoch);
    setBaseEpochState(epoch);
    const now = new Date();
    try { localStorage.setItem(SYNCED_KEY, now.toISOString()); } catch {}
    setLastSyncedState(now);
  }, [currentEpoch]);

  return {
    stakeAmount: currentStake,       // alias for backward compat
    currentStake,                    // auto-incremented estimated balance
    baseStake,                       // confirmed balance at last manual sync
    originalStake,                   // original stake (never changes)
    rewardsAccumulated,              // currentStake − originalStake
    epochRewards,                    // rewards since last manual sync
    epochsElapsed,                   // epochs since last manual sync
    currentEpoch,                    // live epoch number
    baseEpoch,                       // epoch at last manual sync
    lastSynced,
    setStakeAmount: setCurrentStake, // alias for backward compat
    setCurrentStake,
    resetOriginalStake,
  };
}
