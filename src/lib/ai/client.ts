import Anthropic from "@anthropic-ai/sdk";

declare global {
  // eslint-disable-next-line no-var
  var __anthropicSingleton: Anthropic | undefined;
}

const globalForAi = globalThis;

export const anthropic =
  globalForAi.__anthropicSingleton ??
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (process.env.NODE_ENV !== "production") globalForAi.__anthropicSingleton = anthropic;
