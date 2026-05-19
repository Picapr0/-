const PROMPTS = [
  {
    id: "grammar",
    icon: "✏️",
    title: "Грамматика",
    description: "Орфография, пунктуация, опечатки",
    accent: "card--accent-1",
    text: `Ты профессиональный редактор русского языка. Исправь орфографию, пунктуацию и грамматические ошибки в тексте пользователя. Сохрани смысл и тон. Не добавляй пояснений — верни только исправленный текст.`,
  },
  {
    id: "style",
    icon: "📝",
    title: "Стиль и ясность",
    description: "Убрать воду, улучшить читаемость",
    accent: "card--accent-2",
    text: `Ты редактор. Улучши стиль текста: убери повторы, канцелярит и лишние слова, сделай формулировки ясными и естественными. Сохрани смысл. Верни только исправленный текст без комментариев.`,
  },
  {
    id: "formal",
    icon: "💼",
    title: "Деловой стиль",
    description: "Официально и вежливо",
    accent: "card--accent-3",
    text: `Ты редактор деловой переписки. Перепиши текст в вежливом официальном стиле, подходящем для писем, заявлений и сообщений коллегам. Сохрани смысл. Верни только исправленный текст.`,
  },
];

const cardsEl = document.getElementById("prompt-cards");
const toastEl = document.getElementById("toast");
const toastTextEl = document.getElementById("toast-text");
const statusHintEl = document.getElementById("status-hint");
const userInputEl = document.getElementById("user-input");
const inputModeEl = document.getElementById("input-mode");
const copyBtnEl = document.getElementById("copy-btn");
const loaderEl = document.getElementById("loader");

let toastTimer = null;
let lastPromptId = null;
let busy = false;

const tg = window.Telegram?.WebApp;
const CHAT_API_URLS = ["/api/chat", "/api/image"];

function cleanAiText(text) {
  let t = String(text || "").trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  return t;
}

function initTelegram() {
  if (!tg) return;

  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation?.();

  const theme = tg.themeParams;
  if (theme?.bg_color) document.documentElement.style.setProperty("--bg", theme.bg_color);
  if (theme?.text_color) document.documentElement.style.setProperty("--text", theme.text_color);
  if (theme?.hint_color) document.documentElement.style.setProperty("--text-muted", theme.hint_color);
  if (theme?.button_color) document.documentElement.style.setProperty("--accent-1", theme.button_color);

  tg.setHeaderColor?.("secondary_bg_color");
}

function renderCards() {
  cardsEl.innerHTML = PROMPTS.map(
    (p) => `
    <button type="button" class="card ${p.accent}" data-id="${p.id}" aria-label="Исправить: ${p.title}">
      <div class="card__inner">
        <span class="card__icon" aria-hidden="true">${p.icon}</span>
        <div class="card__body">
          <h2 class="card__title">${p.title}</h2>
          <p class="card__desc">${p.description}</p>
        </div>
        <span class="card__tag">Текст</span>
      </div>
    </button>
  `
  ).join("");

  cardsEl.querySelectorAll(".card").forEach((btn) => {
    btn.addEventListener("click", () => handlePromptClick(btn.dataset.id));
  });
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

function showToast(message) {
  toastTextEl.textContent = message;
  toastEl.hidden = false;
  toastEl.classList.add("toast--visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("toast--visible");
    setTimeout(() => { toastEl.hidden = true; }, 350);
  }, 2200);
}

function haptic(type = "light") {
  tg?.HapticFeedback?.impactOccurred(type);
}

function setLoading(on) {
  busy = on;
  loaderEl.hidden = !on;
  loaderEl.setAttribute("aria-busy", on ? "true" : "false");
  cardsEl.querySelectorAll(".card").forEach((btn) => { btn.disabled = on; });
  userInputEl.disabled = on;
}

function applyCorrectedText(promptTitle, content) {
  userInputEl.value = cleanAiText(content);
  userInputEl.classList.add("input-field--updated");
  setTimeout(() => userInputEl.classList.remove("input-field--updated"), 1200);

  inputModeEl.textContent = `Применено: ${promptTitle}`;
  inputModeEl.hidden = false;

  userInputEl.focus();
  userInputEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function askChat(prompt) {
  const userMessage = userInputEl.value.trim();
  if (!userMessage) {
    throw new Error("Вставьте текст для исправления");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  const body = JSON.stringify({
    instructions: prompt.text,
    userMessage,
  });

  let lastError = null;

  try {
    for (const url of CHAT_API_URLS) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });

      if (res.status === 404) {
        lastError = new Error("API не найден. Обновите сайт на Netlify.");
        continue;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || `Ошибка ${res.status}`);
      if (!data.content) throw new Error("Пустой ответ от модели");
      return data;
    }

    throw lastError || new Error("Сервер недоступен");
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Превышено время ожидания");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function handlePromptClick(id) {
  if (busy) return;
  const prompt = PROMPTS.find((p) => p.id === id);
  if (!prompt) return;

  const userText = userInputEl.value.trim();
  if (!userText) {
    showToast("Сначала вставьте текст");
    userInputEl.focus();
    return;
  }

  lastPromptId = id;
  haptic("medium");
  setLoading(true);
  statusHintEl.textContent = `Правка: ${prompt.title}…`;

  try {
    const data = await askChat(prompt);
    applyCorrectedText(prompt.title, data.content);
    statusHintEl.textContent = `Готово · ${data.model || "F5AI"} · можно выбрать другую правку`;
    showToast(`Текст обновлён: ${prompt.title}`);
    haptic("light");
    tg?.sendData?.(JSON.stringify({ action: "text_fixed", promptId: prompt.id }));
  } catch (err) {
    const isNetwork =
      err.message.includes("Failed to fetch") ||
      err.message.includes("NetworkError") ||
      location.protocol === "file:";

    if (isNetwork) {
      showToast("Запустите start-https.bat");
      statusHintEl.textContent = "Нужен сервер: start-https.bat";
    } else {
      showToast(err.message || "Ошибка");
      statusHintEl.textContent = err.message || "Ошибка";
    }
    haptic("error");
  } finally {
    setLoading(false);
    userInputEl.disabled = false;
  }
}

copyBtnEl.addEventListener("click", async () => {
  const text = userInputEl.value.trim();
  if (!text) {
    showToast("Нечего копировать");
    return;
  }
  try {
    await copyText(text);
    showToast("Скопировано");
    haptic("light");
  } catch {
    showToast("Не удалось скопировать");
  }
});

function detectEnvironment() {
  statusHintEl.textContent = "Вставьте текст и выберите тип правки";
  if (location.protocol === "file:") {
    statusHintEl.textContent = "Запустите start-https.bat";
  }
}

loaderEl.hidden = true;
toastEl.hidden = true;

initTelegram();
renderCards();
detectEnvironment();
