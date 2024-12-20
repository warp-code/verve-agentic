import { type Provider } from "@coral-xyz/anchor";
import {
  createRpc,
  deriveAddress,
  type CompressedAccount,
  type NewAddressParams,
} from "@lightprotocol/stateless.js";
import { Keypair, PublicKey } from "@solana/web3.js";
import { LIGHT_ACCOUNTS, LIGHT_STATE_TREE_ACCOUNTS } from "./utils/constants";
import {
  buildSignAndSendTransaction,
  createNewAddressOutputState,
  deriveWalletAddress,
  deriveWalletGuardianSeed,
  formatRemainingAccounts,
  getNewAddressParams,
  getValidityProof,
  initializeProgram,
  packNew,
} from "./utils/functions";

export async function createWallet(
  seedGuardian: Keypair,
  provider: Provider,
  rpcUrl?: string,
): Promise<string> {
  const rpc = createRpc(rpcUrl, rpcUrl, rpcUrl, { commitment: "confirmed" });
  const program = initializeProgram(provider);

  const wallet = deriveWalletAddress(seedGuardian.publicKey);
  const walletGuardianSeed = deriveWalletGuardianSeed(
    wallet,
    seedGuardian.publicKey,
  );
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
      payer: seedGuardian.publicKey,
      seedGuardian: seedGuardian.publicKey,
      wallet: wallet,
      ...LIGHT_ACCOUNTS,
    })
    .remainingAccounts(formatRemainingAccounts(remainingAccounts))
    .instruction();

  const signature = await buildSignAndSendTransaction(ix, seedGuardian, rpc);

  console.log("signature: ", signature);

  return signature;
}

export async function addGuardian(
  seedGuardian: Keypair,
  assignedGuardian: PublicKey,
  provider: Provider,
  rpcUrl?: string,
) {
  const rpc = createRpc(rpcUrl, rpcUrl, rpcUrl, { commitment: "confirmed" });
  const program = initializeProgram(provider);

  const wallet = deriveWalletAddress(seedGuardian.publicKey);

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
      payer: seedGuardian.publicKey,
      seedGuardian: seedGuardian.publicKey,
      assignedGuardian: assignedGuardian,
      wallet: wallet,
      ...LIGHT_ACCOUNTS,
    })
    .remainingAccounts(formatRemainingAccounts(remainingAccounts))
    .instruction();

  const signature = await buildSignAndSendTransaction(ix, seedGuardian, rpc);

  console.log("signature: ", signature);

  return signature;
}

export function checkSplBalance() {
  return;
}

export function createTokenAccount() {
  return;
}

export function transferSol() {
  return;
}

export function transferSplToken() {
  return;
}
