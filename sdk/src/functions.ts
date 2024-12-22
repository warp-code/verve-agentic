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
} from "@solana/web3.js";
import { serialize } from "borsh";
import {
  LIGHT_ACCOUNTS,
  LIGHT_STATE_TREE_ACCOUNTS,
  VERVE_INSTRUCTION_SCHEMA,
} from "./utils/constants";
import {
  buildSignAndSendTransaction,
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

  const signature = await buildSignAndSendTransaction(ix, payer, rpc);

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
): Promise<string> {
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

  const signature = await buildSignAndSendTransaction(ix, payer, rpc);

  return signature;
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
  guardian: PublicKey,
  from: PublicKey,
  to: PublicKey,
  solAmount: number,
): Promise<string> {
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: to,
    lamports: solAmount * LAMPORTS_PER_SOL,
  });

  return await executeTransferInstruction(
    provider,
    rpc,
    payer,
    seedGuardian,
    guardian,
    transferInstruction,
  );
}

export async function transferSplToken(
  provider: Provider,
  rpc: Rpc,
  payer: Keypair,
  seedGuardian: PublicKey,
  guardian: PublicKey,
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

  return await executeTransferInstruction(
    provider,
    rpc,
    payer,
    seedGuardian,
    guardian,
    transferInstruction,
  );
}

async function executeTransferInstruction(
  provider: Provider,
  rpc: Rpc,
  payer: Keypair,
  seedGuardian: PublicKey,
  guardian: PublicKey,
  transferInstruction: TransactionInstruction,
): Promise<string> {
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

  const { writables, signers } = getInstructionAccountMeta(transferInstruction);

  const remainingAccounts = [
    ...formatLightRemainingAccounts(lightRemainingAccounts),
    ...formatInstructionRemainingAccounts(transferInstruction),
  ];

  const programAccountIndex = remainingAccounts.findIndex(
    x => x.pubkey === transferInstruction.programId,
  );

  const verveInstruction: VerveInstruction = {
    data: transferInstruction.data,
    accountIndices: Buffer.from(
      transferInstruction.keys.map(key =>
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
      payer: payer.publicKey,
      seedGuardian: seedGuardian,
      guardian: guardian,
      wallet: wallet,
      ...LIGHT_ACCOUNTS,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();

  const signature = await buildSignAndSendTransaction(ix, payer, rpc);

  return signature;
}
