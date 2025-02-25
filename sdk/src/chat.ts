import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import {
  addGuardian,
  checkSolBalance,
  checkSplBalance,
  transferSol,
  transferSplToken,
} from "./functions";
import { deriveWalletAddress } from "./utils/functions";
import type { VerveTool } from "./utils/types";

export const verveTools: VerveTool[] = [
  {
    type: "function",
    function: {
      name: "checkSolBalance",
      description: "Returns the balance of the Verve smart wallet in SOL",
      parameters: {},
    },
    handler: async (provider, wallet, _rpc, _params) => {
      const walletAddress = deriveWalletAddress(wallet.publicKey);

      const balance = await checkSolBalance(provider, walletAddress);

      return { balance: `${balance} SOL` };
    },
  },
  {
    type: "function",
    function: {
      name: "checkSplBalance",
      description: "Returns the balance of the SPL token for ",
      parameters: {
        type: "object",
        properties: {
          mint: {
            type: "string",
            description: "The public key of the mint",
          },
        },
        required: ["mint"],
        additionalProperties: false,
      },
    },
    handler: async (provider, wallet, _rpc, params) => {
      const paramsSchema = z.object({
        mint: z.string(),
      });

      const parsedParams = paramsSchema.parse(params);

      const mint = new PublicKey(parsedParams.mint);

      const walletAddress = deriveWalletAddress(wallet.publicKey);

      const ata = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet.payer,
        mint,
        walletAddress,
        true,
        "confirmed",
      );

      const balance = await checkSplBalance(provider, ata.address);

      return { balance: balance.toString() };
    },
  },
  {
    type: "function",
    function: {
      name: "addGuardian",
      description: "Adds a wallet guardian to an existing Verve wallet",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          assignedGuardian: {
            type: "string",
            description:
              "The public key that is going to become the wallet guardian",
          },
        },
        required: ["assignedGuardian"],
        additionalProperties: false,
      },
    },
    handler: async (provider, wallet, rpc, params) => {
      const paramsSchema = z.object({
        assignedGuardian: z.string(),
      });

      const parsedParams = paramsSchema.parse(params);

      const assignedGuardian = new PublicKey(parsedParams.assignedGuardian);

      const { signature, walletAccountAddress, walletGuardianAccountAddress } =
        await addGuardian(
          provider,
          rpc,
          wallet.payer,
          wallet.publicKey,
          assignedGuardian,
        );

      return { signature, walletAccountAddress, walletGuardianAccountAddress };
    },
  },
  {
    type: "function",
    function: {
      name: "transferSol",
      description:
        "Transfers an amount in SOL from the Verve wallet to a specified address",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description:
              "The public key of the address the SOL will be transfered to",
          },
          amount: {
            type: "number",
            description: "The amount of SOL that will be transfered",
          },
        },
        required: ["to", "amount"],
        additionalProperties: false,
      },
    },
    handler: async (provider, wallet, rpc, params) => {
      const paramsSchema = z.object({
        to: z.string(),
        amount: z.number(),
      });

      const parsedParams = paramsSchema.parse(params);
      const toAddress = new PublicKey(parsedParams.to);

      const walletAddress = deriveWalletAddress(wallet.publicKey);

      const signature = await transferSol(
        provider,
        rpc,
        wallet.payer,
        wallet.publicKey,
        wallet.payer,
        walletAddress,
        toAddress,
        parsedParams.amount,
      );

      return { signature };
    },
  },
  {
    type: "function",
    function: {
      name: "transferSpl",
      description:
        "Transfers an amount in SOL from the Verve wallet to a specified address",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          mint: {
            type: "string",
            description: "The public key of the mint",
          },
          to: {
            type: "string",
            description:
              "The public key of the address the SOL will be transfered to",
          },
          amount: {
            type: "number",
            description: "The amount of SOL that will be transfered",
          },
        },
        required: ["mint", "to", "amount"],
        additionalProperties: false,
      },
    },
    handler: async (provider, wallet, rpc, params) => {
      const paramsSchema = z.object({
        mint: z.string(),
        to: z.string(),
        amount: z.number(),
      });

      const parsedParams = paramsSchema.parse(params);

      const mint = new PublicKey(parsedParams.mint);
      const toAddress = new PublicKey(parsedParams.to);

      const walletAddress = deriveWalletAddress(wallet.publicKey);

      const fromAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet.payer,
        mint,
        walletAddress,
        true,
        "confirmed",
      );

      if (fromAta.amount < parsedParams.amount) {
        return { error: "Insuficient token balance" };
      }

      const toAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet.payer,
        mint,
        toAddress,
        true,
        "confirmed",
      );

      const signature = await transferSplToken(
        provider,
        rpc,
        wallet.payer,
        wallet.publicKey,
        wallet.payer,
        fromAta.address,
        toAta.address,
        walletAddress,
        parsedParams.amount,
      );

      return { signature };
    },
  },
];
