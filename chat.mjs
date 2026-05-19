const F5AI_CHAT_URL = "https://api.f5ai.ru/v2/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function loadApiConfig() {
  const apiKey = process.env.F5AI_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    model: process.env.F5AI_MODEL || "gpt-4.1-mini",
  };
}

export async function handler(event) {
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "method_not_allowed" }),
    };
  }

  const config = loadApiConfig();
  if (!config) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: "config_missing",
        message: "В Netlify добавьте переменную F5AI_API_KEY",
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "invalid_json", message: "Некорректный JSON" }),
    };
  }

  const instructions = String(payload.instructions || "").trim();
  const userMessage = String(payload.userMessage || "").trim();

  if (!instructions) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "missing_instructions", message: "Нет режима правки" }),
    };
  }

  if (!userMessage) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "missing_text", message: "Вставьте текст для исправления" }),
    };
  }

  try {
    const upstream = await fetch(F5AI_CHAT_URL, {
      method: "POST",
      headers: {
        "X-Auth-Token": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        instructions,
        messages: [{ role: "user", content: userMessage }],
        max_tokens: 2000,
        temperature: 0.4,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return {
        statusCode: upstream.status,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: "f5ai_error",
          message: data?.message || data?.error || "Ошибка F5AI API",
          details: data,
        }),
      };
    }

    const content = data?.message?.content || "";
    if (!content) {
      return {
        statusCode: 502,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "empty_response", message: "Пустой ответ от модели" }),
      };
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ content, model: data?.model }),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: "network_error",
        message: err.message || "Не удалось связаться с F5AI",
      }),
    };
  }
}
