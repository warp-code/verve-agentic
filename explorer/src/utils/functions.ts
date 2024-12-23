import { PublicKey } from "@solana/web3.js";

export function shortenPublicKey(publicKey: PublicKey) {
  const publicKeyString = publicKey.toBase58();
  return `${publicKeyString.slice(0, 4)}...${publicKeyString.slice(-4)}`;
}
