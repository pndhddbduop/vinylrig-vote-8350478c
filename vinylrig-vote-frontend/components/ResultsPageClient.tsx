"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useFhevm } from "@/fhevm/useFhevm";
import { useVinylRigVote } from "@/hooks/useVinylRigVote";
import { ResultsCharts } from "./ResultsCharts";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { Navigation } from "@/components/Navigation";

type DecryptedResults = {
  setupIndex: number;
  equipmentName: string;
  averageRating: number;
  totalVotes: number;
  tagScores: number[]; // Decrypted tag totals
};

export function ResultsPageClient({ sessionId }: { sessionId: number }) {
  const { isConnected, connect, address, chainId, signer, browserProvider, eip1193Provider } = useWallet();
  
  // FHEVM instance
  const { instance, status: fhevmStatus } = useFhevm({
    provider: eip1193Provider,
    chainId,
    enabled: isConnected,
  });

  // Decryption signature storage
  const decryptionSignatureStorage = useInMemoryStorage();

  // Contract interactions
  const { 
    sessions, 
    isLoading, 
    message,
    revealEquipment,
    requestDecryption,
    getAggregatedHandles,
  } = useVinylRigVote({
    instance,
    chainId,
    ethersSigner: signer,
    ethersReadonlyProvider: browserProvider,
    userAddress: address,
  });

  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedResults, setDecryptedResults] = useState<DecryptedResults[]>([]);
  const [decryptionError, setDecryptionError] = useState<string>("");

  const session = sessions[sessionId];
  const isOrganizer = session && address && session.organizer.toLowerCase() === address.toLowerCase();

  // Decrypt aggregated results
  const decryptResults = useCallback(async () => {
    if (!instance || !signer || !session || !address) {
      setDecryptionError("Missing requirements for decryption");
      return;
    }

    if (!getAggregatedHandles) {
      setDecryptionError("Contract method not available");
      return;
    }

    setIsDecrypting(true);
    setDecryptionError("");

    try {
      console.log("[Results] Fetching aggregated handles...");
      
      // Get aggregated handles from contract
      const aggregatedData = await getAggregatedHandles(sessionId);
      
      if (!aggregatedData || aggregatedData.length === 0) {
        setDecryptionError("No aggregated data available");
        return;
      }

      console.log("[Results] Aggregated handles:", aggregatedData);

      // Get decryption signature
      const contractAddress = aggregatedData[0]?.contractAddress;
      if (!contractAddress) {
        setDecryptionError("Contract address not found");
        return;
      }

      console.log("[Results] Loading/signing decryption signature...");
      const sig = await FhevmDecryptionSignature.loadOrSign(
        instance,
        [contractAddress as `0x${string}`],
        signer,
        decryptionSignatureStorage
      );

      if (!sig) {
        setDecryptionError("Failed to get decryption signature");
        return;
      }

      console.log("[Results] Decryption signature obtained");

      // Prepare all handles for batch decryption
      const handlesToDecrypt = aggregatedData.flatMap((setup) => [
        { handle: setup.ratingHandle, contractAddress: setup.contractAddress },
        ...setup.tagHandles.map((handle) => ({
          handle,
          contractAddress: setup.contractAddress,
        })),
      ]);

      console.log("[Results] Decrypting", handlesToDecrypt.length, "handles...");

      // Decrypt all handles in one call
      const decryptedValues = await instance.userDecrypt(
        handlesToDecrypt,
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      console.log("[Results] Decryption complete:", decryptedValues);

      // Map decrypted values back to results
      // v0.3.0 UserDecryptResults type is stricter, need to cast
      const values = decryptedValues as Record<string, bigint>;
      const results: DecryptedResults[] = aggregatedData.map((setup, idx) => {
        const ratingTotal = values[setup.ratingHandle] || BigInt(0);
        const tagTotals = setup.tagHandles.map((handle) => values[handle] || BigInt(0));
        const voteCount = setup.voteCount;

        return {
          setupIndex: idx,
          equipmentName: setup.equipmentName || `Setup ${idx + 1}`,
          averageRating: voteCount > 0 ? Number(ratingTotal) / voteCount : 0,
          totalVotes: voteCount,
          tagScores: tagTotals.map((t) => Number(t)),
        };
      });

      console.log("[Results] Processed results:", results);
      setDecryptedResults(results);
    } catch (error) {
      console.error("[Results] Decryption error:", error);
      setDecryptionError(error instanceof Error ? error.message : "Decryption failed");
    } finally {
      setIsDecrypting(false);
    }
  }, [instance, signer, session, address, sessionId, getAggregatedHandles, decryptionSignatureStorage]);

  // Reveal equipment names (organizer only)
  const handleRevealEquipment = async () => {
    if (!revealEquipment) return;
    
    try {
      const success = await revealEquipment(sessionId);
      if (success) {
        // Refresh decrypted results to show real equipment names
        if (decryptedResults.length > 0) {
          setTimeout(() => decryptResults(), 1000);
        }
      }
    } catch (error) {
      console.error("[Results] Reveal equipment error:", error);
    }
  };

  // Request decryption authorization (organizer only)
  const handleRequestDecryption = async () => {
    if (!requestDecryption) return;
    
    try {
      await requestDecryption(sessionId);
      // After requesting, try to decrypt
      setTimeout(() => decryptResults(), 2000);
    } catch (error) {
      console.error("[Results] Request decryption error:", error);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-heading font-bold mb-4">Connect Wallet Required</h2>
          <p className="text-muted-foreground mb-6">
            Please connect your wallet to view session results
          </p>
          <button
            onClick={connect}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  const getStateBadge = (state: number) => {
    switch (state) {
      case 0: return <span className="px-3 py-1 bg-gray-500 text-white text-sm rounded-full">Draft</span>;
      case 1: return <span className="px-3 py-1 bg-success text-white text-sm rounded-full">Active</span>;
      case 2: return <span className="px-3 py-1 bg-warning text-white text-sm rounded-full">Closed</span>;
      case 3: return <span className="px-3 py-1 bg-primary text-white text-sm rounded-full">Revealed</span>;
      default: return <span className="px-3 py-1 bg-gray-400 text-white text-sm rounded-full">Unknown</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Session Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-heading font-bold">{session.title}</h1>
            {getStateBadge(session.state)}
          </div>
          <p className="text-muted-foreground mb-2">{session.description}</p>
          <p className="text-sm text-muted-foreground">
            Organizer: {session.organizer.slice(0, 6)}...{session.organizer.slice(-4)}
          </p>
        </div>

        {/* Decryption Controls (Organizer Only) */}
        {isOrganizer && session.state >= 2 && (
          <div className="mb-8 p-6 bg-card border border-border rounded-lg">
            <h2 className="text-xl font-heading font-bold mb-4">Organizer Controls</h2>
            
            {decryptedResults.length === 0 ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  As the organizer, you can decrypt the aggregated results and optionally reveal equipment names.
                </p>
                
                <div className="flex gap-4 flex-wrap">
                  <button
                    onClick={handleRequestDecryption}
                    disabled={isLoading || !requestDecryption}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Request Decryption Authorization
                  </button>
                  
                  <button
                    onClick={decryptResults}
                    disabled={isDecrypting || fhevmStatus !== "ready"}
                    className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isDecrypting ? "Decrypting..." : "Decrypt Results"}
                  </button>

                  {session.state === 2 && (
                    <button
                      onClick={handleRevealEquipment}
                      disabled={isLoading}
                      className="px-6 py-3 border-2 border-warning text-warning rounded-lg hover:bg-warning hover:text-warning-foreground transition-colors disabled:opacity-50"
                    >
                      🔓 Reveal Equipment Names
                    </button>
                  )}
                </div>

                {message && (
                  <p className="text-sm text-muted-foreground mt-2">
                    📝 {message}
                  </p>
                )}

                {decryptionError && (
                  <p className="text-sm text-error mt-2">
                    ❌ {decryptionError}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-success">
                  <span className="text-2xl">✅</span>
                  <span className="font-medium">Results successfully decrypted!</span>
                </div>
                {session.state === 2 && (
                  <button
                    onClick={handleRevealEquipment}
                    disabled={isLoading}
                    className="px-6 py-3 border-2 border-warning text-warning rounded-lg hover:bg-warning hover:text-warning-foreground transition-colors disabled:opacity-50"
                  >
                    🔓 Reveal Equipment Names
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Results Display */}
        {decryptedResults.length > 0 ? (
          <ResultsCharts results={decryptedResults} />
        ) : (
          <div className="p-12 bg-card border border-border rounded-lg text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-heading font-bold mb-2">Results Encrypted</h2>
            <p className="text-muted-foreground mb-4">
              {isOrganizer
                ? "Use the organizer controls above to decrypt and view the results."
                : "The session organizer must decrypt the results before they can be viewed."}
            </p>
            {!isOrganizer && (
              <p className="text-sm text-muted-foreground">
                This ensures the privacy of all votes until the organizer is ready to reveal them.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

