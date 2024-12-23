import type { Provider, Wallet } from "@coral-xyz/anchor";
import type { Rpc } from "@lightprotocol/stateless.js";
import { tools } from "@verve-agentic/sdk";
import type { VerveTool } from "@verve-agentic/sdk/lib/types/utils/types";
import colors from "colors";
import readlineSync from "readline-sync";
import { z } from "zod";
import openai from "./openai";
import { setup } from "./utils";

// Function to handle tool calls
async function handleToolCalls(
  toolCalls: any[],
  provider: Provider,
  rpc: Rpc,
  wallet: Wallet,
  tools: VerveTool[],
): Promise<{ tool_call_id: any; output: string }[]> {
  const toolResults = [];

  for (const toolCall of toolCalls) {
    if (toolCall.type === "function") {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      console.log(colors.gray(`functionName: ${functionName}`));
      console.log(
        colors.gray(`functionArgs: ${JSON.stringify(functionArgs, null, 2)}`),
      );

      const selectedTool = tools.find(x => x.function.name === functionName);

      if (selectedTool == null) {
        throw new Error(`Unknown function: ${functionName}`);
      }

      const result = await selectedTool.handler(
        provider,
        wallet,
        rpc,
        functionArgs,
      );

      toolResults.push({
        tool_call_id: toolCall.id,
        output: JSON.stringify(result),
      });
    }
  }

  return toolResults;
}

async function main(): Promise<void> {
  console.log(
    colors.bold.white(`Welcome to the Verve Agentic Wallet example Agent!`),
  );

  console.log(colors.bold.white(`Setting up Agent, please wait...`));

  const {
    provider,
    rpc,
    providerWallet,
    smartWalletAddress,
    smartWalletAtaAddress,
    tokenMint,
  } = await setup();

  const exampleTools: VerveTool[] = [
    ...tools,
    <VerveTool>{
      type: "function",
      function: {
        name: "getManagementUrl",
        description:
          "Returns an URL to the web ui which the user can use to manage their Verve wallet",
        parameters: {
          type: "object",
          properties: {
            walletAddress: {
              type: "string",
              description: "The public key of the Verve smart wallet",
            },
          },
          required: ["walletAddress"],
          additionalProperties: false,
        },
      },
      handler: async (_provider, _wallet, _rpc, params) => {
        const paramsSchema = z.object({
          walletAddress: z.string(),
        });

        const parsedParams = paramsSchema.parse(params);

        const managementUrl = process.env.MANAGEMENT_URL;

        return {
          url: `${managementUrl}?wallet=${parsedParams.walletAddress}&seedGuardian=${providerWallet.publicKey}`,
        };
      },
    },
  ];

  // Store conversation history
  const chatHistory: any[][] = [
    ["user", `The smart wallet address is ${smartWalletAddress.toBase58()}`],
    ["user", `The mint address is ${tokenMint.toBase58()}`],
    [
      "user",
      `The smart wallet's ATA address is ${smartWalletAtaAddress.toBase58()}`,
    ],
  ];

  console.log(
    colors.bold.green(
      `The Agent's smart wallet address is ${smartWalletAddress.toBase58()}\r\nYou can ask the agent to share custody over this wallet with you.`,
    ),
  );

  console.log(
    colors.bold.green(
      `An example SPL token mint has been set up: ${tokenMint.toBase58()}`,
    ),
  );

  console.log(
    colors.bold.green(
      `The smart wallet's ATA address is ${smartWalletAtaAddress.toBase58()}`,
    ),
  );

  console.log(colors.bold.white(`You can start chatting with the Agent.`));

  while (true) {
    const userInput = readlineSync.question(colors.yellow("You: "));

    if (userInput.toLowerCase() === "exit") {
      return;
    }

    try {
      // Construct messages by iterating over the history
      const messages: any = chatHistory.map(([role, content]) => ({
        role,
        content,
      }));

      // Add latest user input
      messages.push({ role: "user", content: userInput });

      // Call API with user input and tool definitions
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        tools: exampleTools,
        tool_choice: "auto",
      });

      const responseMessage = completion.choices[0]?.message;

      if (!responseMessage) {
        throw new Error("No response received from API");
      }

      // Handle tool calls if present
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        console.log(
          colors.blue("Agent is using tools to process your request..."),
        );

        // Execute tool calls
        const toolResults = await handleToolCalls(
          responseMessage.tool_calls,
          provider,
          rpc,
          providerWallet,
          exampleTools,
        );

        // Add tool calls and results to messages
        messages.push(responseMessage);

        for (const tcr of toolResults) {
          messages.push({
            role: "tool",
            content: tcr.output,
            tool_call_id: tcr.tool_call_id,
          });
        }

        // Get final response after tool use
        const finalCompletion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: messages,
        });

        const completionText = finalCompletion.choices[0]?.message.content;
        console.log(colors.green("Agent: ") + completionText);

        // Update history with user input and final assistant response
        chatHistory.push(["user", userInput]);
        chatHistory.push(["assistant", completionText]);
      } else {
        // Handle regular response without tool calls
        const completionText = responseMessage.content;

        console.log(colors.green("Agent: ") + completionText);

        // Update history with user input and assistant response
        chatHistory.push(["user", userInput]);
        chatHistory.push(["assistant", completionText]);
      }
    } catch (error) {
      console.error(colors.red(error as string));
    }
  }
}

main();
