import { functions } from "./chat";
import { checkSplBalance, createTokenAccount, createWallet } from "./functions";

export const tools = functions;
export const utils = { createTokenAccount, createWallet, checkSplBalance };
