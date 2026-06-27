"use server";

import { getOllamaModels, testOllamaConnection } from "./ollama";

export async function checkOllamaConnection() {
  return testOllamaConnection();
}

export async function loadOllamaModels() {
  return getOllamaModels();
}
