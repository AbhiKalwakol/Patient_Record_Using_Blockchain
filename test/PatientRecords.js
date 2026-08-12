const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PatientRecords Contract", function () {
  let patientRecords;
  let owner;
  let patient1;
  let patient2;

  beforeEach(async function () {
    [owner, patient1, patient2] = await ethers.getSigners();
    const PatientRecords = await ethers.getContractFactory("PatientRecords");
    patientRecords = await PatientRecords.deploy();
  });

  describe("Deployment", function () {
    it("should deploy with initial record count of 0 for any address", async function () {
      expect(await patientRecords.getRecordCount(patient1.address)).to.equal(0);
      const records = await patientRecords.getRecords(patient1.address);
      expect(records.length).to.equal(0);
    });
  });

  describe("addRecord", function () {
    const sampleHash = ethers.keccak256(ethers.toUtf8Bytes("Sample Medical Document"));
    const docType = "Lab report";

    it("should allow a patient to seal a medical record hash", async function () {
      const tx = await patientRecords.connect(patient1).addRecord(sampleHash, docType);
      await tx.wait();

      expect(await patientRecords.getRecordCount(patient1.address)).to.equal(1);
      const records = await patientRecords.getRecords(patient1.address);
      expect(records.length).to.equal(1);
      expect(records[0].contentHash).to.equal(sampleHash);
      expect(records[0].docType).to.equal(docType);
      expect(records[0].uploader).to.equal(patient1.address);
      expect(records[0].timestamp).to.be.gt(0);
    });

    it("should emit RecordAdded event with expected arguments", async function () {
      await expect(patientRecords.connect(patient1).addRecord(sampleHash, docType))
        .to.emit(patientRecords, "RecordAdded")
        .withArgs(patient1.address, sampleHash, docType, (val) => val > 0n);
    });

    it("should revert if hash is bytes32(0)", async function () {
      await expect(
        patientRecords.connect(patient1).addRecord(ethers.ZeroHash, docType)
      ).to.be.revertedWith("Invalid hash");
    });

    it("should revert if document type is empty", async function () {
      await expect(
        patientRecords.connect(patient1).addRecord(sampleHash, "")
      ).to.be.revertedWith("Document type required");
    });

    it("should keep patient records partitioned and isolated", async function () {
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes("Doc 1"));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("Doc 2"));

      await patientRecords.connect(patient1).addRecord(hash1, "Prescription");
      await patientRecords.connect(patient2).addRecord(hash2, "Discharge summary");

      const records1 = await patientRecords.getRecords(patient1.address);
      const records2 = await patientRecords.getRecords(patient2.address);

      expect(records1.length).to.equal(1);
      expect(records1[0].contentHash).to.equal(hash1);
      expect(records1[0].docType).to.equal("Prescription");

      expect(records2.length).to.equal(1);
      expect(records2[0].contentHash).to.equal(hash2);
      expect(records2[0].docType).to.equal("Discharge summary");
    });

    it("should support multiple records for the same patient", async function () {
      const hashA = ethers.keccak256(ethers.toUtf8Bytes("Report A"));
      const hashB = ethers.keccak256(ethers.toUtf8Bytes("Report B"));

      await patientRecords.connect(patient1).addRecord(hashA, "Lab report");
      await patientRecords.connect(patient1).addRecord(hashB, "Prescription");

      expect(await patientRecords.getRecordCount(patient1.address)).to.equal(2);
      const records = await patientRecords.getRecords(patient1.address);
      expect(records.length).to.equal(2);
      expect(records[0].contentHash).to.equal(hashA);
      expect(records[1].contentHash).to.equal(hashB);
    });
  });
});
