import { BN, getProvider, Program } from "@coral-xyz/anchor";
import {
  bn,
  buildTx,
  LightSystemProgram,
  packCompressedAccounts,
  packNewAddressParams,
  Rpc,
  type CompressedAccount,
  type CompressedAccountWithMerkleContext,
  type CompressedProofWithContext,
  type NewAddressParams,
} from "@lightprotocol/stateless.js";
import { keccak_256 } from "@noble/hashes/sha3";
import {
  ComputeBudgetProgram,
  PublicKey,
  VersionedTransaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  LIGHT_STATE_TREE_ACCOUNTS,
  PDA_WALLET_GUARDIAN_SEED,
  PDA_WALLET_SEED,
  PROGRAM_ID,
} from "./constants";
import type { CompressedAaPoc } from "../idls/compressed_aa_poc";
import idl from "../idls/compressed_aa_poc.json";
import type { InstructionAccountMeta } from "./types";

export function initializeProgram(): Program<CompressedAaPoc> {
  const provider = getProvider();

  return new Program(idl as unknown as CompressedAaPoc, PROGRAM_ID, provider);
}

export function deriveSeed(seeds: Uint8Array[]): Uint8Array {
  const combinedSeeds: Uint8Array[] = [PROGRAM_ID.toBytes(), ...seeds];

  return hashvToBn254FieldSizeBe(combinedSeeds);
}

export function deriveWalletAddress(seedGuardian: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [PDA_WALLET_SEED, seedGuardian.toBytes()],
    PROGRAM_ID,
  )[0];
}

export function deriveWalletGuardianSeed(
  wallet: PublicKey,
  guardian: PublicKey,
): Uint8Array {
  return deriveSeed([
    PDA_WALLET_GUARDIAN_SEED,
    wallet.toBytes(),
    guardian.toBytes(),
  ]);
}

export function hashvToBn254FieldSizeBe(bytes: Uint8Array[]): Uint8Array {
  const hasher = keccak_256.create();

  for (const input of bytes) {
    hasher.update(input);
  }

  const hash = hasher.digest();

  hash[0] = 0;

  return hash;
}

export function createNewAddressOutputState(
  address: PublicKey,
): CompressedAccount[] {
  return LightSystemProgram.createNewAddressOutputState(
    Array.from(address.toBytes()),
    PROGRAM_ID,
  );
}

export function getNewAddressParams(
  addressSeed: Uint8Array,
  proof: CompressedProofWithContext,
): NewAddressParams {
  const addressMerkleTreeRootIndex =
    proof.rootIndices[proof.rootIndices.length - 1];

  if (!addressMerkleTreeRootIndex) {
    throw "No addressMerkleTreeRootIndex";
  }

  const addressMerkleTreePubkey =
    proof.merkleTrees[proof.merkleTrees.length - 1];

  if (!addressMerkleTreePubkey) {
    throw "No addressMerkleTreePubkey";
  }

  const addressQueuePubkey =
    proof.nullifierQueues[proof.nullifierQueues.length - 1];

  if (!addressQueuePubkey) {
    throw "No addressQueuePubkey";
  }

  const addressParams: NewAddressParams = {
    seed: addressSeed,
    addressMerkleTreeRootIndex,
    addressMerkleTreePubkey,
    addressQueuePubkey,
  };

  return addressParams;
}

export async function buildTxWithComputeBudget(
  rpc: Rpc,
  instructions: TransactionInstruction[],
  payerPubkey: PublicKey,
): Promise<VersionedTransaction> {
  const setComputeUnitIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 2_000_000,
  });

  instructions.unshift(setComputeUnitIx);

  const { blockhash } = await rpc.getLatestBlockhash();

  return buildTx(
    instructions,
    payerPubkey,
    blockhash,
  ) as unknown as VersionedTransaction;
}

export function getInstructionAccountMeta(
  testIx: TransactionInstruction,
): InstructionAccountMeta {
  const accounts: PublicKey[] = [];
  const writables: boolean[] = [];
  const signers: boolean[] = [];

  for (const accountMeta of testIx.keys) {
    accounts.push(accountMeta.pubkey);
    writables.push(accountMeta.isWritable);
    signers.push(accountMeta.isSigner);
  }

  return { accounts, writables, signers };
}

export async function getValidityProof(
  rpc: Rpc,
  inputHashes?: BN[],
  newUniqueAddresses: PublicKey[] | undefined = undefined,
): Promise<CompressedProofWithContext> {
  const outputHashes = newUniqueAddresses?.map(addr => bn(addr.toBytes()));

  return await rpc.getValidityProof(inputHashes, outputHashes);
}

export async function getWalletGuardianAccount(
  rpc: Rpc,
  walletGuardianAccountAddress: PublicKey,
): Promise<CompressedAccountWithMerkleContext> {
  const walletGuardianAccount = await rpc.getCompressedAccount(
    new BN(walletGuardianAccountAddress),
  );

  if (!walletGuardianAccount) {
    throw "Wallet guardian account does not exist";
  }

  return walletGuardianAccount;
}

export function packWithInput(
  inputCompressedAccounts: CompressedAccountWithMerkleContext[],
  outputCompressedAccounts: CompressedAccount[],
  newAddressesParams: NewAddressParams[],
  proof: CompressedProofWithContext,
) {
  const {
    packedInputCompressedAccounts,
    remainingAccounts: remainingAccounts1,
  } = packCompressedAccounts(
    inputCompressedAccounts,
    proof.rootIndices,
    outputCompressedAccounts,
  );

  let addressMerkleTreeAccountIndex: number,
    addressMerkleTreeRootIndex: number,
    addressQueueAccountIndex: number;

  let remainingAccounts: PublicKey[] = remainingAccounts1;

  if (newAddressesParams.length) {
    const { newAddressParamsPacked, remainingAccounts: remainingAccounts2 } =
      packNewAddressParams(newAddressesParams, remainingAccounts1);

    const params = newAddressParamsPacked[0];

    if (!params) {
      throw "";
    }

    addressMerkleTreeAccountIndex = params.addressMerkleTreeAccountIndex;
    addressMerkleTreeRootIndex = params.addressMerkleTreeRootIndex;
    addressQueueAccountIndex = params.addressQueueAccountIndex;

    remainingAccounts = remainingAccounts2;
  } else {
    addressMerkleTreeRootIndex = 0;

    remainingAccounts.push(LIGHT_STATE_TREE_ACCOUNTS.addressTree);
    addressMerkleTreeAccountIndex = remainingAccounts.length - 1;

    remainingAccounts.push(LIGHT_STATE_TREE_ACCOUNTS.addressQueue);
    addressQueueAccountIndex = remainingAccounts.length - 1;
  }

  if (!packedInputCompressedAccounts[0]) {
    throw "";
  }

  const { rootIndex, merkleContext } = packedInputCompressedAccounts[0];

  return {
    addressMerkleContext: {
      addressMerkleTreePubkeyIndex: addressMerkleTreeAccountIndex,
      addressQueuePubkeyIndex: addressQueueAccountIndex,
    },
    addressMerkleTreeRootIndex: addressMerkleTreeRootIndex,
    merkleContext,
    rootIndex,
    remainingAccounts,
  };
}
