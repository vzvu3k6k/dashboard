import { apiKeyMap, apiMap } from "./common";
import { withSentry } from "@sentry/nextjs";
import { ChainId, resolveContractUriFromAddress } from "@thirdweb-dev/sdk/evm";
import { getDefaultProvider } from "ethers";
import { StorageSingleton } from "lib/sdk";
import { NextApiRequest, NextApiResponse } from "next";
import solc from "solc";

interface GetEtherscanMetadataDataPayload {
  contractAddress: string;
  chainId: ChainId;
}

export type EtherscanResult = {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(400).json({ error: "invalid method" });
  }

  try {
    const { contractAddress, chainId } =
      req.body as GetEtherscanMetadataDataPayload;
    const uri = await resolveContractUriFromAddress(
      contractAddress,
      getDefaultProvider(chainId),
    );
    // TODO if uri is not defined, probably need to hash the bytecode to use as contract metadata id
    console.log("expected uri", uri);
    // fetch from etherscan
    const result = await getEtherscanMetadata(contractAddress, chainId);
    console.log(result.compilerVersion);
    console.log(JSON.stringify(result.metadata.settings));
    // compile
    const solcWithVersion: any = await new Promise((resolve, reject) => {
      solc.loadRemoteVersion(
        result.compilerVersion,
        (err: any, solcSnapshot: any) => {
          if (err) {
            // An error was encountered, display and quit
            console.log("Failed to load solc version", err);
            reject(new Error("Failed to load solc version"));
          } else {
            resolve(solcSnapshot);
          }
        },
      );
    });

    const output = JSON.parse(
      solcWithVersion.compile(JSON.stringify(result.metadata)),
    );

    if (output.errors) {
      output.errors.forEach((error: any) => {
        if (error.severity === "error") {
          console.log("Compilation Error:", error.formattedMessage);
          throw new Error(`Compilation Error: ${error.formattedMessage}`);
        }
      });
    }

    let metadataUploadPromise;
    for (const contractName in output.contracts) {
      const contract = output.contracts[contractName];
      const contractNamesInNamespace = Object.keys(contract);
      for (const c of contractNamesInNamespace) {
        const contractData = contract[c];
        if (c === result.name) {
          const solcOutput = JSON.parse(contractData.metadata);
          metadataUploadPromise = StorageSingleton.upload(solcOutput, {
            uploadWithoutDirectory: true,
          });
        }
      }
    }

    if (!metadataUploadPromise) {
      throw new Error("Metadata not found");
    }

    const hashes = [];
    // upload metadata
    hashes.push(await metadataUploadPromise);

    console.log("actual uri", hashes[0]);
    console.log("MATCH", hashes[0] === uri);

    // upload sources
    for (const sourceInfo of Object.values(result.metadata.sources)) {
      const content = (sourceInfo as any).content;
      if (content) {
        hashes.push(
          await StorageSingleton.upload(content, {
            uploadWithoutDirectory: true,
          }),
        );
      }
    }

    return res.status(200).json(hashes);
  } catch (e) {
    return res.status(400).json({ error: e });
  }
};

type EtherscanMetadata = {
  name: string;
  abi: any;
  metadata: any;
  compilerVersion: string;
};

async function getEtherscanMetadata(
  contractAddress: string,
  chainId: number,
): Promise<EtherscanMetadata> {
  const endpoint = `${apiMap[chainId]}?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKeyMap[chainId]}"`;
  const initialData = await fetch(endpoint, {
    method: "GET",
  });
  const data = await initialData.json();
  const etherscanResult = data.result[0] as EtherscanResult;
  if (etherscanResult.Proxy === "1") {
    const implementationAddress = etherscanResult.Implementation;
    return getEtherscanMetadata(implementationAddress, chainId);
  }
  const name = etherscanResult.ContractName;
  let metadata;
  if (etherscanResult.SourceCode.startsWith("{{")) {
    // solc input (weirdly in double brackets)
    metadata = JSON.parse(data.result[0].SourceCode.slice(1, -1));
    // override output selection, we only need metadata
    metadata.settings.outputSelection["*"]["*"] = ["metadata"];
  } else {
    // plain file
    const contractPath = `${name}.sol`;
    metadata = getSolcJsonInputFromEtherscanResult(
      etherscanResult,
      contractPath,
    );
  }

  return {
    name,
    abi: JSON.parse(etherscanResult.ABI),
    metadata,
    compilerVersion: etherscanResult.CompilerVersion,
  };
}

function getSolcJsonInputFromEtherscanResult(
  etherscanResult: EtherscanResult,
  contractPath: string,
): any {
  const generatedSettings = {
    optimizer: {
      enabled: etherscanResult.OptimizationUsed === "1",
      runs: parseInt(etherscanResult.Runs),
    },
    outputSelection: {
      "*": {
        "*": ["metadata"],
      },
    },
    evmVersion:
      etherscanResult.EVMVersion.toLowerCase() !== "default"
        ? etherscanResult.EVMVersion
        : undefined,
    libraries: {},
  };
  const solcJsonInput = {
    language: "Solidity",
    sources: {
      [contractPath]: {
        content: etherscanResult.SourceCode,
      },
    },
    settings: generatedSettings,
  };
  return solcJsonInput;
}

export default withSentry(handler);
