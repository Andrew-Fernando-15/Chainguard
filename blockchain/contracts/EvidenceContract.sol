// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title EvidenceContract
/// @notice Stores a tamper-proof record of digital evidence hashes and their
/// chain-of-custody events. Once a hash is written, it cannot be altered —
/// only new custody events can be appended.
contract EvidenceContract {
    struct Evidence {
        string caseId;
        string fileHash;    // SHA-256 hash computed in the browser
        address uploadedBy; // wallet address that submitted it
        uint256 timestamp;
        bool exists;
    }

    struct CustodyEvent {
        string action;      // e.g. "uploaded", "viewed", "transferred"
        address actor;
        uint256 timestamp;
    }

    // evidenceId => Evidence record
    mapping(uint256 => Evidence) public evidenceRecords;

    // evidenceId => list of custody events
    mapping(uint256 => CustodyEvent[]) private custodyLog;

    uint256 public evidenceCount;

    event EvidenceAdded(uint256 indexed evidenceId, string caseId, string fileHash, address indexed uploadedBy);
    event CustodyLogged(uint256 indexed evidenceId, string action, address indexed actor);

    /// @notice Add a new piece of evidence to the chain. Returns the new evidenceId.
    function addEvidence(string memory caseId, string memory fileHash) external returns (uint256) {
        evidenceCount++;
        uint256 evidenceId = evidenceCount;

        evidenceRecords[evidenceId] = Evidence({
            caseId: caseId,
            fileHash: fileHash,
            uploadedBy: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        custodyLog[evidenceId].push(CustodyEvent({
            action: "uploaded",
            actor: msg.sender,
            timestamp: block.timestamp
        }));

        emit EvidenceAdded(evidenceId, caseId, fileHash, msg.sender);
        return evidenceId;
    }

    /// @notice Fetch a stored evidence record.
    function getEvidence(uint256 evidenceId)
        external
        view
        returns (string memory caseId, string memory fileHash, address uploadedBy, uint256 timestamp)
    {
        require(evidenceRecords[evidenceId].exists, "Evidence does not exist");
        Evidence memory e = evidenceRecords[evidenceId];
        return (e.caseId, e.fileHash, e.uploadedBy, e.timestamp);
    }

    /// @notice Re-hash a file and compare it to what's on-chain, to verify it hasn't been tampered with.
    function verifyEvidence(uint256 evidenceId, string memory currentHash) external view returns (bool) {
        require(evidenceRecords[evidenceId].exists, "Evidence does not exist");
        return keccak256(bytes(evidenceRecords[evidenceId].fileHash)) == keccak256(bytes(currentHash));
    }

    /// @notice Append a chain-of-custody event (e.g. someone viewed or transferred the evidence).
    function logCustodyEvent(uint256 evidenceId, string memory action) external {
        require(evidenceRecords[evidenceId].exists, "Evidence does not exist");
        custodyLog[evidenceId].push(CustodyEvent({
            action: action,
            actor: msg.sender,
            timestamp: block.timestamp
        }));
        emit CustodyLogged(evidenceId, action, msg.sender);
    }

    /// @notice Get the full custody history for a piece of evidence.
    function getCustodyLog(uint256 evidenceId) external view returns (CustodyEvent[] memory) {
        require(evidenceRecords[evidenceId].exists, "Evidence does not exist");
        return custodyLog[evidenceId];
    }
}
