import { Rpc } from "@lightprotocol/stateless.js";
import { PDA_WALLET_SEED, PROGRAM_ID } from "./utils/constants";
import { PublicKey } from "@solana/web3.js";
import { deriveAddressSeed } from "./utils/functions";

export function createWallet(rpc: Rpc, seedGuardian: PublicKey) {
  const _wallet = deriveAddressSeed(
    [PDA_WALLET_SEED, seedGuardian.toBytes()],
    PROGRAM_ID,
  )[0];

  return;
}

export function addGuardian() {
  return;
}

export function checkSplBalance() {
  return;
}

export function createTokenAccount() {
  return;
}

export function transferSol() {
  return;
}

export function transferSplToken() {
  return;
}
