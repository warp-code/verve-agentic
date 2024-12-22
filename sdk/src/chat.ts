import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { addGuardian, createWallet, transferSol } from "./functions";
import type { VerveTool } from "./utils/types";

export const functions: VerveTool[] = [
  {
    type: "function",
    function: {
      name: "createWallet",
      description:
        "Creates a new Verve wallet with the agent's wallet as the initial guardian",
      parameters: {},
    },
    handler: async (provider, wallet, rpc, _params) => {
      const { signature, walletAccountAddress, walletGuardianAccountAddress } =
        await createWallet(provider, rpc, wallet.payer, wallet.publicKey);

      return { signature, walletAccountAddress, walletGuardianAccountAddress };
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
          assignedGuardian: {
            type: "string",
            description: "The public key of a guardian allowed to",
          },
          from: {
            type: "string",
            description:
              "The public key of the address the SOL will be transfered to",
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
        required: ["assignedGuardian", "from", "to", "amount"],
        additionalProperties: false,
      },
    },
    handler: async (provider, wallet, rpc, params) => {
      const paramsSchema = z.object({
        assignedGuardian: z.string(),
        from: z.string(),
        to: z.string(),
        amount: z.number(),
      });

      const parsedParams = paramsSchema.parse(params);

      const assignedGuardian = new PublicKey(parsedParams.assignedGuardian);
      const fromAddress = new PublicKey(parsedParams.from);
      const toAddress = new PublicKey(parsedParams.to);

      const signature = await transferSol(
        provider,
        rpc,
        wallet.payer,
        wallet.publicKey,
        assignedGuardian,
        fromAddress,
        toAddress,
        parsedParams.amount,
      );

      return { signature };
    },
  },
];
