"use client";

import { ethers } from "ethers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";
import { VinylRigVoteAddresses } from "@/abi/VinylRigVoteAddresses";
import { VinylRigVoteABI } from "@/abi/VinylRigVoteABI";

type SessionInfo = {
  organizer: string;
  title: string;
  description: string;
  deadline: bigint;
  state: number;
  numSetups: number;
  trackList: string;
};

export const useVinylRigVote = (parameters: {
  instance: FhevmInstance | null | undefined;
  chainId: number | null | undefined;
  ethersSigner: ethers.JsonRpcSigner | null;
  ethersReadonlyProvider: ethers.ContractRunner | null;
  userAddress: string | null;
}) => {
  const { instance, chainId, ethersSigner, ethersReadonlyProvider, userAddress } = parameters;

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Get contract info
  const contractInfo = useMemo(() => {
    if (!chainId) return null;
    
    const entry = VinylRigVoteAddresses[chainId.toString() as keyof typeof VinylRigVoteAddresses];
    if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
      return null;
    }

    return {
      address: entry.address as `0x${string}`,
      abi: VinylRigVoteABI.abi,
      chainId: entry.chainId,
    };
  }, [chainId]);

  // Fetch all sessions
  const fetchSessions = useCallback(async () => {
    if (!contractInfo || !ethersReadonlyProvider) {
      setSessions([]);
      return;
    }

    setIsLoading(true);
    try {
      const contract = new ethers.Contract(
        contractInfo.address,
        contractInfo.abi,
        ethersReadonlyProvider
      );

      const sessionCount = await contract.getSessionCount();
      const sessionsData: SessionInfo[] = [];

      for (let i = 0; i < Number(sessionCount); i++) {
        const session = await contract.getSession(i);
        
        // Debug: log raw session data
        console.log(`[useVinylRigVote] Session ${i}:`, session);
        console.log(`[useVinylRigVote] State raw value:`, session.state, typeof session.state);
        
        sessionsData.push({
          organizer: session.organizer,
          title: session.title,
          description: session.description,
          deadline: session.deadline,
          state: Number(session.state), // Ensure it's converted to number
          numSetups: Number(session.numSetups),
          trackList: session.trackList,
        });
      }

      console.log("[useVinylRigVote] All sessions:", sessionsData);
      setSessions(sessionsData);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      setMessage("Failed to fetch sessions");
    } finally {
      setIsLoading(false);
    }
  }, [contractInfo, ethersReadonlyProvider]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Submit vote
  const submitVote = useCallback(
    async (
      sessionId: number,
      setupIndex: number,
      rating: number,
      tags: boolean[]
    ) => {
      // Debug: Check all requirements
      console.log("[useVinylRigVote] submitVote called with:", {
        sessionId,
        setupIndex,
        rating,
        tags,
      });
      console.log("[useVinylRigVote] Requirements check:", {
        hasInstance: !!instance,
        hasEthersSigner: !!ethersSigner,
        hasContractInfo: !!contractInfo,
        hasUserAddress: !!userAddress,
        contractInfo,
        userAddress,
      });

      if (!instance) {
        setMessage("Missing FHEVM instance - please wait for initialization");
        return false;
      }
      if (!ethersSigner) {
        setMessage("Missing wallet signer - please ensure wallet is connected");
        return false;
      }
      if (!contractInfo) {
        setMessage("Contract not deployed on this network");
        return false;
      }
      if (!userAddress) {
        setMessage("User address not available - please connect wallet");
        return false;
      }

      setIsLoading(true);
      setMessage("Encrypting vote...");

      try {
        // Add a small delay to let browser repaint (as per reference project)
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Validate instance before use
        console.log("[useVinylRigVote] Instance check:", {
          hasInstance: !!instance,
          instanceType: instance?.constructor?.name,
          contractAddress: contractInfo.address,
          userAddress,
        });

        // Create encrypted input
        console.log("[useVinylRigVote] Calling createEncryptedInput...");
        const input = instance.createEncryptedInput(contractInfo.address, userAddress);
        console.log("[useVinylRigVote] createEncryptedInput succeeded, adding values...");
        
        input.add16(rating); // euint16
        tags.forEach(tag => input.add8(tag ? 1 : 0)); // euint8[5]

        // Encrypt
        console.log("[useVinylRigVote] Calling encrypt...");
        const encrypted = await input.encrypt();
        console.log("[useVinylRigVote] Encrypt succeeded, got handles:", encrypted.handles.length);
        
        setMessage("Submitting to blockchain...");

        // Create contract instance
        const contract = new ethers.Contract(
          contractInfo.address,
          contractInfo.abi,
          ethersSigner
        );

        // Submit vote
        const tx = await contract.submitVote(
          sessionId,
          setupIndex,
          encrypted.handles[0], // rating
          [
            encrypted.handles[1], // tag 0
            encrypted.handles[2], // tag 1
            encrypted.handles[3], // tag 2
            encrypted.handles[4], // tag 3
            encrypted.handles[5], // tag 4
          ],
          encrypted.inputProof
        );

        setMessage(`Waiting for tx: ${tx.hash}`);
        await tx.wait();

        setMessage("Vote submitted successfully!");
        return true;
      } catch (error) {
        console.error("Submit vote failed:", error);
        setMessage(`Submit failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [instance, ethersSigner, contractInfo, userAddress]
  );

  // Check if user has voted
  const hasVoted = useCallback(
    async (sessionId: number, setupIndex: number): Promise<boolean> => {
      if (!contractInfo || !ethersReadonlyProvider || !userAddress) {
        return false;
      }

      try {
        const contract = new ethers.Contract(
          contractInfo.address,
          contractInfo.abi,
          ethersReadonlyProvider
        );

        return await contract.hasVoted(sessionId, setupIndex, userAddress);
      } catch {
        return false;
      }
    },
    [contractInfo, ethersReadonlyProvider, userAddress]
  );

  // Create session
  const createSession = useCallback(
    async (
      title: string,
      description: string,
      deadline: number,
      numSetups: number,
      equipmentNames: string[],
      trackList: string
    ) => {
      if (!ethersSigner || !contractInfo) {
        setMessage("Missing signer or contract");
        return false;
      }

      setIsLoading(true);
      setMessage("Creating session...");

      try {
        const contract = new ethers.Contract(
          contractInfo.address,
          contractInfo.abi,
          ethersSigner
        );

        const tx = await contract.createSession(
          title,
          description,
          deadline,
          numSetups,
          equipmentNames,
          trackList
        );

        setMessage(`Waiting for tx: ${tx.hash}`);
        await tx.wait();

        setMessage("Session created successfully!");
        await fetchSessions(); // Refresh list
        return true;
      } catch (error) {
        console.error("Create session failed:", error);
        setMessage(`Create failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [ethersSigner, contractInfo, fetchSessions]
  );

  // Close session (organizer only, after deadline)
  const closeSession = useCallback(
    async (sessionId: number) => {
      if (!ethersSigner || !contractInfo) {
        setMessage("Missing signer or contract info");
        return false;
      }

      setIsLoading(true);
      setMessage("Closing session...");

      try {
        const contract = new ethers.Contract(
          contractInfo.address,
          contractInfo.abi,
          ethersSigner
        );

        const tx = await contract.closeSession(sessionId);
        setMessage(`Waiting for tx: ${tx.hash}`);
        await tx.wait();

        setMessage("Session closed successfully!");
        await fetchSessions(); // Refresh list
        return true;
      } catch (error) {
        console.error("Close session failed:", error);
        setMessage(`Close failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [ethersSigner, contractInfo, fetchSessions]
  );

  // Reveal equipment names (organizer only, after session closed)
  const revealEquipment = useCallback(
    async (sessionId: number) => {
      if (!ethersSigner || !contractInfo) {
        setMessage("Missing signer or contract info");
        return false;
      }

      setIsLoading(true);
      setMessage("Revealing equipment names...");

      try {
        const contract = new ethers.Contract(
          contractInfo.address,
          contractInfo.abi,
          ethersSigner
        );

        const tx = await contract.revealEquipment(sessionId);
        setMessage(`Waiting for tx: ${tx.hash}`);
        await tx.wait();

        setMessage("Equipment names revealed!");
        await fetchSessions(); // Refresh list
        return true;
      } catch (error) {
        console.error("Reveal equipment failed:", error);
        setMessage(`Reveal failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [ethersSigner, contractInfo, fetchSessions]
  );

  // Request decryption authorization (organizer only)
  const requestDecryption = useCallback(
    async (sessionId: number) => {
      if (!ethersSigner || !contractInfo) {
        setMessage("Missing signer or contract info");
        return false;
      }

      setIsLoading(true);
      setMessage("Requesting decryption authorization...");

      try {
        const contract = new ethers.Contract(
          contractInfo.address,
          contractInfo.abi,
          ethersSigner
        );

        const tx = await contract.requestOrganizerDecryption(sessionId);
        setMessage(`Waiting for tx: ${tx.hash}`);
        await tx.wait();

        setMessage("Decryption authorization granted!");
        return true;
      } catch (error) {
        console.error("Request decryption failed:", error);
        setMessage(`Request failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [ethersSigner, contractInfo]
  );

  // Get aggregated encrypted handles for decryption
  const getAggregatedHandles = useCallback(
    async (sessionId: number) => {
      if (!ethersReadonlyProvider || !contractInfo) {
        console.error("Missing provider or contract info");
        return [];
      }

      try {
        const contract = new ethers.Contract(
          contractInfo.address,
          contractInfo.abi,
          ethersReadonlyProvider
        );

        const session = await contract.getSession(sessionId);
        const numSetups = Number(session.numSetups);

        // Try to get equipment names (only available if session is Revealed)
        let equipmentNames: string[] = [];
        try {
          equipmentNames = await contract.getEquipmentNames(sessionId);
          console.log("[getAggregatedHandles] Equipment names:", equipmentNames);
        } catch (error) {
          console.log("[getAggregatedHandles] Equipment not revealed yet, using default names");
        }

        const aggregatedData: Array<{
          setupIndex: number;
          equipmentName: string;
          contractAddress: string;
          ratingHandle: string;
          tagHandles: string[];
          voteCount: number;
        }> = [];

        for (let i = 0; i < numSetups; i++) {
          // Get vote count
          const voteCount = Number(await contract.getVoteCount(sessionId, i));
          
          if (voteCount === 0) {
            console.log(`[getAggregatedHandles] Setup ${i} has no votes, skipping`);
            continue;
          }

          // Get encrypted handles using contract getter methods
          const ratingHandle = await contract.getSessionTotal(sessionId, i).catch(() => ethers.ZeroHash);
          const tagHandles: string[] = [];
          
          for (let j = 0; j < 5; j++) {
            const tagHandle = await contract.getTagTotal(sessionId, i, j).catch(() => ethers.ZeroHash);
            tagHandles.push(tagHandle);
          }

          aggregatedData.push({
            setupIndex: i,
            equipmentName: equipmentNames[i] || `Setup ${i + 1}`,
            contractAddress: contractInfo.address,
            ratingHandle,
            tagHandles,
            voteCount,
          });
        }

        console.log("[getAggregatedHandles] Aggregated data prepared:", aggregatedData);
        return aggregatedData;
      } catch (error) {
        console.error("Get aggregated handles failed:", error);
        return [];
      }
    },
    [ethersReadonlyProvider, contractInfo]
  );

  return {
    contractAddress: contractInfo?.address,
    sessions,
    isLoading,
    message,
    submitVote,
    hasVoted,
    createSession,
    refreshSessions: fetchSessions,
    closeSession,
    revealEquipment,
    requestDecryption,
    getAggregatedHandles,
  };
};

