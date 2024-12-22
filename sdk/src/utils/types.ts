import type { DecodeType, IdlTypes, Provider, Wallet } from "@coral-xyz/anchor";
import type { IdlType } from "@coral-xyz/anchor/dist/cjs/idl";
import type { PackedMerkleContext, Rpc } from "@lightprotocol/stateless.js";
import type { PublicKey } from "@solana/web3.js";
import type OpenAI from "openai";
import type { IDL, CompressedAaPoc } from "../idls/compressed_aa_poc";

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

export type CompressedAaPocStruct<
  Name extends string,
  Program = CompressedAaPoc,
> = UnionToIntersection<ArgsType<ProgramInstruction<Name, Program>>>;

type ProgramInstruction<Name extends string, Program> = InstructionTypeByName<
  Program,
  Name
>;

type InstructionTypeByName<Program, Name extends string> = Program extends {
  instructions: Array<infer I>;
}
  ? I extends { name: Name }
    ? I
    : never
  : never;

type ArgsType<Instruction> = Instruction extends { args: infer Args }
  ? Args extends Array<infer Arg>
    ? Arg extends { name: infer Name; type: infer Type extends IdlType }
      ? Name extends string
        ? // Decodes types that work in Typescript
          { [P in Name]: DecodeType<Type, IdlTypes<typeof IDL>> }
        : never
      : never
    : never
  : never;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;
