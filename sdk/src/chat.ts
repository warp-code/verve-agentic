import {
  addGuardian,
  checkSplBalance,
  createTokenAccount,
  createWallet,
  transferSol,
  transferSplToken,
} from "./index";

const functions = [
  {
    name: "createWallet",
    description: "Creates a new Verve wallet with an initial guardian",
    parameters: {
      type: "object",
      required: ["guardian"],
      properties: {
        guardian: {
          type: "object",
          description:
            "The keypair that will serve as the initial guardian for the wallet",
          required: ["publicKey", "secretKey"],
          properties: {
            publicKey: {
              type: "string",
              description: "Base58 encoded public key",
            },
            secretKey: {
              type: "string",
              description: "Base58 encoded secret key",
            },
          },
        },
      },
    },
    returns: {
      type: "string",
      description: "Base58 encoded public key of the newly created wallet",
    },
  },
  {
    name: "addGuardian",
    description: "Adds an additional guardian to an existing wallet",
    parameters: {
      type: "object",
      required: ["wallet", "existingGuardian", "newGuardian"],
      properties: {
        wallet: {
          type: "string",
          description: "Base58 encoded public key of the target wallet",
        },
        existingGuardian: {
          type: "object",
          description: "A current guardian's keypair to authorize the addition",
          required: ["publicKey", "secretKey"],
          properties: {
            publicKey: {
              type: "string",
              description: "Base58 encoded public key",
            },
            secretKey: {
              type: "string",
              description: "Base58 encoded secret key",
            },
          },
        },
        newGuardian: {
          type: "string",
          description: "Base58 encoded public key of the new guardian to add",
        },
      },
    },
  },
  {
    name: "transferSol",
    description: "Transfers SOL from the wallet to a specified address",
    parameters: {
      type: "object",
      required: ["guardian", "from", "to", "amount"],
      properties: {
        guardian: {
          type: "object",
          description: "The keypair of an authorized guardian",
          required: ["publicKey", "secretKey"],
          properties: {
            publicKey: {
              type: "string",
              description: "Base58 encoded public key",
            },
            secretKey: {
              type: "string",
              description: "Base58 encoded secret key",
            },
          },
        },
        from: {
          type: "string",
          description: "Base58 encoded public key of the source wallet",
        },
        to: {
          type: "string",
          description: "Base58 encoded public key of the destination address",
        },
        amount: {
          type: "number",
          description:
            "Amount of SOL to transfer in lamports (1 SOL = 1,000,000,000 lamports)",
        },
      },
    },
  },
  {
    name: "transferSplToken",
    description: "Transfers SPL tokens between associated token accounts",
    parameters: {
      type: "object",
      required: ["guardian", "fromAta", "toAta", "amount"],
      properties: {
        guardian: {
          type: "object",
          description: "The keypair of an authorized guardian",
          required: ["publicKey", "secretKey"],
          properties: {
            publicKey: {
              type: "string",
              description: "Base58 encoded public key",
            },
            secretKey: {
              type: "string",
              description: "Base58 encoded secret key",
            },
          },
        },
        fromAta: {
          type: "string",
          description:
            "Base58 encoded public key of the source associated token account",
        },
        toAta: {
          type: "string",
          description:
            "Base58 encoded public key of the destination associated token account",
        },
        amount: {
          type: "number",
          description:
            "Amount of tokens to transfer in the smallest denomination",
        },
      },
    },
  },
  {
    name: "createTokenAccount",
    description: "Creates an associated token account for the wallet",
    parameters: {
      type: "object",
      required: ["wallet", "mint"],
      properties: {
        wallet: {
          type: "string",
          description: "Base58 encoded public key of the wallet",
        },
        mint: {
          type: "string",
          description: "Base58 encoded public key of the token's mint address",
        },
      },
    },
    returns: {
      type: "string",
      description:
        "Base58 encoded public key of the newly created associated token account",
    },
  },
  {
    name: "checkSplBalance",
    description: "Retrieves the token balance of an associated token account",
    parameters: {
      type: "object",
      required: ["ata"],
      properties: {
        ata: {
          type: "string",
          description:
            "Base58 encoded public key of the associated token account to check",
        },
      },
    },
    returns: {
      type: "number",
      description: "Current token balance in the smallest denomination",
    },
  },
];