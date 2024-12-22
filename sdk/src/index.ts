import { functions } from "./chat";
import {
  checkSplBalance,
  createTokenAccount,
  createWallet,
  transferSol,
  transferSplToken,
} from "./functions";

export const tools = functions;
export const utils = { createTokenAccount, createWallet };
