// import { withSentry } from "@sentry/nextjs";
import { apiKeyMap, apiMap } from "./common";
import {
  ChainId,
  SUPPORTED_CHAIN_ID,
  extractConstructorParamsFromAbi,
  fetchSourceFilesFromMetadata,
  resolveContractUriFromAddress,
} from "@thirdweb-dev/sdk/evm";
import { Abi } from "components/contract-components/types";
import { ethers, utils } from "ethers";
import { StorageSingleton, getEVMThirdwebSDK } from "lib/sdk";
import { NextApiRequest, NextApiResponse } from "next";

interface VerifyPayload {
  contractAddress: string;
  chainId: ChainId;
}

const RequestStatus = {
  OK: "1",
  NOTOK: "0",
};

export const VerificationStatus = {
  FAILED: "Fail - Unable to verify",
  SUCCESS: "Pass - Verified",
  PENDING: "Pending in queue",
  ALREADY_VERIFIED: "Contract source code already verified",
  AUTOMATICALLY_VERIFIED: "Already Verified",
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(400).json({ error: "invalid method" });
  }

  try {
    const { contractAddress, chainId } = req.body as VerifyPayload;

    const endpoint: string | undefined = apiMap[chainId];

    if (!endpoint) {
      throw new Error(
        `ChainId ${chainId} is not supported for etherscan verification`,
      );
    }
    const sdk = getEVMThirdwebSDK(chainId as SUPPORTED_CHAIN_ID);
    const compilerMetadata = await sdk
      .getPublisher()
      .fetchCompilerMetadataFromAddress(contractAddress);
    const compilerVersion = compilerMetadata.metadata.compiler.version;

    const sources = await fetchSourceFilesFromMetadata(
      compilerMetadata,
      StorageSingleton,
    );

    const sourcesWithUrl = compilerMetadata.metadata.sources;
    const sourcesWithContents: Record<string, { content: string }> = {};
    for (const path of Object.keys(sourcesWithUrl)) {
      const sourceCode = sources.find((source) => path === source.filename);
      if (!sourceCode) {
        throw new Error(`Could not find source file for ${path}`);
      }
      sourcesWithContents[path] = {
        content: sourceCode.source,
      };
    }

    const compilerInput: any = {
      language: "Solidity",
      sources: sourcesWithContents,
      settings: {
        optimizer: compilerMetadata.metadata.settings.optimizer,
        evmVersion: compilerMetadata.metadata.settings.evmVersion,
        remappings: compilerMetadata.metadata.settings.remappings,
        outputSelection: {
          "*": {
            "*": [
              "abi",
              "evm.bytecode",
              "evm.deployedBytecode",
              "evm.methodIdentifiers",
              "metadata",
            ],
            "": ["ast"],
          },
        },
      },
    };

    const compilationTarget =
      compilerMetadata.metadata.settings.compilationTarget;
    const targets = Object.keys(compilationTarget);
    const contractPath = targets[0];

    const encodedConstructorArgs = await fetchConstructorParams(
      contractAddress,
      chainId,
      compilerMetadata.abi,
      sdk.getProvider(),
    );

    const requestBody: Record<string, string> = {
      apikey: apiKeyMap[chainId],
      module: "contract",
      action: "verifysourcecode",
      contractaddress: contractAddress,
      sourceCode: JSON.stringify(compilerInput),
      codeformat: "solidity-standard-json-input",
      contractname: `${contractPath}:${compilerMetadata.name}`,
      compilerversion: `v${compilerVersion}`,
      constructorArguements: encodedConstructorArgs,
    };

    const parameters = new URLSearchParams({ ...requestBody });
    const result = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: parameters.toString(),
    });

    const data = await result.json();
    if (data.status === RequestStatus.OK) {
      return res.status(200).json({ guid: data.result });
    } else {
      return res.status(200).json({ error: data.result });
    }
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: (e as any).toString() });
  }
};

/**
 * Fetch the deploy transaction from the given contract address and extract the encoded constructor parameters
 * @param contractAddress
 * @param chainId
 * @param abi
 */
async function fetchConstructorParams(
  contractAddress: string,
  chainId: ChainId,
  abi: Abi,
  provider: ethers.providers.Provider,
): Promise<string> {
  const constructorParamTypes = extractConstructorParamsFromAbi(abi);
  if (constructorParamTypes.length === 0) {
    return "";
  }
  const requestBody = {
    apiKey: apiKeyMap[chainId],
    module: "account",
    action: "txlist",
    address: contractAddress,
    page: "1",
    sort: "asc",
    offset: "1",
  };
  const parameters = new URLSearchParams({ ...requestBody });
  const result = await fetch(apiMap[chainId], {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: parameters.toString(),
  });
  const data = await result.json();
  if (
    data &&
    data.status === RequestStatus.OK &&
    data.result[0] !== undefined
  ) {
    const contract = new utils.Interface(abi);
    const txDeployBytecode = data.result[0].input;
    let constructorArgs = "";

    if (contract.deploy.inputs.length === 0) {
      return "";
    }

    // first: attempt to get it from Release
    try {
      const bytecode = await fetchDeployBytecodeFromReleaseMetadata(
        contractAddress,
        provider,
      );

      if (bytecode) {
        // contract was realeased, use the deployable bytecode method (proper solution)
        const bytecodeHex = bytecode.startsWith("0x")
          ? bytecode
          : `0x${bytecode}`;

        constructorArgs = txDeployBytecode.substring(bytecodeHex.length);
      }
    } catch (e) {
      // contracts not released through thirdweb
    }

    // second: attempt to decode it from solc metadata bytecode
    if (!constructorArgs) {
      // couldn't find bytecode from release, using regex to locate consturctor args thruogh solc metadata
      // https://docs.soliditylang.org/en/v0.8.17/metadata.html#encoding-of-the-metadata-hash-in-the-bytecode
      // {6} = solc version
      // {4} = 0033, but noticed some contracts have values other than 00 33. (uniswap)
      const matches = [
        ...txDeployBytecode.matchAll(
          /(64736f6c6343[\w]{6}[\w]{4})(?!.*\1)(.*)$/g,
        ),
      ];

      // regex finds the LAST occurence of solc metadata bytes, result always in same position
      if (matches.length > 0) {
        // TODO: we currently don't handle error string embedded in the bytecode, need to strip ascii (upgradeableProxy) in patterns[2]
        // https://etherscan.io/address/0xee6a57ec80ea46401049e92587e52f5ec1c24785#code
        constructorArgs = matches[0][2];
      }
    }

    // third: attempt to guess it from the ABI inputs
    if (!constructorArgs) {
      // TODO: need to guess array / struct properly
      const constructorParamByteLength = constructorParamTypes.length * 64;
      constructorArgs = txDeployBytecode.substring(
        txDeployBytecode.length - constructorParamByteLength,
      );
    }

    try {
      // sanity check that the constructor params are valid
      // TODO: should we sanity check after each attempt?
      ethers.utils.defaultAbiCoder.decode(
        contract.deploy.inputs,
        `0x${constructorArgs}`,
      );
    } catch (e) {
      throw new Error(
        "Verifying this contract requires a release. Run `npx thirdweb release` to create a release for this contract, then try again.",
      );
    }

    return constructorArgs;
  } else {
    // Could not retrieve constructor parameters, using empty parameters as fallback
    return "";
  }
}

/**
 * Fetches the release metadata on the ContractPublisher registry (on polygon) for the given contract address (on any chain)
 * @param contractAddress
 * @param provider
 * @returns
 */
async function fetchDeployBytecodeFromReleaseMetadata(
  contractAddress: string,
  provider: ethers.providers.Provider,
): Promise<string | undefined> {
  const compialierMetaUri = await resolveContractUriFromAddress(
    contractAddress,
    provider,
  );
  if (compialierMetaUri) {
    const pubmeta = await getEVMThirdwebSDK(ChainId.Polygon)
      .getPublisher()
      .resolvePublishMetadataFromCompilerMetadata(compialierMetaUri);
    return pubmeta.length > 0
      ? await (await StorageSingleton.download(pubmeta[0].bytecodeUri)).text()
      : undefined;
  }
  return undefined;
}

export default handler;
