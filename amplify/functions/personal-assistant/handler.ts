import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
  RetrieveAndGenerateCommandInput
} from "@aws-sdk/client-bedrock-agent-runtime";
import type { Handler } from "aws-lambda";

// Constants from environment variables
const AWS_REGION = process.env.AWS_REGION;
//const MODEL_ARN = process.env.MODEL_ARN; // Example: arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet
//const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID;
const MODEL_ARN = "arn:aws:bedrock:us-west-2:703671928942:inference-profile/us.anthropic.claude-3-haiku-20240307-v1:0";
const KNOWLEDGE_BASE_ID = "ZPPCLNX6AG";
console.log("before client call:", MODEL_ARN);
// Initialize Bedrock Agent Runtime client
const client = new BedrockAgentRuntimeClient({ region: AWS_REGION });

export const handler: Handler = async (event) => {
  console.log("event", event);
  const conversation = event.arguments.conversation;
  //const { conversation } = event.arguments;
  const lastMessage = conversation
    .slice() // don't mutate original array
    .reverse()
    .find((msg: any) => msg.role === 'user');

  const promptText = lastMessage?.content?.[0]?.text || "No prompt found";
  console.log("conversation:", conversation);
  console.log("event", event);
  console.log("promptText:", promptText);
  //const promptText = conversation.map((msg: any) => msg.content).join('\n');
  const input: RetrieveAndGenerateCommandInput = {
    input: { text: promptText },
    retrieveAndGenerateConfiguration: {
      type: "KNOWLEDGE_BASE",
      knowledgeBaseConfiguration: {
        knowledgeBaseId: KNOWLEDGE_BASE_ID,
        modelArn: MODEL_ARN,
      },
    },
  };

  try {
    console.log("try catch:", MODEL_ARN);
    const command = new RetrieveAndGenerateCommand(input);
    const response = await client.send(command);

    if (!response.output?.text) {
      console.error("No text in response:", response);

      throw new Error("No text in response");
    }
    console.log("response:", response.output.text);
    //return JSON.stringify({
    //  message: response.output.text,
    //});
    const rawText = response.output?.text || "No response from Bedrock";
    const citations = response.citations ?? [];

    const links = citations.flatMap((citation, i) =>
      citation.retrievedReferences?.map((ref, j) => {
        const location = ref.location;
        let url = "No URL available";

        if (location?.webLocation?.url) {
          url = location.webLocation.url;
        } else if (location?.s3Location?.uri) {
          url = location.s3Location.uri;
        } else if (location?.confluenceLocation?.url) {
          url = location.confluenceLocation.url;
        } else if (location?.salesforceLocation?.url) {
          url = location.salesforceLocation.url;
        } else if (location?.sharePointLocation?.url) {
          url = location.sharePointLocation.url;
        }

        const title = ref.content?.text?.slice(0, 80) || `Reference ${i + 1}.${j + 1}`;
        return `- [${title}](${url})`;
      }) || []
    ).join("\n");
    const fullResponse = `${rawText}${
      links ? `\n\n---\n**References**:\n${links}` : ""
    }`;

    return JSON.stringify({
      message: {
        role: "assistant",
        content: fullResponse || "No response from Bedrock",
      }
    });
  } catch (error) {
    console.error("Error in Bedrock knowledge base handler:", error);
    throw error;
  }
};