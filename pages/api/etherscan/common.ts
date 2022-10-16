import { ChainId } from "@thirdweb-dev/sdk";

export const apiMap: Record<number, string> = {
  1: "https://api.etherscan.io/api",
  3: "https://api-ropsten.etherscan.io/api",
  4: "https://api-rinkeby.etherscan.io/api",
  5: "https://api-goerli.etherscan.io/api",
  10: "https://api-optimistic.etherscan.io/api",
  25: "https://api.cronoscan.com/api",
  42: "https://api-kovan.etherscan.io/api",
  56: "https://api.bscscan.com/api",
  69: "https://api-kovan-optimistic.etherscan.io/api",
  97: "https://api-testnet.bscscan.com/api",
  128: "https://api.hecoinfo.com/api",
  137: "https://api.polygonscan.com/api",
  199: "https://api.bttcscan.com/api",
  250: "https://api.ftmscan.com/api",
  256: "https://api-testnet.hecoinfo.com/api",
  420: "https://api-goerli-optimistic.etherscan.io/api",
  1029: "https://api-testnet.bttcscan.com/api",
  1284: "https://api-moonbeam.moonscan.io/api",
  1285: "https://api-moonriver.moonscan.io/api",
  1287: "https://api-moonbase.moonscan.io/api",
  4002: "https://api-testnet.ftmscan.com/api",
  42161: "https://api.arbiscan.io/api",
  43113: "https://api-testnet.snowtrace.io/api",
  43114: "https://api.snowtrace.io/api",
  421611: "https://api-testnet.arbiscan.io/api",
  // eslint-disable-next-line line-comment-position
  421613: "https://api-testnet.arbiscan.io/api", // TODO - change to correct endpoint
  80001: "https://api-testnet.polygonscan.com/api",
  1313161554: "https://api.aurorascan.dev/api",
  1313161555: "https://api-testnet.aurorascan.dev/api",
};

export const blockExplorerMap: Record<number, { name: string; url: string }> = {
  1: { name: "Etherscan", url: "https://etherscan.io/" },
  3: { name: "Ropsten Etherscan", url: "https://ropsten.etherscan.io/" },
  4: { name: "Rinkeby Etherscan", url: "https://rinkeby.etherscan.io/" },
  5: { name: "Goerli Etherscan", url: "https://goerli.etherscan.io/" },
  10: {
    name: "Optimism Etherscan",
    url: "https://optimistic.etherscan.io/",
  },
  42: { name: "Kovan Etherscan", url: "https://kovan.etherscan.io/" },
  56: { name: "Bscscan", url: "https://bscscan.com/" },
  69: {
    name: "Optimism Kovan Etherscan",
    url: "https://kovan-optimistic.etherscan.io/",
  },
  420: {
    name: "Optimism Goerli Etherscan",
    url: "https://goerli-optimistic.etherscan.io/",
  },
  97: { name: "Bscscan Testnet", url: "https://testnet.bscscan.com/" },
  137: { name: "Polygonscan", url: "https://polygonscan.com/" },
  250: { name: "FTMScan", url: "https://ftmscan.com/" },
  4002: { name: "FTMScan Testnet", url: "https://testnet.ftmscan.com/" },
  42161: { name: "Arbiscan", url: "https://arbiscan.io/" },
  43113: { name: "Snowtrace Testnet", url: "https://testnet.snowtrace.io/" },
  43114: { name: "Snowtrace", url: "https://snowtrace.io/" },
  421611: { name: "Arbiscan Rinkeby", url: "https://testnet.arbiscan.io/" },
  421613: {
    name: "Arbiscan Goerli",
    url: "https://goerli-rollup-explorer.arbitrum.io/",
  },
  80001: {
    name: "Mumbai Polygonscan",
    url: "https://mumbai.polygonscan.com/",
  },
};

export const apiKeyMap: Record<number, string> = {
  [ChainId.Mainnet]: process.env.ETHERSCAN_KEY as string,
  [ChainId.Goerli]: process.env.ETHERSCAN_KEY as string,
  [ChainId.Polygon]: process.env.POLYGONSCAN_KEY as string,
  [ChainId.Mumbai]: process.env.POLYGONSCAN_KEY as string,
  [ChainId.Fantom]: process.env.FANTOMSCAN_KEY as string,
  [ChainId.FantomTestnet]: process.env.FANTOMSCAN_KEY as string,
  [ChainId.Avalanche]: process.env.SNOWTRACE_KEY as string,
  [ChainId.AvalancheFujiTestnet]: process.env.SNOWTRACE_KEY as string,
  [ChainId.Arbitrum]: process.env.ARBITRUMSCAN_KEY as string,
  [ChainId.ArbitrumGoerli]: process.env.ARBITRUMSCAN_KEY as string,
  [ChainId.Optimism]: process.env.OPTIMISMSCAN_KEY as string,
  [ChainId.OptimismGoerli]: process.env.OPTIMISMSCAN_KEY as string,
  [ChainId.BinanceSmartChainMainnet]: process.env.BSCSCAN_KEY as string,
  [ChainId.BinanceSmartChainTestnet]: process.env.BSCSCAN_KEY as string,
};
