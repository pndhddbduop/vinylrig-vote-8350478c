"use client";

import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useFhevm } from "@/fhevm/useFhevm";
import { useVinylRigVote } from "@/hooks/useVinylRigVote";
import { Navigation } from "@/components/Navigation";

export default function SessionsPage() {
  const { isConnected, connect, address, chainId, signer, browserProvider, eip1193Provider } = useWallet();
  
  // Auto-initializing FHEVM instance
  const { instance } = useFhevm({
    provider: eip1193Provider,
    chainId,
    enabled: isConnected,
  });
  
  const { sessions, isLoading, refreshSessions, closeSession, message } = useVinylRigVote({
    instance,
    chainId,
    ethersSigner: signer,
    ethersReadonlyProvider: browserProvider,
    userAddress: address,
  });

  const handleCloseSession = async (sessionId: number) => {
    if (window.confirm("Are you sure you want to close this session? This cannot be undone.")) {
      await closeSession(sessionId);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-heading font-bold mb-4">Connect Wallet Required</h2>
          <p className="text-muted-foreground mb-6">
            Please connect your wallet to view listening sessions
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

  const getStateBadge = (state: number) => {
    switch (state) {
      case 0: return "Draft";
      case 1: return "Active";
      case 2: return "Closed";
      case 3: return "Revealed";
      default: return "Unknown";
    }
  };

  const getStateColor = (state: number) => {
    switch (state) {
      case 1: return "bg-success/10 text-success";
      case 2: return "bg-warning/10 text-warning";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-heading font-bold">Listening Sessions</h1>
          <div className="flex gap-4 items-center">
            {message && (
              <span className="text-sm text-muted-foreground max-w-xs truncate">
                {message}
              </span>
            )}
            <button
              onClick={refreshSessions}
              disabled={isLoading}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
        
        {sessions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground mb-4">No sessions found</p>
            <Link
              href="/create-session"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Create First Session
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {sessions.map((session, index) => {
              const isActive = session.state === 1;
              const deadline = new Date(Number(session.deadline) * 1000);
              const now = new Date();
              const timeRemaining = deadline.getTime() - now.getTime();
              const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
              const deadlinePassed = timeRemaining <= 0;

              const canVote = isActive;
              const canViewResults = session.state >= 2; // Closed or Revealed
              const isOrganizer = address && session.organizer.toLowerCase() === address.toLowerCase();
              const canClose = isOrganizer && isActive; // Organizer can close anytime

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-6 bg-card transition-all ${
                    isActive ? "border-primary/30" : "border-border"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-2xl font-heading font-semibold">
                      {session.title}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStateColor(session.state)}`}>
                      {getStateBadge(session.state)}
                    </span>
                  </div>
                  
                  <p className="text-muted-foreground mb-4">{session.description}</p>
                  
                  <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                    <span>{session.numSetups} Setups</span>
                    <span>•</span>
                    <span>Organizer: {session.organizer.slice(0, 6)}...{session.organizer.slice(-4)}</span>
                    {isActive && (
                      <>
                        <span>•</span>
                        <span>
                          {daysRemaining > 0
                            ? `Ends in ${daysRemaining} day${daysRemaining > 1 ? "s" : ""}`
                            : "Ending soon"}
                        </span>
                      </>
                    )}
                  </div>

                  {session.trackList && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Tracks: {session.trackList}
                    </p>
                  )}

                  <div className="flex gap-4 flex-wrap">
                    {canVote && !canClose && (
                      <Link
                        href={`/vote/${index}`}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
                      >
                        Vote Now →
                      </Link>
                    )}
                    {canClose && (
                      <>
                        <Link
                          href={`/vote/${index}`}
                          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
                        >
                          Vote Now →
                        </Link>
                        <button
                          onClick={() => handleCloseSession(index)}
                          disabled={isLoading}
                          className="px-6 py-3 border-2 border-warning text-warning rounded-lg hover:bg-warning hover:text-warning-foreground transition-colors font-medium disabled:opacity-50"
                        >
                          ⏸️ Close Session
                        </button>
                      </>
                    )}
                    {canViewResults && (
                      <Link
                        href={`/results/${index}`}
                        className="px-6 py-3 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors font-medium"
                      >
                        📊 View Results
                      </Link>
                    )}
                    {session.state === 0 && (
                      <span className="px-6 py-3 bg-muted text-muted-foreground rounded-lg opacity-50">
                        Draft - Not Started
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

