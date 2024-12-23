import {
  Account,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from "@solana/spl-token";
import { Wallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export async function getOrCreateAta(
  mint: PublicKey,
  owner: PublicKey,
  connection: Connection,
  userWallet: Wallet | null,
) {
  if (userWallet == null) {
    return;
  }

  const associatedToken = await getAssociatedTokenAddress(mint, owner, true);

  let account: Account;

  try {
    account = await getAccount(connection, associatedToken, "confirmed");
  } catch (error: unknown) {
    if (
      error instanceof TokenAccountNotFoundError ||
      error instanceof TokenInvalidAccountOwnerError
    ) {
      try {
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash();

        const instruction = createAssociatedTokenAccountInstruction(
          owner,
          associatedToken,
          owner,
          mint,
        );

        const message = new TransactionMessage({
          instructions: [instruction],
          payerKey: owner,
          recentBlockhash: blockhash,
        }).compileToV0Message();

        const transaction = new VersionedTransaction(message);

        const signature = await userWallet.adapter.sendTransaction(
          transaction,
          connection,
        );

        // Wait for confirmation
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        });
      } catch (error: unknown) {}

      account = await getAccount(connection, associatedToken, "confirmed");
    } else {
      throw error;
    }
  }
  return account;
}
