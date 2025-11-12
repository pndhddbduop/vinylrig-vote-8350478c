"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useFhevm } from "@/fhevm/useFhevm";
import { useVinylRigVote } from "@/hooks/useVinylRigVote";
import { Navigation } from "@/components/Navigation";

/**
 * VotePageClient - Main voting interface component
 * Handles encrypted vote submission for blind listening sessions
 */
export function VotePageClient({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  
  const { isConnected, connect, address, chainId, signer: walletSigner, browserProvider, eip1193Provider } = useWallet();
  
  // Auto-initializing FHEVM instance
  const { instance, status: fhevmStatus, error: fhevmError } = useFhevm({
    provider: eip1193Provider,
    chainId,
    enabled: isConnected,
  });

  const { sessions, submitVote, message, isLoading, hasVoted } = useVinylRigVote({
    instance,
    chainId,
    ethersSigner: walletSigner,
    ethersReadonlyProvider: browserProvider,
    userAddress: address,
  });

  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<boolean[]>([false, false, false, false, false]);
  const [currentSetup, setCurrentSetup] = useState(0);
  const [votedSetups, setVotedSetups] = useState<Set<number>>(new Set());

  const session = sessions[sessionId];

  // Check voted status
  useEffect(() => {
    if (!session || !hasVoted) return;

    const checkVotedStatus = async () => {
      const voted = new Set<number>();
      for (let i = 0; i < session.numSetups; i++) {
        const hasVotedForSetup = await hasVoted(sessionId, i);
        if (hasVotedForSetup) {
          voted.add(i);
        }
      }
      setVotedSetups(voted);
    };

    checkVotedStatus();
  }, [session, hasVoted, sessionId]);

  // Debug info
  useEffect(() => {
    console.log("[VotePageClient] State check:", {
      isConnected,
      address,
      chainId,
      hasWalletSigner: !!walletSigner,
      hasBrowserProvider: !!browserProvider,
      hasEip1193Provider: !!eip1193Provider,
      hasInstance: !!instance,
      fhevmStatus,
      fhevmError: fhevmError?.message,
    });
  }, [isConnected, address, chainId, walletSigner, browserProvider, eip1193Provider, instance, fhevmStatus, fhevmError]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-heading font-bold mb-4">Connect Wallet Required</h2>
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

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-heading font-bold mb-4">Session Not Found</h2>
          <Link href="/sessions" className="text-primary hover:underline">
            Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmitVote = async () => {
    const success = await submitVote(sessionId, currentSetup, rating, tags);
    if (success) {
      setVotedSetups(prev => new Set(prev).add(currentSetup));
      // Move to next setup if available
      if (currentSetup < session.numSetups - 1) {
        setCurrentSetup(currentSetup + 1);
        setRating(5);
        setTags([false, false, false, false, false]);
      }
    }
  };

  const tagLabels = ["Bass (20-250 Hz)", "Midrange (250-4000 Hz)", "Treble (4000-20000 Hz)", "Soundstage", "Detail"];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Debug Panel */}
        <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border text-xs">
          <div className="font-mono space-y-1">
            <div>✅ Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}</div>
            <div>✅ Chain: {chainId}</div>
            <div className={walletSigner ? "text-success" : "text-error"}>
              {walletSigner ? "✅" : "❌"} Signer: {walletSigner ? "Available" : "Missing"}
            </div>
            <div className={browserProvider ? "text-success" : "text-error"}>
              {browserProvider ? "✅" : "❌"} Provider: {browserProvider ? "Available" : "Missing"}
            </div>
            <div className={eip1193Provider ? "text-success" : "text-error"}>
              {eip1193Provider ? "✅" : "❌"} EIP-1193: {eip1193Provider ? "Available" : "Missing"}
            </div>
            <div className={instance && fhevmStatus === "ready" ? "text-success" : fhevmStatus === "error" ? "text-error" : "text-warning"}>
              {instance && fhevmStatus === "ready" ? "✅" : fhevmStatus === "error" ? "❌" : "⏳"} FHEVM: {fhevmStatus} {fhevmError && `(${fhevmError.message})`}
            </div>
            {message && <div className="mt-2 text-warning">📝 {message}</div>}
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold mb-2">{session.title}</h1>
          <p className="text-muted-foreground">{session.description}</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-2">
            You have voted on {votedSetups.size} / {session.numSetups} setups
          </p>
          <div className="flex gap-2">
            {Array.from({ length: session.numSetups }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSetup(i)}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  votedSetups.has(i)
                    ? "bg-success"
                    : i === currentSetup
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Voting form */}
        <div className="border border-border rounded-lg p-8 bg-card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-heading font-semibold">
              Setup {String.fromCharCode(65 + currentSetup)}
            </h2>
            {votedSetups.has(currentSetup) && (
              <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm font-medium">
                ✓ Voted
              </span>
            )}
          </div>

          {/* Rating slider */}
          <div className="mb-8">
            <label className="block text-sm font-medium mb-2">
              Rating: <span className="text-primary font-bold text-lg">{rating}/10</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              disabled={votedSetups.has(currentSetup)}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>

          {/* Frequency preference tags */}
          <div className="mb-8">
            <label className="block text-sm font-medium mb-3">Frequency Preference Tags</label>
            <div className="space-y-2">
              {tagLabels.map((label, index) => (
                <label key={index} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tags[index]}
                    onChange={(e) => {
                      const newTags = [...tags];
                      newTags[index] = e.target.checked;
                      setTags(newTags);
                    }}
                    className="w-4 h-4 accent-primary"
                    disabled={votedSetups.has(currentSetup)}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Message display */}
          {message && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <p className="text-sm font-mono">{message}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmitVote}
            disabled={isLoading || votedSetups.has(currentSetup)}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? "Submitting..."
              : votedSetups.has(currentSetup)
              ? "Already Voted for This Setup"
              : "Submit Vote"}
          </button>

          {/* Navigation buttons */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setCurrentSetup(Math.max(0, currentSetup - 1))}
              disabled={currentSetup === 0}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous Setup
            </button>
            <button
              onClick={() => setCurrentSetup(Math.min(session.numSetups - 1, currentSetup + 1))}
              disabled={currentSetup === session.numSetups - 1}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Setup →
            </button>
          </div>
        </div>

        {/* Finish button */}
        {votedSetups.size === session.numSetups && (
          <div className="mt-8 text-center">
            <p className="text-success font-semibold mb-4">✓ All setups voted!</p>
            <button
              onClick={() => router.push("/sessions")}
              className="px-8 py-3 bg-success text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Finish & Return to Sessions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

