import { BN, getProvider, Program } from "@coral-xyz/anchor";
import {
  bn,
  buildTx,
  getIndexOrAdd,
  LightSystemProgram,
  packCompressedAccounts,
  packNewAddressParams,
  Rpc,
  type CompressedAccount,
  type CompressedAccountWithMerkleContext,
  type CompressedProofWithContext,
  type NewAddressParams,
  type PackedMerkleContext,
} from "@lightprotocol/stateless.js";
import { keccak_256 } from "@noble/hashes/sha3";
import {
  ComputeBudgetProgram,
  PublicKey,
  VersionedTransaction,
  type AccountMeta,
  type TransactionInstruction,
} from "@solana/web3.js";
import { LIGHT_STATE_TREE_ACCOUNTS, PROGRAM_ID } from "./constants";
import type { InstructionAccountMeta } from "./types";
import { IDL, type CompressedAaPoc } from "../idls/compressed_aa_poc";

export function initializeProgram(): Program<CompressedAaPoc> {
  const provider = getProvider();

  return new Program(IDL, PROGRAM_ID, provider);
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

export function deriveAddressSeed(
  seeds: Uint8Array[],
  programId: PublicKey,
): Uint8Array {
  const inputs: Uint8Array[] = [programId.toBytes(), ...seeds];

  return hashvToBn254FieldSizeBe(inputs);
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
    remainingAccounts: _remainingAccounts,
    packedInputCompressedAccounts,
  } = packCompressedAccounts(
    inputCompressedAccounts,
    proof.rootIndices,
    outputCompressedAccounts,
  );

  const { newAddressParamsPacked, remainingAccounts } = packNewAddressParams(
    newAddressesParams,
    _remainingAccounts,
  );

  let addressMerkleTreeAccountIndex: number,
    addressMerkleTreeRootIndex: number,
    addressQueueAccountIndex: number;

  if (!packedInputCompressedAccounts[0]) {
    throw "No packed input compressed accounts";
  }

  try {
    ({
      addressMerkleTreeAccountIndex,
      addressMerkleTreeRootIndex,
      addressQueueAccountIndex,
    } = newAddressParamsPacked[0]!);
  } catch {
    addressMerkleTreeRootIndex = packedInputCompressedAccounts[0].rootIndex;

    addressMerkleTreeAccountIndex = getIndexOrAdd(
      remainingAccounts,
      LIGHT_STATE_TREE_ACCOUNTS.addressTree,
    );

    addressQueueAccountIndex = getIndexOrAdd(
      remainingAccounts,
      LIGHT_STATE_TREE_ACCOUNTS.addressQueue,
    );
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

export function packNew(
  outputCompressedAccounts: CompressedAccount[],
  newAddressesParams: NewAddressParams[],
  proof: CompressedProofWithContext,
) {
  const { remainingAccounts: _remainingAccounts } = packCompressedAccounts(
    [],
    proof.rootIndices,
    outputCompressedAccounts,
  );

  const { newAddressParamsPacked, remainingAccounts } = packNewAddressParams(
    newAddressesParams,
    _remainingAccounts,
  );

  const merkleContext: PackedMerkleContext = {
    leafIndex: 0,
    merkleTreePubkeyIndex: getIndexOrAdd(
      remainingAccounts,
      LIGHT_STATE_TREE_ACCOUNTS.merkleTree,
    ),
    nullifierQueuePubkeyIndex: getIndexOrAdd(
      remainingAccounts,
      LIGHT_STATE_TREE_ACCOUNTS.nullifierQueue,
    ),
    queueIndex: null,
  };

  if (!newAddressParamsPacked[0]) {
    throw "No new address params packed";
  }

  const {
    addressMerkleTreeAccountIndex,
    addressMerkleTreeRootIndex,
    addressQueueAccountIndex,
  } = newAddressParamsPacked[0];

  return {
    addressMerkleContext: {
      addressMerkleTreeAccountIndex,
      addressQueueAccountIndex,
    },
    addressMerkleTreeRootIndex,
    merkleContext,
    remainingAccounts,
  };
}

export function formatRemainingAccounts(
  remainingAccounts: PublicKey[],
): AccountMeta[] {
  return remainingAccounts.map(
    account =>
      <AccountMeta>{
        pubkey: account,
        isSigner: false,
        isWritable: true,
      },
  );
}
