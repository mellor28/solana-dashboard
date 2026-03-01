/**
 * useStakeAmount — shared hook for the user's current staked SOL balance.
 *
 * Persists to localStorage so it survives page refreshes.
 * Both StakingTracker and StakeSinceTracker read from this single source of truth.
 * The user updates it manually to match their real Marinade balance.
 *
 * Design: Glassmorphic Space Dashboard
 */

import { useState, useCallback } from "react";

const STORAGE_KEY = "sol_stake_amount";
const DEFAULT_STAKE = 100.22;

function loadStake(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_STAKE;
    const parsed = parseFloat(raw);
    return isNaN(parsed) || parsed <= 0 ? DEFAULT_STAKE : parsed;
  } catch {
    return DEFAULT_STAKE;
  }
}

function saveStake(amount: number) {
  try {
    localStorage.setItem(STORAGE_KEY, amount.toString());
  } catch {}
}

export function useStakeAmount() {
  const [stakeAmount, setStakeAmountState] = useState<number>(() => loadStake());

  const setStakeAmount = useCallback((amount: number) => {
    if (isNaN(amount) || amount <= 0) return;
    saveStake(amount);
    setStakeAmountState(amount);
  }, []);

  return { stakeAmount, setStakeAmount };
}
