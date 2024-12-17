import { PublicKey } from "@solana/web3.js";

export type WalletGuardian = {
  wallet: PublicKey;
  guardian: PublicKey;
};

export type VerveInstruction = {
  data: Buffer;
  accountIndices: Buffer;
  writableAccounts: Array<boolean>;
  signerAccounts: Array<boolean>;
  programAccountIndex: number;
};
