import { corsHeaders, generateImage, loadApiConfig } from "../../scripts/f5ai-shared.mjs";

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

  const prompt = String(payload.prompt || "").trim();
  if (!prompt) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "missing_prompt", message: "Нет промпта" }),
    };
  }

  try {
    const result = await generateImage({ prompt, config: loadApiConfig() });
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify(result),
    };
  } catch (err) {
    const status = err.status || (err.code === "config_missing" ? 500 : 502);
    return {
      statusCode: status,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: err.code || "f5ai_error",
        message: err.message,
        details: err.details,
      }),
    };
  }
}
