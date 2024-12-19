import openai from "./openai";
import readlineSync from "readline-sync";
import colors from "colors";
import type { ChatCompletionTool, FunctionDefinition } from "openai/resources";

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
  console.log(colors.bold.green("Welcome to the Chatbot Program !"));
  console.log(colors.bold.green("You can start chating with the bot"));

  const chatHistory = []; //Store conversation hisory

  while (true) {
    const userInput = readlineSync.question(colors.yellow("You: "));

    try {
      //Construct messages by iterating over the history
      const messages: any = chatHistory.map(([role, content]) => ({
        role,
        content,
      }));

      // Add latest user input
      messages.push({ role: "user", content: userInput });

      //Call API with user input
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        // tools: availableTools,
        // tool_choice: "auto",
      });

      const completionText = completion.choices[0]!.message.content;

      if (userInput.toLocaleLowerCase() == "exit") {
        console.log(colors.green("Bot: ") + completionText);
        return;
      }

      console.log(colors.green("Bot: ") + completionText);

      //Update history with user input and assistant response
      chatHistory.push(["user", userInput]);
      chatHistory.push(["assistant", completionText]);
    } catch (error) {
      console.error(colors.red(error as string));
    }
  }
}

main();
