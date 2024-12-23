import { verveTools } from "./chat";
import {
  checkSolBalance,
  checkSplBalance,
  createTokenAccount,
  createWallet,
  transferSplToken,
  addGuardian,
  transferSol,
  createTransferSolTransaction,
  createTransferSplTokenTransaction,
  isGuardian,
  executeInstruction,
} from "./functions";

export const tools = verveTools;

export const utils = {
  checkSolBalance,
  checkSplBalance,
  createTokenAccount,
  createWallet,
  transferSol,
  transferSplToken,
  addGuardian,
  isGuardian,
  executeInstruction,
};

export const transactions = {
  createTransferSolTransaction,
  createTransferSplTokenTransaction,
};
