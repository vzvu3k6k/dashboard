import { FacetFilter } from "./facet-filter";
import { SearchDocument, TypesenseResult } from "./typesense-types";
import {
  Box,
  ButtonGroup,
  Divider,
  Flex,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  LinkBox,
  LinkOverlay,
  Modal,
  ModalContent,
  ModalOverlay,
  Spinner,
} from "@chakra-ui/react";
import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChainIcon } from "components/icons/ChainIcon";
import { useTrack } from "hooks/analytics/useTrack";
import { useAllChainsData } from "hooks/chains/allChains";
import { useDebounce } from "hooks/common/useDebounce";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiArrowRight, FiSearch, FiX } from "react-icons/fi";
import invariant from "tiny-invariant";
import { Button, Card, Heading, Link, Text } from "tw-components";
import { shortenIfAddress } from "utils/usedapp-external";

const TRACKING_CATEGORY = "any_contract_search";

const typesenseApiKey =
  process.env.NEXT_PUBLIC_TYPESENSE_CONTRACT_API_KEY || "";

const getSearchQuery = ({
  query,
  walletAddress = "",
  searchMode = "all",
  page = 1,
  perPage = 10,
}: {
  query: string;
  walletAddress?: string;
  searchMode: SearchMode;
  page?: number;
  perPage?: number;
}) => {
  const baseUrl = new URL(
    "https://search.thirdweb.com/collections/contracts/documents/search",
  );
  baseUrl.searchParams.set("q", query);
  baseUrl.searchParams.set(
    "query_by",
    "name,symbol,contract_address,deployer_address",
  );
  baseUrl.searchParams.set("query_by_weights", "3,3,2,1");
  baseUrl.searchParams.set("page", page.toString());
  baseUrl.searchParams.set("per_page", perPage.toString());
  baseUrl.searchParams.set("exhaustive_search", "true");
  baseUrl.searchParams.set(
    "sort_by",
    `testnet:asc${
      walletAddress ? `,_eval(deployer_address:${walletAddress}):desc` : ""
    }`,
  );
  baseUrl.searchParams.set("facet_by", "chain_id, extensions");
  baseUrl.searchParams.set("max_facet_values", "100");

  if (searchMode === "mainnet") {
    baseUrl.searchParams.set("filter_by", "testnet:false");
  } else if (searchMode === "testnet") {
    baseUrl.searchParams.set("filter_by", "testnet:true");
  }
  return baseUrl.toString();
};

function contractTypesenseSearchQuery(
  searchQuery: string,
  walletAddress = "",
  searchMode: SearchMode,
  queryClient: QueryClient,
  trackEvent: ReturnType<typeof useTrack>,
) {
  return {
    queryKey: [
      "typesense-contract-search",
      { search: searchQuery, searchMode, walletAddress },
    ],
    queryFn: async () => {
      invariant(typesenseApiKey, "No typesense api key");
      invariant(queryClient, "No query client");
      invariant(searchQuery, "No search query");
      trackEvent({
        category: TRACKING_CATEGORY,
        action: "query",
        label: "attempt",
        searchQuery,
      });

      const res = await fetch(
        getSearchQuery({
          query: searchQuery,
          walletAddress,
          searchMode,
        }),
        {
          headers: {
            "x-typesense-api-key": typesenseApiKey,
          },
        },
      );
      return (await res.json()) as TypesenseResult;
    },
    enabled: !!searchQuery && !!queryClient && !!typesenseApiKey,
    onSuccess: (d: unknown) => {
      trackEvent({
        category: TRACKING_CATEGORY,
        action: "query",
        label: "success",
        searchQuery,
        response: d,
      });
    },
    onError: (err: unknown) => {
      trackEvent({
        category: TRACKING_CATEGORY,
        action: "query",
        label: "failure",
        searchQuery,
        error: err,
      });
    },
    keepPreviousData: true,
  };
}
type SearchMode = "all" | "mainnet" | "testnet";

type UniversalContractSearchProps = {
  walletAddress?: string;
  enabkeCmdK?: boolean;
};

export const UniversalContractSearch: React.FC<
  UniversalContractSearchProps
> = ({ walletAddress, enabkeCmdK }) => {
  const [open, setOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("mainnet");
  const trackEvent = useTrack();
  const queryClient = useQueryClient();

  useEffect(() => {
    // only enable cmd+k if that's a wanted behavior
    if (!enabkeCmdK) {
      return;
    }
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && e.metaKey) {
        setOpen((open_) => !open_);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [enabkeCmdK]);

  const [searchValue, setSearchValue] = useState("");
  // debounce 500ms
  const debouncedSearchValue = useDebounce(searchValue, 500);

  const [facetStates, setFacetStates] = useState<Record<string, string[]>>({});

  const typesenseSearchQuery = useQuery<TypesenseResult>(
    contractTypesenseSearchQuery(
      debouncedSearchValue,
      walletAddress,
      searchMode,
      queryClient,
      trackEvent,
    ),
  );

  const [activeIndex, setActiveIndex] = useState(0);

  const router = useRouter();

  const handleClose = useCallback(() => {
    setOpen(false);
    setSearchValue("");
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    // re-set the active index if we are fetching
    if (typesenseSearchQuery.isFetching) {
      setActiveIndex(0);
    }
  }, [typesenseSearchQuery.isFetching]);

  const documents = useMemo(
    () => typesenseSearchQuery.data?.hits.map((h) => h.document) || [],
    [typesenseSearchQuery.data?.hits],
  );

  useEffect(() => {
    // only if the modal is open
    if (!open) {
      return;
    }
    const down = (e: KeyboardEvent) => {
      // if something is selected and we press enter or space we should go to the contract
      if (e.key === "Enter" && documents) {
        const result = documents[activeIndex];
        if (result) {
          e.preventDefault();
          router.push(`/${result.chain_id}/${result.contract_address}`);
          trackEvent({
            category: TRACKING_CATEGORY,
            action: "select_contract",
            input_mode: "keyboard",
            chainId: result.chain_id,
            contract_address: result.contract_address,
          });
          handleClose();
        }
      } else if (e.key === "ArrowDown") {
        // if we press down we should move the selection down
        e.preventDefault();
        setActiveIndex((aIndex) => {
          if (documents) {
            return Math.min(aIndex + 1, documents.length - 1);
          }
          return aIndex;
        });
      } else if (e.key === "ArrowUp") {
        // if we press up we should move the selection up
        e.preventDefault();
        setActiveIndex((aIndex) => Math.max(aIndex - 1, 0));
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [activeIndex, documents, handleClose, open, router, trackEvent]);

  return (
    <>
      <InputGroup
        display={{ base: "none", lg: "block" }}
        minW="300px"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Input
          borderRadius="md"
          fontSize="var(--tw-font-size-body-md)"
          borderColor="borderColor"
          placeholder="Search any contract"
        />
        {enabkeCmdK && (
          <InputRightElement w="auto" pr={2} as={Flex} gap={1}>
            <Text size="body.sm" color="chakra-placeholder-color">
              ⌘K
            </Text>
          </InputRightElement>
        )}
      </InputGroup>
      <IconButton
        aria-label="Search any contract"
        variant="ghost"
        display={{ base: "inherit", lg: "none" }}
        icon={<Icon as={FiSearch} />}
        onClick={() => setOpen(true)}
      />

      {/* modal below here */}
      <Modal size="lg" isOpen={open} onClose={handleClose}>
        <ModalOverlay />
        <Card bg="backgroundCard" as={ModalContent} p={0}>
          <InputGroup size="lg">
            <InputLeftElement>
              <Icon as={FiSearch} />
            </InputLeftElement>
            <Input
              bg="transparent!important"
              autoFocus
              border="none"
              borderRadius="none"
              placeholder="Search any contract"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <InputRightElement>
              {typesenseSearchQuery.isFetching ? (
                <Spinner size="sm" />
              ) : searchValue.length > 0 ? (
                <IconButton
                  size="sm"
                  aria-label="Clear search"
                  variant="ghost"
                  icon={<Icon as={FiX} />}
                  onClick={() => setSearchValue("")}
                />
              ) : null}
            </InputRightElement>
          </InputGroup>

          {searchValue.length > 0 &&
          (!typesenseSearchQuery.isFetching || documents?.length) ? (
            <Flex px={2} direction="column">
              <Divider borderColor="borderColor" />

              <Flex my={2} gap={2}>
                {typesenseSearchQuery.data?.facet_counts.map((facetCount) => {
                  return (
                    <FacetFilter
                      key={facetCount.field_name}
                      name={facetCount.field_name}
                      facetGroups={[
                        {
                          title: "Network Types",
                          allOnly: true,
                          values: facetCount.counts.map((c) => ({
                            value: [c.value],
                          })),
                        },
                        {
                          title: "Networks",
                          allOnly: false,
                          values: facetCount.counts.map((c) => ({
                            value: [c.value],
                          })),
                        },
                      ]}
                      selectedValues={
                        facetStates[facetCount.field_name] ||
                        facetCount.counts.map((c) => c.value)
                      }
                      onChange={(values) => {
                        setFacetStates((s) => ({
                          ...s,
                          [facetCount.field_name]: values,
                        }));
                      }}
                    />
                  );
                })}
              </Flex>

              {/* <ButtonGroup size="xs" my={2}>
                <Button
                  variant={searchMode === "all" ? "solid" : "ghost"}
                  onClick={() => {
                    setSearchMode("all");
                  }}
                >
                  All
                </Button>
                <Button
                  variant={searchMode === "mainnet" ? "solid" : "ghost"}
                  onClick={() => {
                    setSearchMode("mainnet");
                  }}
                >
                  Mainnet
                </Button>
                <Button
                  variant={searchMode === "testnet" ? "solid" : "ghost"}
                  onClick={() => {
                    setSearchMode("testnet");
                  }}
                >
                  Testnet
                </Button>
              </ButtonGroup> */}

              <Flex py={2}>
                {typesenseSearchQuery.error ? (
                  <Text
                    p={3}
                    color="red.400"
                    _light={{ color: "red.600" }}
                    size="label.md"
                  >
                    {(typesenseSearchQuery.error as Error).message}
                  </Text>
                ) : !documents || documents?.length === 0 ? (
                  <Text p={3} size="label.md">
                    No contracts found.
                  </Text>
                ) : (
                  <Flex direction="column" w="full">
                    {documents.map((result, idx) => {
                      return (
                        <SearchResult
                          key={`${result.chain_id}_${result.contract_address}`}
                          result={result}
                          isActive={idx === activeIndex}
                          onClick={() => {
                            handleClose();
                            trackEvent({
                              category: TRACKING_CATEGORY,
                              action: "select_contract",
                              input_mode: "click",
                              chainId: result.chain_id,
                              contract_address: result.contract_address,
                            });
                          }}
                          onMouseEnter={() => setActiveIndex(idx)}
                        />
                      );
                    })}
                  </Flex>
                )}
              </Flex>
            </Flex>
          ) : null}
        </Card>
      </Modal>
    </>
  );
};

interface SearchResultProps {
  result: SearchDocument;
  isActive: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}

const SearchResult: React.FC<SearchResultProps> = ({
  result,
  isActive,
  onMouseEnter,
  onClick,
}) => {
  const { chainIdToChainRecord } = useAllChainsData();

  const chain = chainIdToChainRecord[parseInt(result.chain_id)];

  // not able to resolve chain...
  if (!chain) {
    return null;
  }
  return (
    <Flex
      as={LinkBox}
      gap={4}
      align="center"
      _dark={{
        bg: isActive ? "rgba(255,255,255,.05)" : "transparent",
      }}
      _light={{
        bg: isActive ? "rgba(0,0,0,.05)" : "transparent",
      }}
      borderRadius="md"
      w="100%"
      p={3}
    >
      <Box flexShrink={0}>
        <ChainIcon size={24} ipfsSrc={chain?.icon?.url} />
      </Box>
      <Flex direction="column">
        <LinkOverlay
          textDecor="none!important"
          as={Link}
          href={`/${chain.slug}/${result.contract_address}`}
          onMouseEnter={onMouseEnter}
          onClick={onClick}
          size="label.xl"
        >
          <Heading as="h3" size="label.lg">
            {shortenIfAddress(result.name)}
          </Heading>
        </LinkOverlay>
        <Heading pointerEvents="none" as="h4" opacity={0.6} size="subtitle.xs">
          {chain.name} - {shortenIfAddress(result.contract_address)}
        </Heading>
      </Flex>
      <Flex ml="auto" align="center" gap={3} flexShrink={0}>
        <Icon as={FiArrowRight} />
      </Flex>
    </Flex>
  );
};
