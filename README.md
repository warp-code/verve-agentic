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

3. To install packages for the `program` directory run the following command

```sh
cd program
yarn
```

### Envirnonment variables

Create `.env` files in `explorer` and `example` directories based on the `.env.template` files.

### Running the example

#### Program

1. Navigate to the `program` directory
2. Run `avm use` to use the appropriate anchor version
3. Run `yarn build` to build the program

#### SDK

1. Navigate to the `sdk` directory
2. Run `yarn build` to build the sdk

#### Agent

1. Navigate to the `agent` directory
2. Run `yarn dev` to start the agent

#### Explorer

1. Run `yarn dev` to start the explorer
