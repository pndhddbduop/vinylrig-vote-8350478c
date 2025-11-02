"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useFhevm } from "@/fhevm/useFhevm";
import { useVinylRigVote } from "@/hooks/useVinylRigVote";
import { Navigation } from "@/components/Navigation";

export default function CreateSessionPage() {
  const router = useRouter();
  const { isConnected, connect, address, chainId, signer, browserProvider, eip1193Provider } = useWallet();
  
  // Auto-initializing FHEVM instance
  const { instance } = useFhevm({
    provider: eip1193Provider,
    chainId,
    enabled: isConnected,
  });

  const { createSession, message, isLoading } = useVinylRigVote({
    instance,
    chainId,
    ethersSigner: signer,
    ethersReadonlyProvider: browserProvider,
    userAddress: address,
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    deadlineDays: 7,
    numSetups: 3,
    trackList: "",
  });

  const [equipmentNames, setEquipmentNames] = useState<string[]>(["", "", ""]);

  useEffect(() => {
    // Adjust equipment names array when numSetups changes
    setEquipmentNames(Array(formData.numSetups).fill("").map((_, i) => equipmentNames[i] || ""));
  }, [formData.numSetups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      alert("Please enter a session title");
      return;
    }

    if (formData.numSetups < 2 || formData.numSetups > 10) {
      alert("Number of setups must be between 2 and 10");
      return;
    }

    // Check all equipment names are filled
    const allFilled = equipmentNames.every(name => name.trim() !== "");
    if (!allFilled) {
      alert("Please fill in all equipment names");
      return;
    }

    // Calculate deadline timestamp (current time + days)
    const deadlineTimestamp = Math.floor(Date.now() / 1000) + (formData.deadlineDays * 24 * 60 * 60);

    const success = await createSession(
      formData.title,
      formData.description,
      deadlineTimestamp,
      formData.numSetups,
      equipmentNames,
      formData.trackList
    );

    if (success) {
      router.push("/sessions");
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-heading font-bold mb-4">Connect Wallet Required</h2>
          <p className="text-muted-foreground mb-6">
            Please connect your wallet to create a session
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-heading font-bold mb-8">Create Listening Session</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Details */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-heading font-semibold mb-4">Session Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Title <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Spring 2025 Cartridge Shootout"
                  maxLength={100}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">{formData.title.length}/100</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the listening test..."
                  maxLength={500}
                  rows={3}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">{formData.description.length}/500</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Voting Deadline (days from now)
                  </label>
                  <input
                    type="number"
                    value={formData.deadlineDays}
                    onChange={(e) => setFormData({ ...formData, deadlineDays: parseInt(e.target.value) })}
                    min="1"
                    max="365"
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Number of Setups <span className="text-error">*</span>
                  </label>
                  <select
                    value={formData.numSetups}
                    onChange={(e) => setFormData({ ...formData, numSetups: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n}>
                        {n} Setups
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Equipment Setups */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-heading font-semibold mb-4">Equipment Setups</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter actual equipment names (hidden until you reveal them after session closes)
            </p>

            <div className="space-y-3">
              {equipmentNames.map((name, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium mb-2">
                    Setup {String.fromCharCode(65 + index)} <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const newNames = [...equipmentNames];
                      newNames[index] = e.target.value;
                      setEquipmentNames(newNames);
                    }}
                    placeholder="e.g., Ortofon 2M Black + Pro-Ject Phono Box + Cambridge Audio CXA81"
                    className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Track List (Optional) */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-heading font-semibold mb-4">Track List (Optional)</h2>
            <textarea
              value={formData.trackList}
              onChange={(e) => setFormData({ ...formData, trackList: e.target.value })}
              placeholder="Comma-separated track list, e.g., Track 1, Track 2, Track 3"
              rows={2}
              className="w-full px-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Message display */}
          {message && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-mono">{message}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating Session..." : "Create Session"}
          </button>
        </form>
      </div>
    </div>
  );
}

