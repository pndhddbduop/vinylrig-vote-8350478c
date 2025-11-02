"use client";

import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import type { FhevmInstance } from "./fhevmTypes";

export type FhevmGoState = "idle" | "loading" | "ready" | "error";

/**
 * Auto-initializing FHEVM hook
 * Mimics the reference project's useFhevm pattern
 */
export function useFhevm(parameters: {
  provider: ethers.Eip1193Provider | null | undefined;
  chainId: number | null | undefined;
  enabled?: boolean;
}): {
  instance: FhevmInstance | undefined;
  error: Error | undefined;
  status: FhevmGoState;
} {
  const { provider, chainId, enabled = true } = parameters;

  const [instance, setInstance] = useState<FhevmInstance | undefined>(undefined);
  const [status, setStatus] = useState<FhevmGoState>("idle");
  const [error, setError] = useState<Error | undefined>(undefined);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const providerRef = useRef(provider);
  const chainIdRef = useRef(chainId);

  // Main effect: Auto-initialize when provider/chainId change
  useEffect(() => {
    console.log("[useFhevm] Effect triggered:", { provider: !!provider, chainId, enabled });

    // Abort previous initialization
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Reset state
    providerRef.current = provider;
    chainIdRef.current = chainId;
    setInstance(undefined);
    setError(undefined);

    // Guard conditions
    if (!enabled || !provider || chainId === undefined) {
      setStatus("idle");
      console.log("[useFhevm] Not ready:", { enabled, hasProvider: !!provider, chainId });
      return;
    }

    // Start initialization
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const signal = abortController.signal;

    setStatus("loading");
    console.log("[useFhevm] Starting initialization for chainId:", chainId);

    (async () => {
      try {
        let newInstance: FhevmInstance;

        // Mock mode for local development (chainId 31337)
        if (chainId === 31337) {
          console.log("[useFhevm] Initializing MOCK mode...");
          const { createFhevmInstance } = await import("./internal/fhevmMock");
          newInstance = await createFhevmInstance();
          console.log("✅ [useFhevm] Mock instance created");
        } 
        // Real mode for Sepolia or other networks
        else {
          console.log("[useFhevm] Initializing REAL mode...");
          const { getRelayerSDK } = await import("./internal/RelayerSDKLoader");
          const sdk = await getRelayerSDK();
          
          if (!sdk.__initialized__) {
            console.log("[useFhevm] Initializing Relayer SDK...");
            await sdk.initSDK();
            sdk.__initialized__ = true;
          }

          newInstance = await sdk.createInstance(sdk.SepoliaConfig);
          console.log("✅ [useFhevm] Real instance created");
        }

        if (signal.aborted) {
          console.log("[useFhevm] Aborted during initialization");
          return;
        }

        setInstance(newInstance);
        setError(undefined);
        setStatus("ready");
        console.log("✅ [useFhevm] Instance ready!");
      } catch (err) {
        if (signal.aborted) {
          console.log("[useFhevm] Aborted with error");
          return;
        }

        const error = err instanceof Error ? err : new Error("Failed to initialize FHEVM");
        console.error("❌ [useFhevm] Initialization failed:", error);
        setInstance(undefined);
        setError(error);
        setStatus("error");
      }
    })();

    // Cleanup on unmount or re-run
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [provider, chainId, enabled]);

  return { instance, error, status };
}

