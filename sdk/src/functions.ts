import { BN, type Provider } from "@coral-xyz/anchor";
import {
  bn,
  deriveAddress,
  Rpc,
  type CompressedAccount,
  type NewAddressParams,
} from "@lightprotocol/stateless.js";
import {
  createTransferInstruction,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  type Account,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  type VersionedTransaction,
} from "@solana/web3.js";
import { serialize } from "borsh";
import {
  LIGHT_ACCOUNTS,
  LIGHT_STATE_TREE_ACCOUNTS,
  VERVE_INSTRUCTION_SCHEMA,
} from "./utils/constants";
import {
  buildSignAndSendTransaction,
  buildTransaction,
  createNewAddressOutputState,
  deriveWalletAddress,
  deriveWalletGuardianSeed,
  formatInstructionRemainingAccounts,
  formatLightRemainingAccounts,
  getInstructionAccountMeta,
  getNewAddressParams,
  getValidityProof,
  initializeProgram,
  packNew,
  packWithInput,
} from "./utils/functions";
import type { CompressedAaPocStruct, VerveInstruction } from "./utils/types";

export async function createWallet(
  provider: Provider,
  rpc: Rpc,
  payer: Keypair,
  seedGuardian: PublicKey,
): Promise<{
  signature: string;
  walletAccountAddress: PublicKey;
  walletGuardianAccountAddress: PublicKey;
}> {
  const program = initializeProgram(provider);

  const wallet = deriveWalletAddress(seedGuardian);
  const walletGuardianSeed = deriveWalletGuardianSeed(wallet, seedGuardian);
  const walletGuardianAddress: PublicKey = deriveAddress(
    walletGuardianSeed,
    LIGHT_STATE_TREE_ACCOUNTS.addressTree,
  );

  const newUniqueAddresses: PublicKey[] = [];
  newUniqueAddresses.push(walletGuardianAddress);

  const proof = await getValidityProof(rpc, undefined, newUniqueAddresses);

  const newAddressesParams: NewAddressParams[] = [];
  newAddressesParams.push(getNewAddressParams(walletGuardianSeed, proof));

  const outputCompressedAccounts: CompressedAccount[] = [];
  outputCompressedAccounts.push(
    ...createNewAddressOutputState(walletGuardianAddress),
  );

  const {
    addressMerkleContext,
    addressMerkleTreeRootIndex,
    merkleContext,
    remainingAccounts,
  } = packNew(outputCompressedAccounts, newAddressesParams, proof);

  const args: CompressedAaPocStruct<"initWallet"> = {
    inputs: [],
    proof: proof.compressedProof,
    merkleContext,
    merkleTreeRootIndex: 0,
    addressMerkleContext,
    addressMerkleTreeRootIndex,
  };

  const ix = await program.methods
    .initWallet(...(Object.values(args) as any))
    .accounts({
      payer: payer.publicKey,
      seedGuardian: seedGuardian,
      wallet: wallet,
      ...LIGHT_ACCOUNTS,
    })
    .remainingAccounts(formatLightRemainingAccounts(remainingAccounts))
    .instruction();

  const signature = await buildSignAndSendTransaction(rpc, ix, payer, []);

  return {
    signature,
    walletAccountAddress: wallet,
    walletGuardianAccountAddress: walletGuardianAddress,
  };
}

export async function addGuardian(
  provider: Provider,
  rpc: Rpc,
  payer: Keypair,
  seedGuardian: PublicKey,
  assignedGuardian: PublicKey,
): Promise<{
  signature: string;
  walletAccountAddress: PublicKey;
  walletGuardianAccountAddress: PublicKey;
}> {
  const program = initializeProgram(provider);

  const wallet = deriveWalletAddress(seedGuardian);

  const walletGuardianSeed = deriveWalletGuardianSeed(wallet, assignedGuardian);
  const walletGuardianAddress = deriveAddress(
    walletGuardianSeed,
    LIGHT_STATE_TREE_ACCOUNTS.addressTree,
  );

  const newUniqueAddresses: PublicKey[] = [];
  newUniqueAddresses.push(walletGuardianAddress);

  const proof = await getValidityProof(rpc, undefined, newUniqueAddresses);

  const newAddressesParams: NewAddressParams[] = [];
  newAddressesParams.push(getNewAddressParams(walletGuardianSeed, proof));

  const outputCompressedAccounts: CompressedAccount[] = [];
  outputCompressedAccounts.push(
    ...createNewAddressOutputState(walletGuardianAddress),
  );

  const {
    addressMerkleContext,
    addressMerkleTreeRootIndex,
    merkleContext,
    remainingAccounts,
  } = packNew(outputCompressedAccounts, newAddressesParams, proof);

  const args: CompressedAaPocStruct<"registerKeypair"> = {
    inputs: [],
    proof: proof.compressedProof,
    merkleContext,
    merkleTreeRootIndex: 0,
    addressMerkleContext,
    addressMerkleTreeRootIndex,
  };

  const ix = await program.methods
    .registerKeypair(...(Object.values(args) as any))
    .accounts({
      payer: payer.publicKey,
      seedGuardian: seedGuardian,
      assignedGuardian: assignedGuardian,
      wallet: wallet,
      ...LIGHT_ACCOUNTS,
    })
    .remainingAccounts(formatLightRemainingAccounts(remainingAccounts))
    .instruction();

  const signature = await buildSignAndSendTransaction(rpc, ix, payer, []);

  return {
    signature,
    walletAccountAddress: wallet,
    walletGuardianAccountAddress: walletGuardianAddress,
  };
}

export async function checkSolBalance(
  provider: Provider,
  walletAddress: PublicKey,
): Promise<number> {
  const balance = await provider.connection.getBalance(walletAddress, {
    commitment: "confirmed",
  });

  return balance / LAMPORTS_PER_SOL;
}

export async function checkSplBalance(
  provider: Provider,
  ataAddress: PublicKey,
): Promise<bigint> {
  const ata = await getAccount(provider.connection, ataAddress, "confirmed");

  return ata.amount;
}

export async function createTokenAccount(
  provider: Provider,
  payer: Keypair,
  mint: PublicKey,
  wallet: PublicKey,
): Promise<Account> {
  const ata = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payer,
    mint,
    wallet,
    true,
    "confirmed",
  );

  return ata;
}

export async function transferSol(
  provider: Provider,
  rpc: Rpc,
  payer: Keypair,
  seedGuardian: PublicKey,
  guardian: Keypair,
  from: PublicKey,
  to: PublicKey,
  solAmount: number,
): Promise<string> {
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: to,
    lamports: solAmount * LAMPORTS_PER_SOL,
  });

  const ix = await buildExecuteInstructionIx(
    provider,
    rpc,
    payer.publicKey,
    seedGuardian,
    guardian.publicKey,
    transferInstruction,
  );

  const additionalSigners: Keypair[] = [];

  if (guardian.publicKey.toString() !== payer.publicKey.toString()) {
    additionalSigners.push(guardian);
  }

  const signature = await buildSignAndSendTransaction(
    rpc,
    ix,
    payer,
    additionalSigners,
  );

  return signature;
}

export async function transferSplToken(
  provider: Provider,
  rpc: Rpc,
  payer: Keypair,
  seedGuardian: PublicKey,
  guardian: Keypair,
  fromAta: PublicKey,
  toAta: PublicKey,
  fromAtaOwner: PublicKey,
  splAmount: number,
): Promise<string> {
  const transferInstruction = createTransferInstruction(
    fromAta,
    toAta,
    fromAtaOwner,
    splAmount,
  );

  const ix = await buildExecuteInstructionIx(
    provider,
    rpc,
    payer.publicKey,
    seedGuardian,
    guardian.publicKey,
    transferInstruction,
  );

  const additionalSigners: Keypair[] = [];

  if (guardian.publicKey.toString() !== payer.publicKey.toString()) {
    additionalSigners.push(guardian);
  }

  const signature = await buildSignAndSendTransaction(
    rpc,
    ix,
    payer,
    additionalSigners,
  );

  return signature;
}

export async function createTransferSolTransaction(
  provider: Provider,
  rpc: Rpc,
  payer: PublicKey,
  seedGuardian: PublicKey,
  guardian: PublicKey,
  from: PublicKey,
  to: PublicKey,
  solAmount: number,
): Promise<VersionedTransaction> {
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: to,
    lamports: solAmount * LAMPORTS_PER_SOL,
  });

  const ix = await buildExecuteInstructionIx(
    provider,
    rpc,
    payer,
    seedGuardian,
    guardian,
    transferInstruction,
  );

  return await buildTransaction(rpc, ix, payer);
}

export async function createTransferSplTokenTransaction(
  provider: Provider,
  rpc: Rpc,
  payer: PublicKey,
  seedGuardian: PublicKey,
  guardian: PublicKey,
  fromAta: PublicKey,
  toAta: PublicKey,
  fromAtaOwner: PublicKey,
  splAmount: number,
): Promise<VersionedTransaction> {
  const transferInstruction = createTransferInstruction(
    fromAta,
    toAta,
    fromAtaOwner,
    splAmount,
  );

  const ix = await buildExecuteInstructionIx(
    provider,
    rpc,
    payer,
    seedGuardian,
    guardian,
    transferInstruction,
  );

  return await buildTransaction(rpc, ix, payer);
}

export async function isGuardian(
  rpc: Rpc,
  wallet: PublicKey,
  address: PublicKey,
): Promise<boolean> {
  const walletGuardianSeed = deriveWalletGuardianSeed(wallet, address);

  const walletGuardianAddress = deriveAddress(
    walletGuardianSeed,
    LIGHT_STATE_TREE_ACCOUNTS.addressTree,
  );

  const walletGuardianAccount = await rpc.getCompressedAccount(
    new BN(walletGuardianAddress.toBytes()),
  );

  if (walletGuardianAccount) {
    return true;
  }

  return false;
}

async function buildExecuteInstructionIx(
  provider: Provider,
  rpc: Rpc,
  payer: PublicKey,
  seedGuardian: PublicKey,
  guardian: PublicKey,
  instruction: TransactionInstruction,
): Promise<TransactionInstruction> {
  const program = initializeProgram(provider);

  const wallet = deriveWalletAddress(seedGuardian);

  const walletGuardianSeed = deriveWalletGuardianSeed(wallet, guardian);
  const walletGuardianAddress = deriveAddress(
    walletGuardianSeed,
    LIGHT_STATE_TREE_ACCOUNTS.addressTree,
  );

  const walletGuardianAccount = await rpc.getCompressedAccount(
    new BN(walletGuardianAddress.toBytes()),
  );

  if (!walletGuardianAccount) {
    throw "no wallet guardian account";
  }

  const inputleafhashes = [bn(walletGuardianAccount.hash)];

  const proof = await getValidityProof(rpc, inputleafhashes, undefined);

  const {
    addressMerkleContext,
    addressMerkleTreeRootIndex,
    merkleContext,
    remainingAccounts: lightRemainingAccounts,
    rootIndex,
  } = packWithInput([walletGuardianAccount], [], [], proof);

  const { writables, signers } = getInstructionAccountMeta(instruction);

  const remainingAccounts = [
    ...formatLightRemainingAccounts(lightRemainingAccounts),
    ...formatInstructionRemainingAccounts(instruction),
  ];

  const programAccountIndex = remainingAccounts.findIndex(
    x => x.pubkey === instruction.programId,
  );

  const verveInstruction: VerveInstruction = {
    data: instruction.data,
    accountIndices: Buffer.from(
      instruction.keys.map(key =>
        remainingAccounts.findIndex(
          remainingAccount => remainingAccount.pubkey === key.pubkey,
        ),
      ),
    ),
    writableAccounts: writables,
    signerAccounts: signers,
    programAccountIndex: programAccountIndex,
  };

  const serializedInstructionData = serialize(
    VERVE_INSTRUCTION_SCHEMA,
    verveInstruction,
  );

  const args: CompressedAaPocStruct<"execInstruction"> = {
    inputs: [walletGuardianAccount.data!.data],
    proof: proof.compressedProof,
    merkleContext,
    merkleTreeRootIndex: rootIndex,
    addressMerkleContext,
    addressMerkleTreeRootIndex,
    instructionData: Buffer.from(serializedInstructionData),
  };

  const ix = await program.methods
    .execInstruction(...(Object.values(args) as any))
    .accounts({
      payer: payer,
      seedGuardian: seedGuardian,
      guardian: guardian,
      wallet: wallet,
      ...LIGHT_ACCOUNTS,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();

  return ix;
}
