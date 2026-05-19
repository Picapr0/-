import { corsHeaders, generateImage, loadApiConfig } from "../scripts/f5ai-shared.mjs";

export default async function handler(req, res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) {
    res.status(400).json({ error: "missing_prompt", message: "Нет промпта" });
    return;
  }

  try {
    const result = await generateImage({ prompt, config: loadApiConfig() });
    res.status(200).json(result);
  } catch (err) {
    const status = err.status || (err.code === "config_missing" ? 500 : 502);
    res.status(status).json({
      error: err.code || "f5ai_error",
      message: err.message,
      details: err.details,
    });
  }
}
