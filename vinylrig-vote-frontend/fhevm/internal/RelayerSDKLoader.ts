import { SDK_CDN_URL } from "./constants";
import type { FhevmRelayerSDKType, FhevmWindowType } from "./fhevmTypes";

declare global {
  interface Window {
    relayerSDK?: FhevmRelayerSDKType;
  }
}

let loadPromise: Promise<FhevmRelayerSDKType> | null = null;

/**
 * Loads the FHEVM Relayer SDK from CDN
 * @returns Promise that resolves to the loaded SDK
 */
export async function loadRelayerSDK(): Promise<FhevmRelayerSDKType> {
  // Return existing promise if already loading
  if (loadPromise) {
    return loadPromise;
  }

  // Return SDK if already loaded
  if (window.relayerSDK) {
    return Promise.resolve(window.relayerSDK);
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_CDN_URL;
    script.async = true;

    script.onload = () => {
      if (window.relayerSDK) {
        console.log("✅ Relayer SDK loaded successfully from CDN");
        resolve(window.relayerSDK);
      } else {
        const error = new Error("Relayer SDK failed to initialize on window object");
        console.error(error);
        reject(error);
      }
    };

    script.onerror = () => {
      const error = new Error("Failed to load Relayer SDK from CDN");
      console.error(error);
      reject(error);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Gets the Relayer SDK, loading it if necessary
 * @returns Promise that resolves to the SDK
 */
export async function getRelayerSDK(): Promise<FhevmRelayerSDKType> {
  if (window.relayerSDK) {
    return window.relayerSDK;
  }
  return loadRelayerSDK();
}

