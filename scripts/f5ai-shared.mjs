import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT, "config.local.json");

export const F5AI_IMAGE_URL = "https://api.f5ai.ru/v2/images/generations";

export function extractImageUrl(data) {
  const first = data?.data?.[0] || data?.images?.[0] || data?.image;
  if (!first) return data?.url || null;
  if (typeof first === "string") return first;
  if (first.url) return first.url;
  if (first.b64_json) return `data:image/png;base64,${first.b64_json}`;
  return null;
}

export function loadApiConfig() {
  if (process.env.F5AI_API_KEY) {
    return {
      apiKey: process.env.F5AI_API_KEY,
      imageModel: process.env.F5AI_IMAGE_MODEL || "dall-e-3",
      imageSize: process.env.F5AI_IMAGE_SIZE || "1024x1024",
    };
  }

  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const json = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      if (json.apiKey) return json;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export async function generateImage({ prompt, config }) {
  if (!config?.apiKey) {
    const err = new Error("Создайте config.local.json или задайте F5AI_API_KEY");
    err.code = "config_missing";
    throw err;
  }

  const f5Body = {
    prompt,
    model: config.imageModel || "dall-e-3",
    size: config.imageSize || "1024x1024",
  };

  const upstream = await fetch(F5AI_IMAGE_URL, {
    method: "POST",
    headers: {
      "X-Auth-Token": config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(f5Body),
  });

  const data = await upstream.json();

  if (!upstream.ok) {
    const err = new Error(data?.message || data?.error || "Ошибка F5AI API");
    err.status = upstream.status;
    err.details = data;
    throw err;
  }

  const imageUrl = extractImageUrl(data);
  if (!imageUrl) {
    const err = new Error("API не вернул изображение");
    err.code = "no_image";
    err.details = data;
    throw err;
  }

  return { imageUrl, model: data?.model || f5Body.model };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
