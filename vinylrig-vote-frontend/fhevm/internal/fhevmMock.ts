/**
 * FHEVM Mock utilities for local development
 * Dynamically imported only when chainId === 31337
 * 
 * WARNING: ALWAYS USE DYNAMIC IMPORT TO AVOID INCLUDING 
 * THE ENTIRE FHEVM MOCK LIB IN THE FINAL PRODUCTION BUNDLE!!
 */

import { Contract, JsonRpcProvider, getAddress, ethers } from "ethers";
import type { FhevmInstance } from "../fhevmTypes";

/**
 * Fetch FHEVM Hardhat node metadata
 */
async function getFhevmRelayerMetadata(rpcUrl: string) {
  const provider = new JsonRpcProvider(rpcUrl);
  try {
    const metadata = await provider.send("fhevm_relayer_metadata", []);
    return metadata;
  } catch (error) {
    console.error("[fhevmMock] Failed to fetch fhevm_relayer_metadata:", error);
    throw new Error(`The URL ${rpcUrl} is not a FHEVM Hardhat node or is not reachable.`);
  } finally {
    provider.destroy();
  }
}

/**
 * Query InputVerifier contract's EIP712 domain to get the correct verifying contract address
 * This is required for v0.9 compatibility
 */
async function getInputVerifierEip712Domain(
  provider: JsonRpcProvider,
  inputVerifierAddress: string
): Promise<{ verifyingContract: string; chainId: bigint }> {
  const inputVerifierContract = new Contract(
    inputVerifierAddress,
    [
      "function eip712Domain() external view returns (bytes1, string, string, uint256, address, bytes32, uint256[])",
    ],
    provider
  );

  try {
    const domain = await inputVerifierContract.eip712Domain();
    // EIP712 domain structure: [fields, name, version, chainId, verifyingContract, salt, extensions]
    // domain[3] = chainId (uint256), domain[4] = verifyingContract (address)
    console.log("[fhevmMock] EIP712 domain raw result:", {
      fields: domain[0],
      name: domain[1],
      version: domain[2],
      chainId: domain[3]?.toString(),
      verifyingContract: domain[4],
      salt: domain[5],
      extensions: domain[6],
    });
    
    const verifyingContract = domain[4];
    const chainId = BigInt(domain[3].toString());
    
    // Validate that we got valid values
    if (!verifyingContract || verifyingContract === ethers.ZeroAddress) {
      throw new Error("Invalid verifyingContract from EIP712 domain");
    }
    
    return {
      verifyingContract,
      chainId,
    };
  } catch (error) {
    console.error("[fhevmMock] Failed to query InputVerifier EIP712 domain:", error);
    throw new Error(`Failed to query InputVerifier EIP712 domain: ${error}`);
  }
}

/**
 * Create FHEVM mock instance using @fhevm/mock-utils
 * Mimics reference project's fhevmMockCreateInstance
 * 
 * Key fix for v0.9: Dynamically query InputVerifier's EIP712 domain
 * to get the correct verifyingContractAddressInputVerification
 */
export async function createFhevmInstance(parameters?: {
  rpcUrl?: string;
  chainId?: number;
}): Promise<FhevmInstance> {
  const rpcUrl = parameters?.rpcUrl || "http://localhost:8545";
  const chainId = parameters?.chainId || 31337;

  console.log("[fhevmMock] Fetching metadata from:", rpcUrl);
  
  // Fetch metadata from Hardhat node
  const metadata = await getFhevmRelayerMetadata(rpcUrl);
  
  if (!metadata?.ACLAddress || !metadata?.InputVerifierAddress || !metadata?.KMSVerifierAddress) {
    throw new Error("Invalid fhevm_relayer_metadata received from Hardhat node");
  }

  console.log("[fhevmMock] Metadata received:", metadata);

  // Dynamically import mock-utils
  const { MockFhevmInstance } = await import("@fhevm/mock-utils");
  
  // Create provider
  const provider = new JsonRpcProvider(rpcUrl);

  // Query InputVerifier's EIP712 domain to get the correct verifying contract address and chainId
  // CRITICAL: Both verifyingContractAddressInputVerification AND gatewayChainId must match EIP712 domain
  // This is required for v0.9 compatibility (fixes "Fhevm assertion failed" error)
  console.log("[fhevmMock] Querying InputVerifier EIP712 domain...");
  console.log("[fhevmMock] InputVerifier address:", metadata.InputVerifierAddress);
  
  let verifyingContractAddressInputVerification: `0x${string}`;
  let gatewayChainId: number;
  
  try {
    const eip712Domain = await getInputVerifierEip712Domain(provider, metadata.InputVerifierAddress);
    const eip712VerifyingContract = getAddress(eip712Domain.verifyingContract);
    const eip712ChainId = Number(eip712Domain.chainId);
    const inputVerifierAddress = getAddress(metadata.InputVerifierAddress);
    
    console.log("[fhevmMock] EIP712 domain result:", {
      eip712VerifyingContract,
      inputVerifierAddress,
      match: eip712VerifyingContract.toLowerCase() === inputVerifierAddress.toLowerCase(),
      eip712ChainId: eip712ChainId.toString(),
      localChainId: chainId,
    });
    
    // Use the verifyingContract from EIP712 domain (required by assertion)
    verifyingContractAddressInputVerification = eip712VerifyingContract as `0x${string}`;
    // Use the chainId from EIP712 domain as gatewayChainId (required by assertion)
    gatewayChainId = eip712ChainId;
    
    console.log("[fhevmMock] Using EIP712 domain values:", {
      verifyingContractAddressInputVerification,
      gatewayChainId,
    });
  } catch (error) {
    console.warn("[fhevmMock] Failed to query EIP712 domain, using hardcoded fallback:", error);
    // Fallback: use hardcoded values (may not work if they don't match actual EIP712 domain)
    verifyingContractAddressInputVerification = "0x812b06e1CDCE800494b79fFE4f925A504a9A9810" as `0x${string}`;
    gatewayChainId = 10901; // This is the chainId from EIP712 domain (not 55815!)
  }

  // Configuration must match EIP712 domain values
  const config = {
    aclContractAddress: metadata.ACLAddress as `0x${string}`,
    chainId: chainId, // Local chain ID (31337 for Hardhat)
    gatewayChainId: gatewayChainId, // MUST match InputVerifier EIP712 domain chainId (10901, not 55815!)
    inputVerifierContractAddress: metadata.InputVerifierAddress as `0x${string}`,
    kmsContractAddress: metadata.KMSVerifierAddress as `0x${string}`,
    verifyingContractAddressDecryption: "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64" as `0x${string}`,
    verifyingContractAddressInputVerification, // MUST match InputVerifier EIP712 domain verifyingContract
  };
  
  console.log("[fhevmMock] Creating MockFhevmInstance with config (matching reference project):", config);
  
  try {
    const instance = await MockFhevmInstance.create(
      provider,
      provider,
      config,
      {
        // v0.3.0-1 API requires properties parameter (not in reference project's 0.1.0)
        inputVerifierProperties: {},
        kmsVerifierProperties: {},
      }
    );

    console.log("[fhevmMock] MockFhevmInstance created successfully!");
    console.log("[fhevmMock] Instance type:", instance.constructor.name);
    console.log("[fhevmMock] Instance methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(instance)));
    
    // Wait a bit to ensure instance is fully initialized
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return instance as unknown as FhevmInstance;
  } catch (error) {
    console.error("[fhevmMock] Failed to create MockFhevmInstance:", error);
    throw error;
  }
}

/**
 * Decrypt encrypted value using mock utilities
 */
export async function userDecryptMock(
  handle: string | bigint,
  contractAddress: string,
  userAddress: string
): Promise<bigint> {
  const fhevmMock = await import("@fhevm/mock-utils");
  // @ts-ignore - Dynamic import types
  return fhevmMock.userDecrypt(BigInt(handle), contractAddress, userAddress);
}

