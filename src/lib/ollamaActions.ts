"use server";

import {
  generateWithOllama,
  getOllamaModels,
  testOllamaConnection,
} from "./ollama";

export async function checkOllamaConnection() {
  return testOllamaConnection();
}

export async function loadOllamaModels() {
  return getOllamaModels();
}

export async function runOllamaGenerate({
  model,
  prompt,
}: {
  model: string;
  prompt: string;
}) {
  return generateWithOllama(model, prompt);
}
