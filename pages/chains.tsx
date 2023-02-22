import {
  Flex,
  GridItem,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  LinkBox,
  LinkOverlay,
  SimpleGrid,
  Spinner,
  Tooltip,
} from "@chakra-ui/react";
import { Chain, allChains } from "@thirdweb-dev/chains";
import {
  ChainId,
  useAddress,
  useConnect,
  useNetwork,
  useSigner,
} from "@thirdweb-dev/react";
import { ClientOnly } from "components/ClientOnly/ClientOnly";
import { AppLayout } from "components/app-layouts/app";
import { ChainIcon } from "components/icons/ChainIcon";
import Fuse from "fuse.js";
import { useConfiguredChainsRecord } from "hooks/chains/configureChains";
import { GetStaticProps, InferGetStaticPropsType } from "next";
import { NextSeo } from "next-seo";
import { PageId } from "page-id";
import { memo, useDeferredValue, useMemo, useState } from "react";
import { FiArrowUpRight, FiPlusCircle, FiSearch } from "react-icons/fi";
import {
  Card,
  Heading,
  Text,
  TrackedCopyButton,
  TrackedIconButton,
  TrackedLink,
} from "tw-components";
import { ThirdwebNextPage } from "utils/types";
import { useProvider } from "wagmi";

const TRACKING_CATEGORY = "chains";

export const ChainsLanding: ThirdwebNextPage = (
  props: InferGetStaticPropsType<typeof getStaticProps>,
) => {
  const configuredChainsRecord = useConfiguredChainsRecord();

  const chainsWithDashboardStatus: MinimalRPCChainWithDashboardStatus[] =
    useMemo(() => {
      return props.chains.map((c) => ({
        ...c,
        isAddedToDashboard: c.chainId in configuredChainsRecord,
      }));
    }, [props.chains, configuredChainsRecord]);

  const [searchTerm, setSearchTerm] = useState("");

  const fuse = useMemo(() => {
    return new Fuse(chainsWithDashboardStatus, {
      keys: [
        {
          name: "name",
          weight: 2,
        },
        {
          name: "chainId",
          weight: 1,
        },
      ],
    });
  }, [chainsWithDashboardStatus]);

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredChains = useMemo(() => {
    if (!deferredSearchTerm || !allChains.length) {
      return chainsWithDashboardStatus || [];
    }

    return fuse.search(deferredSearchTerm).map((e) => e.item);
  }, [chainsWithDashboardStatus, deferredSearchTerm, fuse]);

  const title = "Chainlist | RPCs, Block Explorers, Faucets | thirdweb";
  const description =
    "A list of EVM networks with RPCs, smart contracts, block explorers & faucets. Deploy smart contracts to all EVM chains with thirdweb.";

  return (
    <Flex flexDir="column" gap={8} mt={{ base: 2, md: 6 }}>
      <NextSeo
        title={title}
        description={description}
        openGraph={{
          title,
          description,
        }}
      />
      <Flex direction="row" align="center" justify="space-between" gap={4}>
        <Heading size="title.lg" as="h1" flexShrink={0}>
          Chainlist
        </Heading>

        <Card
          p={0}
          w={{ base: "full", md: "40%" }}
          border="none"
          borderRadius="md"
        >
          <InputGroup>
            <InputLeftElement>
              <Icon as={FiSearch} opacity={0.5} />
            </InputLeftElement>
            <Input
              variant="outline"
              spellCheck="false"
              autoComplete="off"
              bg="transparent"
              placeholder="Chain name or chain id"
              borderColor="borderColor"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {/* Spinner Icon as a Searching Indicator */}
            {searchTerm !== deferredSearchTerm && (
              <InputRightElement
                opacity={1}
                transition="opacity 250ms ease"
                cursor={"pointer"}
                borderRadius="md"
                children={<Spinner size="sm" />}
              />
            )}
          </InputGroup>
        </Card>
      </Flex>

      <SearchResults chains={filteredChains} />
    </Flex>
  );
};

export const SearchResults: React.FC<{
  chains: MinimalRPCChainWithDashboardStatus[];
}> = memo(function SearchResults(props) {
  return (
    <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
      {props.chains.map((chain) => (
        <SearchResult chain={chain} key={`chain_${chain.chainId}`} />
      ))}
    </SimpleGrid>
  );
});

const SearchResult: React.FC<{
  chain: MinimalRPCChainWithDashboardStatus;
}> = memo(function SearchResult({ chain }) {
  return (
    <LinkBox position="relative" role="group" key={`chain_${chain.chainId}`}>
      <Card
        role="group"
        display="flex"
        flexDir="column"
        gap={4}
        px={6}
        // bg="transparent"
        borderColor="borderColor"
        transition="150ms border-color ease-in-out"
        _hover={{
          _dark: {
            borderColor: "white",
          },
          _light: {
            borderColor: "black",
          },
        }}
        position="relative"
        h="full"
      >
        <IconButton
          variant="solid"
          icon={<Icon as={FiArrowUpRight} />}
          size="sm"
          p={0}
          borderRadius="full"
          position="absolute"
          top={0}
          right={0}
          transform="translate(33%, -33%)"
          aria-label="Open published contract"
          opacity={0}
          _dark={{
            bg: "white",
            color: "black",
          }}
          _light={{
            bg: "black",
            color: "white",
          }}
          _groupHover={{
            opacity: 1,
          }}
        />
        <Flex justifyContent="space-between" align="center" alignItems="center">
          <Flex align="center" gap={2}>
            <ChainIcon size={20} ipfsSrc={chain.iconUrl} />
            <LinkOverlay
              as={TrackedLink}
              category={TRACKING_CATEGORY}
              href={`/${chain.slug}`}
            >
              <Heading size="subtitle.sm" as="h3" noOfLines={1}>
                {chain.name}
              </Heading>
            </LinkOverlay>
          </Flex>
          {/* we don't know this state until we're on the client so have to wrap in client only */}
          <ClientOnly ssr={null}>
            <AddToWalletButton chain={chain} />
          </ClientOnly>
        </Flex>

        <Flex flexDir="column" gap={1}>
          <Text pointerEvents="none" opacity={0.6}>
            RPC URL
          </Text>
          {chain.hasRpc ? (
            <InputGroup>
              <Input readOnly value={`${chain.slug}.rpc.thirdweb.com`} />
              <InputRightElement>
                <TrackedCopyButton
                  category={TRACKING_CATEGORY}
                  label="copy-rpc-url"
                  aria-label="Copy RPC url"
                  size="sm"
                  colorScheme={undefined}
                  value={`${chain.slug}.rpc.thirdweb.com`}
                />
              </InputRightElement>
            </InputGroup>
          ) : (
            <Input
              readOnly
              isDisabled
              pointerEvents="none"
              value="Coming Soon"
            />
          )}
        </Flex>

        <SimpleGrid pointerEvents="none" gap={12} columns={12}>
          <Flex as={GridItem} colSpan={4} flexDir="column" gap={1}>
            <Text opacity={0.6}>Chain ID</Text>
            <Text size="label.md">{chain.chainId}</Text>
          </Flex>
          <Flex as={GridItem} flexDir="column" colSpan={8} gap={1}>
            <Text opacity={0.6}>Native Token</Text>
            <Text size="label.md">{chain.symbol}</Text>
          </Flex>
        </SimpleGrid>
      </Card>
    </LinkBox>
  );
});

interface AddToWalletButtonProps {
  chain: MinimalRPCChainWithDashboardStatus;
}

const AddToWalletButton: React.FC<AddToWalletButtonProps> = ({ chain }) => {
  /*   const [, switchNetwork] = useNetwork();
  console.log({ switchNetwork }); */

  /*   const signer = useSigner();
  const provider = useProvider(); */
  const address = useAddress();

  const [connector] = useConnect();

  /*   console.log({ connector }); */

  const provider = connector.data.connector?.getProvider();

  const toHex = (num: number) => {
    return `0x${num.toString(16)}`;
  };

  /*   console.log([`https://${chain.slug}.rpc.thirdweb.com`]); */

  const params = {
    chainId: toHex(chain.chainId),
    chainName: chain.name,
    rpcUrls: chain.hasRpc
      ? [`https://${chain.slug}.rpc.thirdweb.com`]
      : ((chain as any).rpc as string[]),
    nativeCurrency: (chain as any).nativeCurrency,
    /*     blockExplorerUrls: [
      chain.explorers && chain.explorers.length > 0 && chain.explorers[0].url
        ? chain.explorers[0].url
        : chain.infoURL,
    ], */
  };

  /*   console.log((chain as any).rpcUrls); */

  return (
    <Tooltip
      p={0}
      bg="transparent"
      boxShadow="none"
      label={
        <Card py={2} px={4}>
          <Text size="label.sm">Add to wallet</Text>
        </Card>
      }
      borderRadius="lg"
      shouldWrapChildren
    >
      <TrackedIconButton
        variant="ghost"
        category={TRACKING_CATEGORY}
        label="add-to-wallet"
        aria-label="Add to wallet"
        icon={<Icon as={FiPlusCircle} boxSize={6} />}
        color="green.500"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          /*           if (switchNetwork) {
            switchNetwork(chainId as ChainId);
          } */
          console.log("adding");
          if (provider && address) {
            console.log("inside if");
            provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  ...params,
                  nativeCurrency: { ...params.nativeCurrency, decimals: 18 },
                },
              ],
            });
          }
        }}
      />
    </Tooltip>
  );
};

ChainsLanding.getLayout = (page, props) => (
  <AppLayout {...props}>{page}</AppLayout>
);

type MinimalRPCChain = Pick<Chain, "slug" | "name" | "chainId"> & {
  iconUrl: string;
  symbol: string;
  hasRpc: boolean;
};

type MinimalRPCChainWithDashboardStatus = MinimalRPCChain & {
  isAddedToDashboard: boolean;
};

interface DashboardRPCProps {
  chains: Array<MinimalRPCChain>;
}

// server side ----------------

export const getStaticProps: GetStaticProps<DashboardRPCProps> = async () => {
  const chains = allChains
    .filter((c) => c.chainId !== 1337)
    .map((chain) => ({
      slug: chain.slug,
      name: chain.name,
      chainId: chain.chainId,
      chainName: chain.name,
      nativeCurrency: {
        name: chain.nativeCurrency.name,
        symbol: chain.nativeCurrency.symbol,
        decimals: 18 as const,
      },
      rpc: chain.rpc,
      iconUrl: "icon" in chain ? chain.icon.url : "",
      symbol: chain.nativeCurrency.symbol,
      hasRpc:
        "rpc" in chain &&
        chain.rpc.findIndex((c) => c.indexOf("thirdweb.com") > -1) > -1,
    }));
  return {
    props: {
      chains,
    },
  };
};

ChainsLanding.pageId = PageId.ChainsLanding;

export default ChainsLanding;
