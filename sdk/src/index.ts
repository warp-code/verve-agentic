import {
  bn,
  deriveAddress,
  Rpc,
  toAccountMetas,
} from "@lightprotocol/stateless.js";
import type {
  AccountMeta,
  PublicKey,
  Signer,
  TransactionInstruction,
} from "@solana/web3.js";
import { serialize } from "borsh";
import {
  LIGHT_ACCOUNTS,
  LIGHT_STATE_TREE_ACCOUNTS,
  PROGRAM,
  VERVE_INSTRUCTION_SCHEMA,
} from "./utils/constants";
import {
  deriveWalletAddress,
  deriveWalletGuardianSeed,
  getInstructionAccountMeta,
  getValidityProof,
  getWalletGuardianAccount,
  packWithInput,
} from "./utils/functions";
import type { VerveInstruction } from "./utils/types";

export function createWallet() {
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
