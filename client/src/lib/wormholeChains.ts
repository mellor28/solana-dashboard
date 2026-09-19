/**
 * Official Wormhole chain IDs (not EVM chain IDs).
 * Source: wormhole-sdk-ts core/base/src/constants/chains.ts
 *
 * Solana is 1. Near is 15.
 */

const WORMHOLE_CHAIN_NAMES: Record<number, string> = {
  1: "Solana",
  2: "Ethereum",
  4: "BNB Chain",
  5: "Polygon",
  6: "Avalanche",
  8: "Algorand",
  13: "Kaia",
  14: "Celo",
  15: "Near",
  16: "Moonbeam",
  19: "Injective",
  20: "Osmosis",
  21: "Sui",
  22: "Aptos",
  23: "Arbitrum",
  24: "Optimism",
  26: "Pythnet",
  29: "Bitcoin",
  30: "Base",
  32: "Sei",
  34: "Scroll",
  35: "Mantle",
  38: "Linea",
  39: "Berachain",
  40: "Sei EVM",
  44: "Unichain",
  45: "World Chain",
  46: "Ink",
  47: "HyperEVM",
  48: "Monad",
  50: "Mezo",
  51: "Fogo",
  52: "Sonic",
  53: "Converge",
  55: "Plume",
  57: "XRPL EVM",
  58: "Plasma",
  59: "Creditcoin",
  60: "Stacks",
  63: "Moca",
  64: "MegaETH",
  66: "XRPL",
  67: "0G",
  68: "Tempo",
  69: "Nexus",
  71: "Arc",
  72: "Robinhood",
  73: "Hydration",
  3104: "Wormchain",
  4000: "Cosmos Hub",
  4001: "Evmos",
  4002: "Kujira",
  4003: "Neutron",
  4004: "Celestia",
  4005: "Stargaze",
  4006: "Seda",
  4007: "Dymension",
  4008: "Provenance",
  4009: "Noble",
  65000: "HyperCore",
};

export const WORMHOLE_SOLANA_CHAIN_ID = 1;

export function wormholeChainName(id: number): string {
  return WORMHOLE_CHAIN_NAMES[id] ?? `Chain ${id}`;
}
