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
};

export const instructions = {
  createTransferSolTransaction,
  createTransferSplTokenTransaction,
  isGuardian,
};
