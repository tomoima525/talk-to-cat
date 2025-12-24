import { XAIMessage } from "./types";

export const toolings = [
  {
    type: "web_search",
  },
  {
    type: "x_search",
    fromDate: "2025-01-01",
    toDate: "2025-12-31",
  },
  {
    type: "function",
    name: "generate_random_number",
    description: "Generate a random number between min and max values",
    parameters: {
      type: "object",
      properties: {
        min: {
          type: "number",
          description: "Minimum value (inclusive)",
        },
        max: {
          type: "number",
          description: "Maximum value (inclusive)",
        },
      },
      required: ["min", "max"],
    },
  },
];

export async function handleFunctionCallArguments(
  message: XAIMessage,
  sendMessage: (message: XAIMessage) => void
): Promise<void> {
  const { name, call_id } = message;

  let output = null;
  try {
    switch (name) {
      case "generate_random_number": {
        const { min, max } = JSON.parse(message.arguments);
        if (typeof min !== "number" || typeof max !== "number") {
          throw new Error("Invalid arguments");
        }
        const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
        output = {
          type: "text",
          text: randomNumber.toString(),
        };
        break;
      }
      default:
        throw new Error(`Unknown function name: ${name}`);
    }
  } catch (error) {
    console.error(`[${message.call_id}] ❌ Error handling function call arguments:`, error);
    return;
  }

  sendMessage({
    type: "conversation.item.create",
    item: {
      type: "function_call_output",
      call_id,
      output: JSON.stringify(output),
    },
  });

  sendMessage({
    type: "response.create",
  });
}
