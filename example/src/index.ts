import openai from "./openai";
import readlineSync from "readline-sync";
import colors from "colors";
import { setup } from "./utils";
import { tools } from "@verve-agentic/sdk";
import type { Provider, Wallet } from "@coral-xyz/anchor";
import type { Rpc } from "@lightprotocol/stateless.js";

// Function to handle tool calls
async function handleToolCalls(
  toolCalls: any[],
  provider: Provider,
  rpc: Rpc,
  wallet: Wallet,
) {
  const toolResults = [];

  for (const toolCall of toolCalls) {
    if (toolCall.type === "function") {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

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

async function main() {
  const { provider, rpc, wallet } = await setup();

  console.log(colors.bold.green("Welcome to the Chatbot Program!"));
  console.log(colors.bold.green("You can start chatting with the bot"));

  const chatHistory = []; // Store conversation history

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
        tools: tools,
        tool_choice: "auto",
      });

      const responseMessage = completion.choices[0]?.message;

      if (!responseMessage) {
        throw new Error("No response received from API");
      }

      // Handle tool calls if present
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        console.log(
          colors.blue("Bot is using tools to process your request..."),
        );

        // Execute tool calls
        const toolResults = await handleToolCalls(
          responseMessage.tool_calls,
          provider,
          rpc,
          wallet,
        );

        // Add tool calls and results to messages
        messages.push(responseMessage);

        for (let tcr of toolResults) {
          messages.push({
            role: "tool",
            content: tcr.output,
            tool_call_id: tcr.tool_call_id,
          });
        }
        // messages.push({
        //   role: "tool",
        //   content: JSON.stringify(toolResults),
        //   tool_call_id: responseMessage.tool_calls[0]!.id,
        // });

        // Get final response after tool use
        const finalCompletion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: messages,
        });

        const completionText = finalCompletion.choices[0]?.message.content;
        console.log(colors.green("Bot: ") + completionText);

        // Update history with user input and final assistant response
        chatHistory.push(["user", userInput]);
        chatHistory.push(["assistant", completionText]);
      } else {
        // Handle regular response without tool calls
        const completionText = responseMessage.content;

        console.log(colors.green("Bot: ") + completionText);

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
