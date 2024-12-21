/// OLD TOOLS

import type OpenAI from "openai";

// Define available tools/functions
const availableTools: OpenAI.ChatCompletionTool[] = [
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

      console.log(functionArgs);

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
