// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint16, euint8, externalEuint16, externalEuint8, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title VinylRig Vote - Anonymous Blind Listening Vote for Vinyl Enthusiasts
/// @author VinylRig Vote Team
/// @notice Privacy-preserving voting dApp for audiophile equipment blind testing sessions
/// @dev Uses FHEVM for encrypted vote aggregation
contract VinylRigVote is ZamaEthereumConfig {
    // Session states
    enum SessionState {
        Draft,      // 0 - Initial state
        Active,     // 1 - Voting open
        Closed,     // 2 - Voting closed, can compute rankings
        Revealed    // 3 - Equipment names revealed
    }

    // Vote structure for individual voter
    struct Vote {
        euint16 rating;         // Encrypted rating (1-10)
        euint8[5] tags;         // Encrypted preference tags [Bass, Midrange, Treble, Soundstage, Detail]
        bool submitted;         // Has this vote been submitted
    }

    // Session structure
    struct Session {
        address organizer;      // Session creator
        string title;           // Session title
        string description;     // Session description
        uint256 deadline;       // Voting deadline timestamp
        SessionState state;     // Current state
        uint8 numSetups;        // Number of equipment setups (2-10)
        string[] equipmentNames; // Actual equipment names (hidden until revealed)
        string trackList;       // Optional track list
    }

    // State variables
    uint256 private _sessionCounter;
    
    // sessionId => Session
    mapping(uint256 => Session) private _sessions;
    
    // sessionId => setupIndex => voterAddress => Vote
    mapping(uint256 => mapping(uint8 => mapping(address => Vote))) private _votes;
    
    // sessionId => setupIndex => aggregated euint16 rating
    mapping(uint256 => mapping(uint8 => euint16)) private _sessionTotals;
    
    // sessionId => setupIndex => aggregated euint8[5] tags
    mapping(uint256 => mapping(uint8 => euint8[5])) private _tagTotals;
    
    // sessionId => setupIndex => vote count (public)
    mapping(uint256 => mapping(uint8 => uint16)) private _voteCounts;
    
    // sessionId => setupIndex => decrypted score (public after decryption)
    mapping(uint256 => mapping(uint8 => uint16)) private _decryptedResults;
    
    // sessionId => setupIndex => decrypted tag counts (public after decryption)
    mapping(uint256 => mapping(uint8 => uint8[5])) private _decryptedTagCounts;
    
    // sessionId => bool (has decryption been requested)
    mapping(uint256 => bool) private _decryptionRequested;

    // Events
    event SessionCreated(uint256 indexed sessionId, address indexed organizer, uint256 deadline);
    event SessionClosed(uint256 indexed sessionId);
    event EquipmentRevealed(uint256 indexed sessionId);
    event VoteSubmitted(uint256 indexed sessionId, uint8 setupIndex, address indexed voter);
    event RankingsComputed(uint256 indexed sessionId);
    event DecryptionRequested(uint256 indexed sessionId);
    event ResultDecrypted(uint256 indexed sessionId, uint8 setupIndex, uint16 decryptedTotal);

    // Modifiers
    modifier onlyOrganizer(uint256 sessionId) {
        require(_sessions[sessionId].organizer == msg.sender, "Not session organizer");
        _;
    }

    modifier onlyActiveSession(uint256 sessionId) {
        require(_sessions[sessionId].state == SessionState.Active, "Session not active");
        require(block.timestamp <= _sessions[sessionId].deadline, "Voting deadline passed");
        _;
    }

    modifier onlyClosedSession(uint256 sessionId) {
        require(_sessions[sessionId].state == SessionState.Closed, "Session not closed");
        _;
    }

    modifier sessionExists(uint256 sessionId) {
        require(_sessions[sessionId].organizer != address(0), "Session does not exist");
        _;
    }

    /// @notice Creates a new listening session
    /// @param title Session title
    /// @param description Session description
    /// @param deadline Voting deadline timestamp
    /// @param numSetups Number of equipment setups (2-10)
    /// @param equipmentNames Array of actual equipment names (hidden until revealed)
    /// @param trackList Optional comma-separated track list
    /// @return sessionId The ID of the newly created session
    function createSession(
        string calldata title,
        string calldata description,
        uint256 deadline,
        uint8 numSetups,
        string[] calldata equipmentNames,
        string calldata trackList
    ) external returns (uint256) {
        require(deadline > block.timestamp, "Deadline must be in future");
        require(numSetups >= 2 && numSetups <= 10, "Number of setups must be 2-10");
        require(equipmentNames.length == numSetups, "Equipment names length mismatch");

        uint256 sessionId = _sessionCounter++;

        _sessions[sessionId] = Session({
            organizer: msg.sender,
            title: title,
            description: description,
            deadline: deadline,
            state: SessionState.Active,
            numSetups: numSetups,
            equipmentNames: equipmentNames,
            trackList: trackList
        });

        emit SessionCreated(sessionId, msg.sender, deadline);
        return sessionId;
    }

    /// @notice Submits an encrypted vote for a specific setup in a session
    /// @param sessionId The session ID
    /// @param setupIndex The setup index (0-based)
    /// @param inputRating External encrypted rating (1-10)
    /// @param inputTags External encrypted preference tags (5 elements)
    /// @param inputProof Input proof for encryption
    function submitVote(
        uint256 sessionId,
        uint8 setupIndex,
        externalEuint16 inputRating,
        externalEuint8[5] calldata inputTags,
        bytes calldata inputProof
    ) external sessionExists(sessionId) onlyActiveSession(sessionId) {
        require(setupIndex < _sessions[sessionId].numSetups, "Invalid setup index");
        require(!_votes[sessionId][setupIndex][msg.sender].submitted, "Already voted for this setup");

        // Convert external encrypted inputs to internal encrypted types
        euint16 encryptedRating = FHE.fromExternal(inputRating, inputProof);
        euint8[5] memory encryptedTags;
        for (uint8 i = 0; i < 5; i++) {
            encryptedTags[i] = FHE.fromExternal(inputTags[i], inputProof);
        }

        // Store individual vote
        _votes[sessionId][setupIndex][msg.sender] = Vote({
            rating: encryptedRating,
            tags: encryptedTags,
            submitted: true
        });

        // Aggregate to session totals
        if (_voteCounts[sessionId][setupIndex] == 0) {
            // First vote for this setup
            _sessionTotals[sessionId][setupIndex] = encryptedRating;
            for (uint8 i = 0; i < 5; i++) {
                _tagTotals[sessionId][setupIndex][i] = encryptedTags[i];
            }
        } else {
            // Add to existing totals
            _sessionTotals[sessionId][setupIndex] = FHE.add(
                _sessionTotals[sessionId][setupIndex],
                encryptedRating
            );
            for (uint8 i = 0; i < 5; i++) {
                _tagTotals[sessionId][setupIndex][i] = FHE.add(
                    _tagTotals[sessionId][setupIndex][i],
                    encryptedTags[i]
                );
            }
        }

        _voteCounts[sessionId][setupIndex]++;

        // Allow voter and contract to access their vote
        FHE.allow(encryptedRating, msg.sender);
        FHE.allowThis(encryptedRating);
        for (uint8 i = 0; i < 5; i++) {
            FHE.allow(encryptedTags[i], msg.sender);
            FHE.allowThis(encryptedTags[i]);
        }

        // Allow contract to access aggregated totals
        FHE.allowThis(_sessionTotals[sessionId][setupIndex]);
        for (uint8 i = 0; i < 5; i++) {
            FHE.allowThis(_tagTotals[sessionId][setupIndex][i]);
        }

        emit VoteSubmitted(sessionId, setupIndex, msg.sender);
    }

    /// @notice Closes a session (organizer can close anytime)
    /// @param sessionId The session ID
    function closeSession(uint256 sessionId) 
        external 
        sessionExists(sessionId) 
        onlyOrganizer(sessionId) 
    {
        require(_sessions[sessionId].state == SessionState.Active, "Session not active");
        // Deadline check removed - organizer can close anytime

        _sessions[sessionId].state = SessionState.Closed;
        emit SessionClosed(sessionId);
    }

    /// @notice Computes rankings using encrypted comparison (placeholder for future implementation)
    /// @param sessionId The session ID
    /// @dev In production, this would use FHE.gt to compare encrypted totals
    function computeRankings(uint256 sessionId) 
        external 
        sessionExists(sessionId) 
        onlyClosedSession(sessionId) 
    {
        // Placeholder: In a full implementation, we would use FHE.gt/lt to compare
        // encrypted totals and determine ranking order without decrypting
        // For now, we just emit the event to indicate computation trigger
        emit RankingsComputed(sessionId);
    }

    /// @notice Requests decryption of aggregated results (organizer only)
    /// @param sessionId The session ID
    /// @dev Authorizes organizer to decrypt all aggregated totals
    function requestOrganizerDecryption(uint256 sessionId) 
        external 
        sessionExists(sessionId) 
        onlyOrganizer(sessionId) 
        onlyClosedSession(sessionId) 
    {
        require(!_decryptionRequested[sessionId], "Decryption already requested");

        // Allow organizer and contract to read all aggregated totals
        for (uint8 i = 0; i < _sessions[sessionId].numSetups; i++) {
            if (_voteCounts[sessionId][i] > 0) {
                // Authorize organizer to decrypt
                FHE.allow(_sessionTotals[sessionId][i], msg.sender);
                FHE.allowThis(_sessionTotals[sessionId][i]);
                
                for (uint8 j = 0; j < 5; j++) {
                    FHE.allow(_tagTotals[sessionId][i][j], msg.sender);
                    FHE.allowThis(_tagTotals[sessionId][i][j]);
                }
            }
        }

        _decryptionRequested[sessionId] = true;
        emit DecryptionRequested(sessionId);
    }

    /// @notice Reveals actual equipment names after session closed
    /// @param sessionId The session ID
    function revealEquipment(uint256 sessionId) 
        external 
        sessionExists(sessionId) 
        onlyOrganizer(sessionId) 
    {
        require(
            _sessions[sessionId].state == SessionState.Closed,
            "Session must be closed first"
        );

        _sessions[sessionId].state = SessionState.Revealed;
        emit EquipmentRevealed(sessionId);
    }

    /// @notice Returns encrypted vote handles for a user
    /// @param sessionId The session ID
    /// @param setupIndex The setup index
    /// @param userAddress The voter address
    /// @return rating Encrypted rating handle
    /// @return tags Array of encrypted tag handles
    function getUserVote(uint256 sessionId, uint8 setupIndex, address userAddress) 
        external 
        view 
        sessionExists(sessionId)
        returns (euint16 rating, euint8[5] memory tags) 
    {
        // Only allow user to view their own votes
        require(msg.sender == userAddress, "Can only view own votes");
        require(_votes[sessionId][setupIndex][userAddress].submitted, "No vote found");

        Vote storage vote = _votes[sessionId][setupIndex][userAddress];
        return (vote.rating, vote.tags);
    }

    /// @notice Returns session information
    /// @param sessionId The session ID
    /// @return organizer Session organizer address
    /// @return title Session title
    /// @return description Session description
    /// @return deadline Voting deadline
    /// @return state Session state
    /// @return numSetups Number of setups
    /// @return trackList Track list
    function getSession(uint256 sessionId) 
        external 
        view 
        sessionExists(sessionId)
        returns (
            address organizer,
            string memory title,
            string memory description,
            uint256 deadline,
            SessionState state,
            uint8 numSetups,
            string memory trackList
        ) 
    {
        Session storage session = _sessions[sessionId];
        return (
            session.organizer,
            session.title,
            session.description,
            session.deadline,
            session.state,
            session.numSetups,
            session.trackList
        );
    }

    /// @notice Returns equipment names (only if revealed)
    /// @param sessionId The session ID
    /// @return equipmentNames Array of equipment names
    function getEquipmentNames(uint256 sessionId) 
        external 
        view 
        sessionExists(sessionId)
        returns (string[] memory) 
    {
        require(
            _sessions[sessionId].state == SessionState.Revealed,
            "Equipment not yet revealed"
        );
        return _sessions[sessionId].equipmentNames;
    }

    /// @notice Returns vote count for a specific setup
    /// @param sessionId The session ID
    /// @param setupIndex The setup index
    /// @return count Number of votes
    function getVoteCount(uint256 sessionId, uint8 setupIndex) 
        external 
        view 
        sessionExists(sessionId)
        returns (uint16) 
    {
        return _voteCounts[sessionId][setupIndex];
    }

    /// @notice Returns the current session counter
    /// @return Current session counter value
    function getSessionCount() external view returns (uint256) {
        return _sessionCounter;
    }

    /// @notice Checks if a user has voted for a specific setup
    /// @param sessionId The session ID
    /// @param setupIndex The setup index
    /// @param userAddress The voter address
    /// @return hasVoted True if user has voted
    function hasVoted(uint256 sessionId, uint8 setupIndex, address userAddress) 
        external 
        view 
        returns (bool) 
    {
        return _votes[sessionId][setupIndex][userAddress].submitted;
    }

    /// @notice Checks if address is the session organizer
    /// @param sessionId The session ID
    /// @param addr Address to check
    /// @return True if address is organizer
    function isOrganizer(uint256 sessionId, address addr) 
        external 
        view 
        sessionExists(sessionId)
        returns (bool) 
    {
        return _sessions[sessionId].organizer == addr;
    }

    /// @notice Returns the session state
    /// @param sessionId The session ID
    /// @return state The session state (0=Draft, 1=Active, 2=Closed, 3=Revealed)
    function getSessionState(uint256 sessionId) 
        external 
        view 
        sessionExists(sessionId)
        returns (uint8) 
    {
        return uint8(_sessions[sessionId].state);
    }

    /// @notice Returns decryption status
    /// @param sessionId The session ID
    /// @return requested True if decryption has been requested
    function isDecryptionRequested(uint256 sessionId) 
        external 
        view 
        sessionExists(sessionId)
        returns (bool) 
    {
        return _decryptionRequested[sessionId];
    }

    /// @notice Returns the encrypted aggregated rating total for a setup
    /// @param sessionId The session ID
    /// @param setupIndex The setup index
    /// @return Encrypted rating total handle
    function getSessionTotal(uint256 sessionId, uint8 setupIndex) 
        external 
        view 
        sessionExists(sessionId)
        returns (euint16) 
    {
        require(setupIndex < _sessions[sessionId].numSetups, "Invalid setup index");
        return _sessionTotals[sessionId][setupIndex];
    }

    /// @notice Returns the encrypted aggregated tag total for a setup
    /// @param sessionId The session ID
    /// @param setupIndex The setup index
    /// @param tagIndex The tag index (0-4)
    /// @return Encrypted tag total handle
    function getTagTotal(uint256 sessionId, uint8 setupIndex, uint8 tagIndex) 
        external 
        view 
        sessionExists(sessionId)
        returns (euint8) 
    {
        require(setupIndex < _sessions[sessionId].numSetups, "Invalid setup index");
        require(tagIndex < 5, "Invalid tag index");
        return _tagTotals[sessionId][setupIndex][tagIndex];
    }
}

