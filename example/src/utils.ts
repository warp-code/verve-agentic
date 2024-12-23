import { AnchorProvider, setProvider, Wallet } from "@coral-xyz/anchor";
import { createRpc, Rpc } from "@lightprotocol/stateless.js";
import { createMint, mintTo } from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { utils } from "@verve-agentic/sdk";
import colors from "colors";
import dotenv from "dotenv";

dotenv.config();

export async function setup(): Promise<{
  providerWallet: Wallet;
  provider: AnchorProvider;
  rpc: Rpc;
  tokenMint: PublicKey;
  smartWalletAddress: PublicKey;
  smartWalletAtaAddress: PublicKey;
}> {
  const rpcUrl = process.env.RPC_URL;

  // Create connection to local cluster
  const connection = new Connection(
    process.env.RPC_URL ?? "http://localhost:8899",
    "confirmed",
  );

  // Generate a new random keypair
  const providerWalletKeypair = Keypair.generate();
  const providerWallet = new Wallet(providerWalletKeypair);

  // Initialize the provider
  const provider = new AnchorProvider(connection, providerWallet, {
    commitment: "confirmed",
  });

  // Set this as the default provider
  setProvider(provider);

  console.log(
    colors.bold.blue(
      `Transaction sponsor public key: ${providerWalletKeypair.publicKey.toString()}`,
    ),
  );

  const airdropSignature = await connection.requestAirdrop(
    providerWalletKeypair.publicKey,
    5 * LAMPORTS_PER_SOL,
  );

  await confirmTransaction(connection, airdropSignature);

  const rpc = createRpc(rpcUrl, rpcUrl);

  const mintKeypair = new Keypair();

  const mint = await createMint(
    provider.connection,
    providerWalletKeypair,
    providerWalletKeypair.publicKey,
    providerWalletKeypair.publicKey,
    0,
    mintKeypair,
  );

  const { walletAccountAddress } = await utils.createWallet(
    provider,
    rpc,
    providerWallet.payer,
    providerWallet.publicKey,
  );

  const smartWalletAirdropSignature = await connection.requestAirdrop(
    walletAccountAddress,
    20 * LAMPORTS_PER_SOL,
  );

  await confirmTransaction(connection, smartWalletAirdropSignature);

  const solBalance = await utils.checkSolBalance(
    provider,
    walletAccountAddress,
  );

  console.log(colors.bold.blue(`Smart wallet balance: ${solBalance} SOL`));

  const walletAccountAta = await utils.createTokenAccount(
    provider,
    providerWallet.payer,
    mint,
    walletAccountAddress,
  );

  await mintTo(
    provider.connection,
    providerWallet.payer,
    mint,
    walletAccountAta.address,
    providerWallet.payer,
    1_000_000_000,
  );

  const splBalance = await utils.checkSplBalance(
    provider,
    walletAccountAta.address,
  );

  console.log(colors.bold.blue(`SPL token balance: ${splBalance}`));

  return {
    providerWallet,
    provider,
    rpc,
    tokenMint: mint,
    smartWalletAddress: walletAccountAddress,
    smartWalletAtaAddress: walletAccountAta.address,
  };
}

async function confirmTransaction(
  connection: Connection,
  signature: string,
): Promise<void> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });
}
