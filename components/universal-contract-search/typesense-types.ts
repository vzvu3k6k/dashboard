export interface TypesenseResult {
  facet_counts: FacetCount[];
  found: number;
  hits: Hit[];
  out_of: number;
  page: number;
  request_params: RequestParams;
  search_cutoff: boolean;
  search_time_ms: number;
}

export interface FacetCount {
  counts: Facet[];
  field_name: string;
  stats: Stats;
}

export interface Facet {
  count: number;
  highlighted: string;
  value: string;
}

export interface Stats {
  total_values: number;
}

export interface Hit {
  document: SearchDocument;
  highlight: PurpleHighlight;
  highlights: HighlightElement[];
  text_match: number;
  text_match_info: TextMatchInfo;
}

export interface SearchDocument {
  chain_id: string;
  contract_address: string;
  deployer_address: string;
  extensions: string[];
  id: string;
  name: string;
  symbol: string;
  testnet: boolean;
}

export interface PurpleHighlight {
  name: Name;
  symbol?: Name;
}

export interface Name {
  matched_tokens: Q[];
  snippet: string;
}

export enum Q {
  Nft = "nft",
  QNFT = "NFT",
}

export interface HighlightElement {
  field: Field;
  matched_tokens: Q[];
  snippet: string;
}

export enum Field {
  Name = "name",
  Symbol = "symbol",
}

export interface TextMatchInfo {
  best_field_score: string;
  best_field_weight: number;
  fields_matched: number;
  score: string;
  tokens_matched: number;
}

export interface RequestParams {
  collection_name: string;
  per_page: number;
  q: Q;
}
