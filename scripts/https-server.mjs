import https from "node:https";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateImage, loadApiConfig } from "./f5ai-shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IS_CLOUD =
  Boolean(process.env.RENDER) ||
  Boolean(process.env.RAILWAY_ENVIRONMENT) ||
  process.env.NODE_ENV === "production";
const USE_LOCAL_HTTPS = process.env.USE_LOCAL_HTTPS === "1" || (!IS_CLOUD && !process.env.PORT);
const PORT = Number(process.env.PORT) || (USE_LOCAL_HTTPS ? 8443 : 3000);
const CERT = path.join(ROOT, "certs", "localhost.pfx");
const PASS = "prompt-studio";
const F5AI_CHAT_URL = "https://api.f5ai.ru/v2/chat/completions";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function sendJson(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extraHeaders,
  });
  res.end(body);
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = decoded === "/" ? "/index.html" : decoded;
  const resolved = path.normalize(path.join(ROOT, relative));

  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, err.code === "ENOENT" ? 404 : 500, err.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
    if (ext === ".html" || ext === ".js" || ext === ".css") {
      headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleChatApi(req, res) {
  const config = loadApiConfig();
  if (!config?.apiKey) {
    sendJson(res, 500, {
      error: "config_missing",
      message: "Создайте config.local.json из config.example.json с API-ключом F5AI",
    });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    sendJson(res, 400, { error: "invalid_json", message: "Некорректный JSON" });
    return;
  }

  const instructions = String(payload.instructions || "").trim();
  const userMessage = String(payload.userMessage || "").trim();

  if (!instructions) {
    sendJson(res, 400, { error: "missing_instructions", message: "Нет системного промпта" });
    return;
  }

  const f5Body = {
    model: config.model || "gpt-4.1-mini",
    instructions,
    messages: [
      {
        role: "user",
        content:
          userMessage ||
          "Дай краткий практичный ответ по этому сценарию. Учти, что результат для Telegram Mini App.",
      },
    ],
    max_tokens: 1500,
    temperature: 0.7,
  };

  try {
    const upstream = await fetch(F5AI_CHAT_URL, {
      method: "POST",
      headers: {
        "X-Auth-Token": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(f5Body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      sendJson(res, upstream.status, {
        error: "f5ai_error",
        message: data?.message || data?.error || "Ошибка F5AI API",
        details: data,
      });
      return;
    }

    sendJson(res, 200, {
      content: data?.message?.content || "",
      model: data?.model,
      usage: data?.usage,
    });
  } catch (err) {
    sendJson(res, 502, {
      error: "network_error",
      message: err.message || "Не удалось связаться с F5AI",
    });
  }
}

async function handleImageApi(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    sendJson(res, 400, { error: "invalid_json", message: "Некорректный JSON" });
    return;
  }

  const prompt = String(payload.prompt || "").trim();
  if (!prompt) {
    sendJson(res, 400, { error: "missing_prompt", message: "Нет промпта для изображения" });
    return;
  }

  try {
    const result = await generateImage({ prompt, config: loadApiConfig() });
    sendJson(res, 200, result);
  } catch (err) {
    const status = err.status || (err.code === "config_missing" ? 500 : 502);
    sendJson(res, status, {
      error: err.code || "f5ai_error",
      message: err.message,
      details: err.details,
    });
  }
}

async function handleRequest(req, res) {
  const url = req.url || "/";

  if (req.method === "OPTIONS" && url.startsWith("/api/")) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method === "POST" && url === "/api/chat") {
    await handleChatApi(req, res);
    return;
  }

  if (req.method === "POST" && url === "/api/image") {
    await handleImageApi(req, res);
    return;
  }

  const filePath = safePath(url);
  if (!filePath) {
    send(res, 403, "Forbidden");
    return;
  }
  serveFile(res, filePath);
}

function startServer() {
  const hasKey = Boolean(loadApiConfig()?.apiKey);

  if (USE_LOCAL_HTTPS) {
    if (!fs.existsSync(CERT)) {
      console.error("Сертификат не найден. Сначала запустите: .\\start-https.ps1");
      process.exit(1);
    }
    const options = {
      pfx: fs.readFileSync(CERT),
      passphrase: PASS,
    };
    https.createServer(options, handleRequest).listen(PORT, "127.0.0.1", () => {
      console.log("");
      console.log("  Локальный HTTPS запущен");
      console.log(`  Откройте: https://localhost:${PORT}`);
      console.log(`  F5AI ключ: ${hasKey ? "загружен" : "НЕ НАЙДЕН"}`);
      console.log("");
    });
    return;
  }

  http.createServer(handleRequest).listen(PORT, "0.0.0.0", () => {
    console.log("");
    console.log("  Сервер запущен (облако добавит HTTPS)");
    console.log(`  Порт: ${PORT}`);
    console.log(`  F5AI ключ: ${hasKey ? "загружен" : "задайте F5AI_API_KEY"}`);
    console.log("");
  });
}

startServer();
