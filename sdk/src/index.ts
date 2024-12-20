import { BN, type Provider } from "@coral-xyz/anchor";
import {
  bn,
  createRpc,
  deriveAddress,
  type CompressedAccount,
  type NewAddressParams,
} from "@lightprotocol/stateless.js";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
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
import { type VerveInstruction } from "./utils/types";

export async function createWallet(
  payer: Keypair,
  seedGuardian: PublicKey,
  provider: Provider,
  rpcUrl?: string,
): Promise<string> {
  const rpc = createRpc(rpcUrl, rpcUrl, rpcUrl, { commitment: "confirmed" });
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

  const ix = await program.methods
    .initWallet(
      [], // inputs
      proof.compressedProof, // proof
      merkleContext, // merkleContext
      0, // merkleTreeRootIndex
      addressMerkleContext, // addressMerkleContext
      addressMerkleTreeRootIndex, // addressMerkleTreeRootIndex
    )
    .accounts({
      payer: payer.publicKey,
      seedGuardian: seedGuardian,
      wallet: wallet,
      ...LIGHT_ACCOUNTS,
    })
    .remainingAccounts(formatLightRemainingAccounts(remainingAccounts))
    .instruction();

  const signature = await buildSignAndSendTransaction(ix, payer, rpc);

  return signature;
}

export async function addGuardian(
  payer: Keypair,
  seedGuardian: PublicKey,
  assignedGuardian: PublicKey,
  provider: Provider,
  rpcUrl?: string,
) {
  const rpc = createRpc(rpcUrl, rpcUrl, rpcUrl, { commitment: "confirmed" });
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

  const ix = await program.methods
    .registerKeypair(
      [], // inputs
      proof.compressedProof, // proof
      merkleContext, // merkleContext
      0, // merkleTreeRootIndex
      addressMerkleContext, // addressMerkleContext
      addressMerkleTreeRootIndex, // addressMerkleTreeRootIndex
    )
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

export function checkSplBalance() {
  return;
}

export function createTokenAccount() {
  return;
}

export async function transferSol(
  from: PublicKey,
  to: PublicKey,
  payer: Keypair,
  seedGuardian: PublicKey,
  guardian: PublicKey,
  solAmount: number,
  provider: Provider,
  rpcUrl?: string,
): Promise<string> {
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: from,
    toPubkey: to,
    lamports: solAmount * LAMPORTS_PER_SOL,
  });

  const rpc = createRpc(rpcUrl, rpcUrl, rpcUrl, { commitment: "confirmed" });
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

  const ix = await program.methods
    .execInstruction(
      [walletGuardianAccount.data!.data], // inputs
      proof.compressedProof, // proof
      merkleContext, // merkleContext
      rootIndex, // merkleTreeRootIndex
      addressMerkleContext, // addressMerkleContext
      addressMerkleTreeRootIndex, // addressMerkleTreeRootIndex
      Buffer.from(serializedInstructionData), // instructionData
    )
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

export function transferSplToken() {
  return;
}
