# Verve Agentic

## Setup instructions

### Installation

1. Yarn workspaces must be enabled
   Run the following command to enable yarn workspaces:

```sh
   yarn config set workspaces-experimental true
```

2. To install packages for `example`, `sdk`, and `explorer`, run the following command in the root directory.

```sh
yarn
```

3. To install packages for the `program` directory and build the program run the following command

```sh
cd program
yarn
yarn build
```

### Envirnonment variables

Create `.env` files in `explorer` and `example` directories based on the `.env.template` files.

### Running the example

#### SDK

Navigate to the `sdk` directory and run the following command to build the SDK:

```sh
yarn build
```

#### Agent

Navigate to the `agent` directory and run the following command to start the agent:

```sh
yarn dev
```

#### Explorer

Navigate to the `explorer` directory and run the following command to start the explorer:

```sh
yarn dev
```

## How to use

Start the `agent` and `explorer`.

The agent will set up a Verve smart wallet and print an explorer link which you can use to manage the verve smart wallet.

The agent has the following tools at its disposal provided by the SDK:

- addGuardian
- checkSolBalance
- checkSplBalance
- transferSol
- transferSpl

You can ask the agent to print you all the tools it has at its disposal:

```txt
List all the tools you have access to and their parameters.

```

Connect a wallet to the the explorer and tell the agent to add the wallet as a guardian for Verve's smart wallet

Your wallet should now be able to transfer SOL and SPL tokens from your Verve smart wallet to your connected wallet using the explorer.
