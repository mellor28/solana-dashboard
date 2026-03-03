/**
 * useJupBalance — shared hook for the user's staked JUP balance and live price.
 * Persists to localStorage. Used by both JupiterWidget and PortfolioNetWorth.
 * Design: Glassmorphic Space Dashboard
 */

import { useState, useEffect } from "react";

const DEFAULT_JUP = 2636.29;
const LS_KEY_AMOUNT = "jup_staked_amount";

function loadAmount(): number {
  try {
    const v = localStorage.getItem(LS_KEY_AMOUNT);
    if (v) {
      const n = parseFloat(v);
      if (!isNaN(n) && n > 0) return n;
    }
  } catch {}
  return DEFAULT_JUP;
}

export function useJupBalance() {
  const [jupAmount, setJupAmount] = useState<number>(loadAmount);
  const [jupPrice, setJupPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=JUPUSDT");
        const data = await res.json();
        const price = parseFloat(data.lastPrice);
        if (!isNaN(price) && price > 0) {
          setJupPrice(price);
          setLoading(false);
          return;
        }
      } catch {}
      try {
        const res2 = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=jupiter-exchange-solana&vs_currencies=usd"
        );
        const d2 = await res2.json();
        const price = d2["jupiter-exchange-solana"]?.usd;
        if (price) setJupPrice(price);
      } catch {}
      setLoading(false);
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for localStorage changes (when JupiterWidget updates the amount)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === LS_KEY_AMOUNT && e.newValue) {
        const n = parseFloat(e.newValue);
        if (!isNaN(n) && n > 0) setJupAmount(n);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return { jupAmount, jupPrice, loading };
}
