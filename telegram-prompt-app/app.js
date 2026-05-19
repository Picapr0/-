const PROMPTS = [
  {
    id: "cowboy",
    icon: "🤠",
    title: "Ковбой",
    description: "Дикий Запад · закат · фотореализм",
    accent: "card--accent-1",
    text: `генерируй изображение в стиле ковбоя: Суровый ковбой Дикого Запада, конец 1800-х годов. На нём: выцветшая кожаная куртка, ковбойская шляпа с широкими полями, на шее красный бандана. На поясе кобура с револьвером Colt. Фон: пыльная главная улица городка, деревянный салун с распашными дверями, лошади у коновязи. Закатное небо оранжевого и фиолетового цвета. Кинематографичное освещение, фотореализм, высокая детализация, тёплые тона, частицы пыли в воздухе.`,
  },
  {
    id: "spongebob",
    icon: "🧽",
    title: "Губка Боб",
    description: "Бикини Боттом · 2D мультфильм",
    accent: "card--accent-2",
    text: `Губка Боб Квадратные Штаны в полный рост. Жёлтая пористая квадратная губка с большими голубыми глазами, торчащими передними зубами с ямочкой, веснушками на щеках. Одет в белую рубашку с красным галстуком-бабочкой, коричневые квадратные штаны с ремнём и чёрные ботинки. Руки тонкие, резиновые. Фон: подводный город Бикини Боттом, кораллы, пузырьки воздуха. Яркие, насыщенные цвета: жёлтый, бирюзовый, розовый. Стиль мультсериала Nickelodeon, плоская 2D анимация, чёткие контуры, гротескная карикатура.`,
  },
  {
    id: "dafoe",
    icon: "🎬",
    title: "Уиллем Дефо",
    description: "Студийный портрет · 8k",
    accent: "card--accent-3",
    text: `Портрет актёра Уиллема Дефо. Очень выразительное угловатое лицо, широко посаженные голубые глаза, глубокие морщины вокруг глаз и на лбу, тонкие губы, слегка приоткрытый рот. Короткие светло-русые волосы с залысинами. Взгляд напряжённый, пронзительный, немного тревожный. Фон нейтральный, тёмно-серый. Студийное освещение, кольцевая лампа, резкий фокус на глазах. Фотореализм, высокая детализация текстур кожи, 8k.`,
  },
];

const cardsEl = document.getElementById("prompt-cards");
const toastEl = document.getElementById("toast");
const toastTextEl = document.getElementById("toast-text");
const statusHintEl = document.getElementById("status-hint");
const userInputEl = document.getElementById("user-input");
const resultPanelEl = document.getElementById("result-panel");
const resultTitleEl = document.getElementById("result-title");
const resultBodyEl = document.getElementById("result-body");
const downloadBtnEl = document.getElementById("download-btn");
const againBtnEl = document.getElementById("again-btn");
const loaderEl = document.getElementById("loader");

let toastTimer = null;
let lastImageUrl = "";
let lastPromptId = null;
let busy = false;

const tg = window.Telegram?.WebApp;
const IMAGE_API_URL = "/api/image";

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
    <button type="button" class="card ${p.accent}" data-id="${p.id}" aria-label="Сгенерировать: ${p.title}">
      <div class="card__inner">
        <span class="card__icon" aria-hidden="true">${p.icon}</span>
        <div class="card__body">
          <h2 class="card__title">${p.title}</h2>
          <p class="card__desc">${p.description}</p>
        </div>
        <span class="card__tag">AI</span>
      </div>
    </button>
  `
  ).join("");

  cardsEl.querySelectorAll(".card").forEach((btn) => {
    btn.addEventListener("click", () => handlePromptClick(btn.dataset.id));
  });
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
}

function hideResult() {
  resultPanelEl.hidden = true;
  resultBodyEl.innerHTML = "";
  lastImageUrl = "";
}

function buildImagePrompt(prompt) {
  const extra = userInputEl.value.trim();
  return extra ? `${prompt.text} ${extra}` : prompt.text;
}

function showImageResult(title, imageUrl) {
  lastImageUrl = imageUrl;
  resultTitleEl.textContent = title;
  resultBodyEl.innerHTML = "";
  const img = document.createElement("img");
  img.className = "result__img";
  img.alt = title;
  img.loading = "lazy";
  img.onload = () => resultPanelEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  img.onerror = () => showToast("Не удалось загрузить картинку");
  img.src = imageUrl;
  resultBodyEl.appendChild(img);
  resultPanelEl.hidden = false;
}

async function askImage(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(IMAGE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: buildImagePrompt(prompt) }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `Ошибка ${res.status}`);
    if (!data.imageUrl) throw new Error("Изображение не получено");
    return data;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Превышено время ожидания (2 мин)");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function handlePromptClick(id) {
  if (busy) return;
  const prompt = PROMPTS.find((p) => p.id === id);
  if (!prompt) return;

  lastPromptId = id;
  haptic("medium");
  setLoading(true);
  statusHintEl.textContent = `Генерация: ${prompt.title}…`;

  try {
    const data = await askImage(prompt);
    showImageResult(prompt.title, data.imageUrl);
    statusHintEl.textContent = `Готово · ${data.model || "F5AI"}`;
    showToast("Изображение готово");
    haptic("light");
    tg?.sendData?.(JSON.stringify({ action: "image_generated", promptId: prompt.id }));
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
  }
}

againBtnEl.addEventListener("click", () => {
  hideResult();
  statusHintEl.textContent = "Выберите стиль ниже";
  if (lastPromptId) handlePromptClick(lastPromptId);
});

downloadBtnEl.addEventListener("click", async () => {
  if (!lastImageUrl) return;
  try {
    const res = await fetch(lastImageUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Сохранено");
    haptic("light");
  } catch {
    window.open(lastImageUrl, "_blank", "noopener");
    showToast("Открыто в новой вкладке");
  }
});

function detectEnvironment() {
  if (tg) {
    statusHintEl.textContent = "Выберите стиль для генерации";
    return;
  }
  if (location.protocol === "https:" && location.hostname === "localhost") {
    statusHintEl.textContent = "Выберите стиль для генерации";
  } else if (location.protocol === "file:") {
    statusHintEl.textContent = "Запустите start-https.bat";
  } else {
    statusHintEl.textContent = "Сайт готов к работе";
  }
}

loaderEl.hidden = true;
toastEl.hidden = true;

initTelegram();
renderCards();
detectEnvironment();
