// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PatientRecords
/// @notice Stores only document hashes and metadata. Scans and OCR text stay off-chain.
contract PatientRecords {
    struct Record {
        bytes32 contentHash;
        string docType;
        uint256 timestamp;
        address uploader;
    }

    mapping(address => Record[]) private records;

    event RecordAdded(
        address indexed patient,
        bytes32 indexed contentHash,
        string docType,
        uint256 timestamp
    );

    function addRecord(bytes32 contentHash, string calldata docType) external {
        require(contentHash != bytes32(0), "Invalid hash");
        require(bytes(docType).length > 0, "Document type required");

        records[msg.sender].push(
            Record({
                contentHash: contentHash,
                docType: docType,
                timestamp: block.timestamp,
                uploader: msg.sender
            })
        );

        emit RecordAdded(msg.sender, contentHash, docType, block.timestamp);
    }

    function getRecords(address patient) external view returns (Record[] memory) {
        return records[patient];
    }

    function getRecordCount(address patient) external view returns (uint256) {
        return records[patient].length;
    }
}
