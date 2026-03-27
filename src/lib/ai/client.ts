import Anthropic from "@anthropic-ai/sdk";

const globalForAi = globalThis as unknown as { anthropic?: Anthropic };

export const anthropic =
  globalForAi.anthropic ??
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (process.env.NODE_ENV !== "production") globalForAi.anthropic = anthropic;
