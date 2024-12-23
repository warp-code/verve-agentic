import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  // getAccount,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getOrCreateAta } from "@/utils/ata";
import { Button } from "./ui/button";

interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  symbol: string;
}

interface WalletBalanceProps {
  walletAddress: string;
}

const WalletBalance: React.FC<WalletBalanceProps> = ({ walletAddress }) => {
  const { connection } = useConnection();
  const { wallet: userWallet, publicKey: userPublicKey } = useWallet();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const retrieveToken = async (mint: string) => {
    if (!userPublicKey) {
      console.error("No user public key found!");
      return;
    }

    const mintPubkey = new PublicKey(mint);

    const userTokenAccount = await getOrCreateAta(
      mintPubkey,
      userPublicKey,
      connection,
      userWallet,
    );

    console.log(userTokenAccount?.address.toBase58());

    const amount = Number.parseInt(
      prompt("Enter an amount to retrieve") ?? "0",
    );

    if (amount > 0) {
    }
  };

  const fetchBalances = async () => {
    if (!walletAddress) {
      setError("Please provide a wallet address");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const pubkey = new PublicKey(walletAddress);

      // Fetch SOL balance
      const balance = await connection.getBalance(pubkey);
      console.log(balance);
      setSolBalance(balance / LAMPORTS_PER_SOL);

      // Fetch all token accounts
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        pubkey,
        {
          programId: TOKEN_PROGRAM_ID,
        },
      );

      // Process token balances
      const balances = tokenAccounts.value.map(account => {
        const parsedInfo = account.account.data.parsed.info;
        return {
          mint: parsedInfo.mint,
          amount: parsedInfo.tokenAmount.uiAmount,
          decimals: parsedInfo.tokenAmount.decimals,
          symbol: parsedInfo.symbol || "Unknown Token",
        };
      });

      // Filter out zero balances
      const nonZeroBalances = balances.filter(balance => balance.amount > 0);
      setTokenBalances(nonZeroBalances);
    } catch (err) {
      if (err instanceof TokenAccountNotFoundError) {
        setError("No token accounts found for this wallet");
      } else {
        setError("Failed to fetch wallet balances");
        console.error("Error fetching wallet balances:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          <div className="text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-xl">Wallet Balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-b pb-4">
          <div className="font-medium text-gray-600">SOL Balance</div>
          <div className="text-2xl font-bold">{solBalance?.toFixed(4)} SOL</div>
        </div>

        {tokenBalances.length > 0 ? (
          <div>
            <div className="mb-2 font-medium text-gray-600">Token Balances</div>
            <div className="space-y-2">
              {tokenBalances.map((token, index) => (
                <div
                  key={`${token.mint}-${index}`}
                  className="flex items-center justify-between border-b py-2 last:border-0"
                >
                  <span className="font-medium">{token.symbol}</span>
                  <span>{token.amount.toFixed(token.decimals)}</span>
                  <span>
                    <Button onClick={() => retrieveToken(token.mint)}>
                      Retrieve
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-gray-500">No token balances found</div>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletBalance;
