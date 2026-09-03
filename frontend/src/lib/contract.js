import { concat, keccak256, toUtf8Bytes } from "ethers";
import artifact from "../contracts/PatientRecords.json";
import { Contract } from "ethers";

export const LOCAL_CHAIN_ID = 31337n;

export function isContractConfigured() {
  return Boolean(artifact.address && artifact.abi?.length);
}

export function getContract(signerOrProvider) {
  if (!isContractConfigured()) {
    throw new Error("Contract is not deployed. Run the Hardhat deploy script.");
  }
  return new Contract(artifact.address, artifact.abi, signerOrProvider);
}

export async function hashRecord(fileBytes, ocrText) {
  return keccak256(concat([fileBytes, toUtf8Bytes(ocrText)]));
}
