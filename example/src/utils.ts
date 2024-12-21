import { AnchorProvider, setProvider, Wallet } from "@coral-xyz/anchor";
import { createRpc } from "@lightprotocol/stateless.js";
import { Connection, Keypair } from "@solana/web3.js";
import colors from "colors";
import dotenv from "dotenv";

dotenv.config();

export const setup = async () => {
  // Create connection to local cluster
  const connection = new Connection("http://localhost:8899", "confirmed");

  // Generate a new random keypair
  const walletKeypair = Keypair.generate();
  const wallet = new Wallet(walletKeypair);

  // Initialize the provider
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Set this as the default provider
  setProvider(provider);

  // Log the public key of your randomly generated keypair
  console.log(
    colors.bold.blue(
      `Wallet public key: ${walletKeypair.publicKey.toString()}`,
    ),
  );

  const airdropSignature = await connection.requestAirdrop(
    walletKeypair.publicKey,
    5_000_000_000, // 5 SOL in lamports
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  // Confirm the airdrop transaction using the newer method
  await connection.confirmTransaction({
    signature: airdropSignature,
    blockhash,
    lastValidBlockHeight,
  });

  console.log(colors.bold.blue("Airdropped5 SOL to wallet"));

  const rpc = createRpc(undefined, undefined, undefined, {
    commitment: "confirmed",
  });

  return {
    wallet,
    provider,
    rpc,
  };
};
