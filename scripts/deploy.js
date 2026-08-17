const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying PatientRecords contract...");

  const PatientRecords = await hre.ethers.getContractFactory("PatientRecords");
  const patientRecords = await PatientRecords.deploy();
  await patientRecords.waitForDeployment();

  const contractAddress = await patientRecords.getAddress();
  console.log(`PatientRecords deployed to: ${contractAddress}`);

  // Sync address and ABI to frontend artifact
  const frontendContractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }

  const contractArtifact = await hre.artifacts.readArtifact("PatientRecords");
  const exportData = {
    address: contractAddress,
    abi: contractArtifact.abi
  };

  const targetPath = path.join(frontendContractsDir, "PatientRecords.json");
  fs.writeFileSync(targetPath, JSON.stringify(exportData, null, 2));
  console.log(`Exported deployment artifact to: ${targetPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
