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
