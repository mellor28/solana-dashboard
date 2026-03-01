/**
 * useStakeAmount — shared hook for the user's staked SOL balance.
 *
 * Tracks TWO separate values:
 *  - originalStake: the amount staked at the very beginning (set once, never changes)
 *  - currentStake:  the current total balance (updated manually from Marinade dashboard)
 *
 * This distinction allows the dashboard to correctly show:
 *  - Rewards earned to date = currentStake − originalStake
 *  - Future projections compounding from currentStake (the real baseline)
 *
 * Both values persist to localStorage across page refreshes.
 *
 * Design: Glassmorphic Space Dashboard
 */

import { useState, useCallback } from "react";

const CURRENT_KEY = "sol_stake_amount";
const ORIGINAL_KEY = "sol_stake_original";
const DEFAULT_STAKE = 100.22;

function loadValue(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = parseFloat(raw);
    return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function saveValue(key: string, amount: number) {
  try {
    localStorage.setItem(key, amount.toString());
  } catch {}
}

export function useStakeAmount() {
  const [currentStake, setCurrentStakeState] = useState<number>(() =>
    loadValue(CURRENT_KEY, DEFAULT_STAKE)
  );

  // originalStake is set once — if not yet stored, it equals the first currentStake value
  const [originalStake, setOriginalStakeState] = useState<number>(() => {
    const saved = loadValue(ORIGINAL_KEY, 0);
    if (saved > 0) return saved;
    // First time: original = current
    const current = loadValue(CURRENT_KEY, DEFAULT_STAKE);
    saveValue(ORIGINAL_KEY, current);
    return current;
  });

  /** Update the current balance (called when user manually syncs with Marinade) */
  const setCurrentStake = useCallback((amount: number) => {
    if (isNaN(amount) || amount <= 0) return;
    saveValue(CURRENT_KEY, amount);
    setCurrentStakeState(amount);
  }, []);

  /** Reset the original stake (called if user wants to start tracking from scratch) */
  const resetOriginalStake = useCallback((amount: number) => {
    if (isNaN(amount) || amount <= 0) return;
    saveValue(ORIGINAL_KEY, amount);
    setOriginalStakeState(amount);
    saveValue(CURRENT_KEY, amount);
    setCurrentStakeState(amount);
  }, []);

  const rewardsAccumulated = Math.max(0, currentStake - originalStake);

  return {
    stakeAmount: currentStake,       // alias for backward compat
    currentStake,
    originalStake,
    rewardsAccumulated,
    setStakeAmount: setCurrentStake, // alias for backward compat
    setCurrentStake,
    resetOriginalStake,
  };
}
