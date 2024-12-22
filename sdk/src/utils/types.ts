import type { Provider, Wallet } from "@coral-xyz/anchor";
import type { PackedMerkleContext, Rpc } from "@lightprotocol/stateless.js";
import type { PublicKey } from "@solana/web3.js";
import type OpenAI from "openai";

export interface WalletGuardian {
  wallet: PublicKey;
  guardian: PublicKey;
}

export interface VerveInstruction {
  data: Buffer;
  accountIndices: Buffer;
  writableAccounts: Array<boolean>;
  signerAccounts: Array<boolean>;
  programAccountIndex: number;
}

export interface LightAccounts {
  accountCompressionAuthority: PublicKey;
  accountCompressionProgram: PublicKey;
  cpiSigner: PublicKey;
  lightSystemProgram: PublicKey;
  noopProgram: PublicKey;
  registeredProgramPda: PublicKey;
  selfProgram: PublicKey;
  systemProgram: PublicKey;
}

export interface LightStateTreeAccounts {
  addressTree: PublicKey;
  addressQueue: PublicKey;
  merkleTree: PublicKey;
  merkleTreeHeight: number;
  nullifierQueue: PublicKey;
}

export interface InstructionAccountMeta {
  accounts: PublicKey[];
  writables: boolean[];
  signers: boolean[];
}

export interface PackNewCompressedAccounts {
  addressMerkleContext: {
    addressMerkleTreePubkeyIndex: number;
    addressQueuePubkeyIndex: number;
  };
  addressMerkleTreeRootIndex: number;
  merkleContext: PackedMerkleContext;
  remainingAccounts: PublicKey[];
}

export interface PackWithInputCompressedAccounts {
  addressMerkleContext: {
    addressMerkleTreePubkeyIndex: number;
    addressQueuePubkeyIndex: number;
  };
  addressMerkleTreeRootIndex: number;
  merkleContext: PackedMerkleContext;
  rootIndex: number;
  remainingAccounts: PublicKey[];
}

export type VerveTool = OpenAI.ChatCompletionTool & {
  handler: (
    provider: Provider,
    wallet: Wallet,
    rpc: Rpc,
    params: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
};
