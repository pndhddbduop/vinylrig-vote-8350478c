import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { VinylRigVote, VinylRigVote__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  organizer: HardhatEthersSigner;
  voter1: HardhatEthersSigner;
  voter2: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("VinylRigVote")) as VinylRigVote__factory;
  const contract = (await factory.deploy()) as VinylRigVote;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("VinylRigVote", function () {
  let signers: Signers;
  let contract: VinylRigVote;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      organizer: ethSigners[1],
      voter1: ethSigners[2],
      voter2: ethSigners[3],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("Session Management", function () {
    it("should create a new session", async function () {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const equipmentNames = ["Setup A Equipment", "Setup B Equipment", "Setup C Equipment"];

      const tx = await contract
        .connect(signers.organizer)
        .createSession(
          "Spring 2025 Cartridge Shootout",
          "Blind test of 3 high-end cartridges",
          futureTimestamp,
          3,
          equipmentNames,
          "Track 1, Track 2, Track 3",
        );

      await tx.wait();

      const sessionCount = await contract.getSessionCount();
      expect(sessionCount).to.eq(1n);

      const session = await contract.getSession(0);
      expect(session.organizer).to.eq(signers.organizer.address);
      expect(session.title).to.eq("Spring 2025 Cartridge Shootout");
      expect(session.state).to.eq(1); // Active
      expect(session.numSetups).to.eq(3);
    });

    it("should not create session with past deadline", async function () {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const equipmentNames = ["Setup A", "Setup B"];

      await expect(
        contract
          .connect(signers.organizer)
          .createSession("Test Session", "Description", pastTimestamp, 2, equipmentNames, ""),
      ).to.be.revertedWith("Deadline must be in future");
    });

    it("should not create session with invalid number of setups", async function () {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      const equipmentNames = ["Setup A"];

      await expect(
        contract
          .connect(signers.organizer)
          .createSession("Test Session", "Description", futureTimestamp, 1, equipmentNames, ""),
      ).to.be.revertedWith("Number of setups must be 2-10");
    });

    it("should close session after deadline", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const currentBlockTime = latestBlock!.timestamp;
      const shortDeadline = currentBlockTime + 100;
      const equipmentNames = ["Setup A", "Setup B"];

      const createTx = await contract
        .connect(signers.organizer)
        .createSession("Test Session", "Description", shortDeadline, 2, equipmentNames, "");
      await createTx.wait();

      // Increase time to pass deadline
      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      const closeTx = await contract.connect(signers.organizer).closeSession(0);
      await closeTx.wait();

      const session = await contract.getSession(0);
      expect(session.state).to.eq(2); // Closed
    });

    it("should reveal equipment after session closed", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const currentBlockTime = latestBlock!.timestamp;
      const shortDeadline = currentBlockTime + 100;
      const equipmentNames = ["Ortofon 2M Black", "Denon DL-103"];

      const createTx = await contract
        .connect(signers.organizer)
        .createSession("Test Session", "Description", shortDeadline, 2, equipmentNames, "");
      await createTx.wait();

      // Increase time to pass deadline
      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      const closeTx = await contract.connect(signers.organizer).closeSession(0);
      await closeTx.wait();

      // Reveal equipment
      const revealTx = await contract.connect(signers.organizer).revealEquipment(0);
      await revealTx.wait();

      const session = await contract.getSession(0);
      expect(session.state).to.eq(3); // Revealed

      const revealed = await contract.getEquipmentNames(0);
      expect(revealed[0]).to.eq("Ortofon 2M Black");
      expect(revealed[1]).to.eq("Denon DL-103");
    });
  });

  describe("Voting", function () {
    let sessionId: number;

    beforeEach(async function () {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      const equipmentNames = ["Setup A", "Setup B"];

      const tx = await contract
        .connect(signers.organizer)
        .createSession("Voting Test Session", "Test voting", futureTimestamp, 2, equipmentNames, "");
      await tx.wait();

      sessionId = 0;
    });

    it("should submit encrypted vote", async function () {
      const rating = 8; // Rating value 1-10
      const tags = [1, 0, 1, 1, 0]; // Bass, No Midrange, Treble, Soundstage, No Detail

      // Create encrypted input
      const encryptedInput = fhevm.createEncryptedInput(contractAddress, signers.voter1.address);
      encryptedInput.add16(rating);
      for (const tag of tags) {
        encryptedInput.add8(tag);
      }
      const encrypted = await encryptedInput.encrypt();

      // Submit vote (rating handle + 5 tag handles)
      const tx = await contract
        .connect(signers.voter1)
        .submitVote(
          sessionId,
          0, // Setup index
          encrypted.handles[0], // Rating
          [
            encrypted.handles[1],
            encrypted.handles[2],
            encrypted.handles[3],
            encrypted.handles[4],
            encrypted.handles[5],
          ], // Tags
          encrypted.inputProof,
        );

      await tx.wait();

      // Check vote was recorded
      const hasVoted = await contract.hasVoted(sessionId, 0, signers.voter1.address);
      expect(hasVoted).to.be.true;

      const voteCount = await contract.getVoteCount(sessionId, 0);
      expect(voteCount).to.eq(1);
    });

    it("should not allow double voting on same setup", async function () {
      const rating = 7;
      const tags = [1, 1, 0, 0, 1];

      const encryptedInput = fhevm.createEncryptedInput(contractAddress, signers.voter1.address);
      encryptedInput.add16(rating);
      for (const tag of tags) {
        encryptedInput.add8(tag);
      }
      const encrypted = await encryptedInput.encrypt();

      // First vote
      const tx1 = await contract
        .connect(signers.voter1)
        .submitVote(
          sessionId,
          0,
          encrypted.handles[0],
          [
            encrypted.handles[1],
            encrypted.handles[2],
            encrypted.handles[3],
            encrypted.handles[4],
            encrypted.handles[5],
          ],
          encrypted.inputProof,
        );
      await tx1.wait();

      // Try to vote again
      await expect(
        contract
          .connect(signers.voter1)
          .submitVote(
            sessionId,
            0,
            encrypted.handles[0],
            [
              encrypted.handles[1],
              encrypted.handles[2],
              encrypted.handles[3],
              encrypted.handles[4],
              encrypted.handles[5],
            ],
            encrypted.inputProof,
          ),
      ).to.be.revertedWith("Already voted for this setup");
    });

    it("should aggregate multiple votes", async function () {
      // Voter 1 votes
      const rating1 = 8;
      const tags1 = [1, 0, 1, 0, 1];

      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add16(rating1)
        .add8(tags1[0])
        .add8(tags1[1])
        .add8(tags1[2])
        .add8(tags1[3])
        .add8(tags1[4])
        .encrypt();

      const tx1 = await contract
        .connect(signers.voter1)
        .submitVote(
          sessionId,
          0,
          encrypted1.handles[0],
          [
            encrypted1.handles[1],
            encrypted1.handles[2],
            encrypted1.handles[3],
            encrypted1.handles[4],
            encrypted1.handles[5],
          ],
          encrypted1.inputProof,
        );
      await tx1.wait();

      // Voter 2 votes
      const rating2 = 6;
      const tags2 = [0, 1, 1, 1, 0];

      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter2.address)
        .add16(rating2)
        .add8(tags2[0])
        .add8(tags2[1])
        .add8(tags2[2])
        .add8(tags2[3])
        .add8(tags2[4])
        .encrypt();

      const tx2 = await contract
        .connect(signers.voter2)
        .submitVote(
          sessionId,
          0,
          encrypted2.handles[0],
          [
            encrypted2.handles[1],
            encrypted2.handles[2],
            encrypted2.handles[3],
            encrypted2.handles[4],
            encrypted2.handles[5],
          ],
          encrypted2.inputProof,
        );
      await tx2.wait();

      // Check vote counts
      const voteCount = await contract.getVoteCount(sessionId, 0);
      expect(voteCount).to.eq(2);

      // Both voters should have voted
      expect(await contract.hasVoted(sessionId, 0, signers.voter1.address)).to.be.true;
      expect(await contract.hasVoted(sessionId, 0, signers.voter2.address)).to.be.true;
    });

    it("should retrieve user's own vote", async function () {
      const rating = 9;
      const tags = [1, 1, 1, 0, 0];

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add16(rating)
        .add8(tags[0])
        .add8(tags[1])
        .add8(tags[2])
        .add8(tags[3])
        .add8(tags[4])
        .encrypt();

      const tx = await contract
        .connect(signers.voter1)
        .submitVote(
          sessionId,
          0,
          encrypted.handles[0],
          [
            encrypted.handles[1],
            encrypted.handles[2],
            encrypted.handles[3],
            encrypted.handles[4],
            encrypted.handles[5],
          ],
          encrypted.inputProof,
        );
      await tx.wait();

      // Retrieve vote
      const vote = await contract.connect(signers.voter1).getUserVote(sessionId, 0, signers.voter1.address);

      // Decrypt to verify
      const decryptedRating = await fhevm.userDecryptEuint(
        FhevmType.euint16,
        vote.rating,
        contractAddress,
        signers.voter1,
      );

      expect(decryptedRating).to.eq(rating);

      // Decrypt tags
      for (let i = 0; i < 5; i++) {
        const decryptedTag = await fhevm.userDecryptEuint(
          FhevmType.euint8,
          vote.tags[i],
          contractAddress,
          signers.voter1,
        );
        expect(decryptedTag).to.eq(tags[i]);
      }
    });

    it("should not allow viewing other user's votes", async function () {
      const rating = 7;
      const tags = [1, 0, 1, 0, 1];

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add16(rating)
        .add8(tags[0])
        .add8(tags[1])
        .add8(tags[2])
        .add8(tags[3])
        .add8(tags[4])
        .encrypt();

      const tx = await contract
        .connect(signers.voter1)
        .submitVote(
          sessionId,
          0,
          encrypted.handles[0],
          [
            encrypted.handles[1],
            encrypted.handles[2],
            encrypted.handles[3],
            encrypted.handles[4],
            encrypted.handles[5],
          ],
          encrypted.inputProof,
        );
      await tx.wait();

      // Voter2 tries to view Voter1's vote
      await expect(
        contract.connect(signers.voter2).getUserVote(sessionId, 0, signers.voter1.address),
      ).to.be.revertedWith("Can only view own votes");
    });
  });

  describe("Access Control", function () {
    it("should check organizer status", async function () {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      const equipmentNames = ["Setup A", "Setup B"];

      const tx = await contract
        .connect(signers.organizer)
        .createSession("Test Session", "Description", futureTimestamp, 2, equipmentNames, "");
      await tx.wait();

      const isOrg = await contract.isOrganizer(0, signers.organizer.address);
      expect(isOrg).to.be.true;

      const isNotOrg = await contract.isOrganizer(0, signers.voter1.address);
      expect(isNotOrg).to.be.false;
    });

    it("should not allow non-organizer to close session", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const currentBlockTime = latestBlock!.timestamp;
      const shortDeadline = currentBlockTime + 100;
      const equipmentNames = ["Setup A", "Setup B"];

      const tx = await contract
        .connect(signers.organizer)
        .createSession("Test Session", "Description", shortDeadline, 2, equipmentNames, "");
      await tx.wait();

      // Increase time to pass deadline
      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      await expect(contract.connect(signers.voter1).closeSession(0)).to.be.revertedWith("Not session organizer");
    });

    it("should request organizer decryption", async function () {
      const latestBlock = await ethers.provider.getBlock("latest");
      const currentBlockTime = latestBlock!.timestamp;
      const shortDeadline = currentBlockTime + 100;
      const equipmentNames = ["Setup A", "Setup B"];

      const createTx = await contract
        .connect(signers.organizer)
        .createSession("Test Session", "Description", shortDeadline, 2, equipmentNames, "");
      await createTx.wait();

      // Submit a vote
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add16(8)
        .add8(1)
        .add8(0)
        .add8(1)
        .add8(0)
        .add8(1)
        .encrypt();

      const voteTx = await contract
        .connect(signers.voter1)
        .submitVote(
          0,
          0,
          encrypted.handles[0],
          [
            encrypted.handles[1],
            encrypted.handles[2],
            encrypted.handles[3],
            encrypted.handles[4],
            encrypted.handles[5],
          ],
          encrypted.inputProof,
        );
      await voteTx.wait();

      // Increase time to pass deadline and close session
      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      const closeTx = await contract.connect(signers.organizer).closeSession(0);
      await closeTx.wait();

      // Request decryption
      const decryptTx = await contract.connect(signers.organizer).requestOrganizerDecryption(0);
      await decryptTx.wait();

      const isRequested = await contract.isDecryptionRequested(0);
      expect(isRequested).to.be.true;
    });
  });
});

