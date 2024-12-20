import openai from "./openai";
import readlineSync from "readline-sync";
import colors from "colors";
import type { ChatCompletionTool } from "openai/resources";
import { createWallet } from "../../sdk/src/index";

// Define available tools/functions
const availableTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_current_weather",
      description: "Get the current weather in a given location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and state, e.g. San Francisco, CA",
          },
          unit: {
            type: "string",
            enum: ["celsius", "fahrenheit"],
          },
        },
        required: ["location"],
      },
    },
  },
  // Add more tools here as needed
];

// Function to handle tool calls
async function handleToolCalls(toolCalls: any[]) {
  const toolResults = [];

  for (const toolCall of toolCalls) {
    if (toolCall.type === "function") {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      // Handle different function calls
      switch (functionName) {
        case "get_current_weather":
          // Implement actual weather API call here
          const weatherResult = {
            temperature: 22,
            unit: functionArgs.unit || "celsius",
            description: "Sunny",
          };
          toolResults.push({
            tool_call_id: toolCall.id,
            output: JSON.stringify(weatherResult),
          });
          break;
        // Add more function handlers here
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }
    }
  }

  return toolResults;
}

async function main() {
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
        tools: availableTools,
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
        const toolResults = await handleToolCalls(responseMessage.tool_calls);

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
