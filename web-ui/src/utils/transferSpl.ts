import { Provider } from "@coral-xyz/anchor";
import { Rpc } from "@lightprotocol/stateless.js";
import { Wallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { instructions } from "@verve-agentic/sdk";

export async function transferSpl(
  provider: Provider,
  rpc: Rpc,
  userWallet: Wallet,
  userPublicKey: PublicKey,
  seedGuardian: PublicKey,
  fromTokenAccount: PublicKey,
  toTokenAccount: PublicKey,
  guardian: PublicKey,
  amount: number,
) {
  const tx = await instructions.createTransferSplTokenInstruction(
    provider,
    rpc,
    userPublicKey,
    new PublicKey(seedGuardian),
    userPublicKey,
    fromTokenAccount,
    toTokenAccount,
    guardian,
    amount,
  );

  const signature = await userWallet.adapter.sendTransaction(
    tx,
    provider.connection,
  );

  const { blockhash, lastValidBlockHeight } =
    await provider.connection.getLatestBlockhash();

  // Wait for confirmation
  await provider.connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });

  console.log("Success!");
}
