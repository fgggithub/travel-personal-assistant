import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { personalAssistantFunction, MODEL_ID } from "./functions/personal-assistant/resource";

export const backend = defineBackend({
  auth,
  data,
  personalAssistantFunction,
});

backend.personalAssistantFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      "bedrock:InvokeModel",
      "bedrock:RetrieveAndGenerate",
      "bedrock:GetInferenceProfile",
      "bedrock:*"
    ],
    resources: [
      `arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
      `arn:aws:bedrock:*:703671928942:knowledge-base/ZPPCLNX6AG`,
      `arn:aws:bedrock:*:703671928942:inference-profile/us.anthropic.claude-3-haiku-20240307-v1:0`  
    ],
  })
);