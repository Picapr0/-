# Text Fix — Telegram Mini App

Три режима правки текста через F5AI.

## Локально

1. Скопируйте `config.example.json` → `config.local.json`, вставьте токен [f5ai.ru](https://f5ai.ru).
2. Запустите `start-https.bat`.
3. Откройте https://localhost:8443

## Netlify

**Сайт:** https://pavlovartem.netlify.app

1. Загрузите на GitHub: `index.html`, `app.js`, `styles.css`, `netlify.toml`, `netlify/functions/text-fix.mjs`
2. **F5AI_API_KEY** → Site configuration → Environment variables  
   - Имя: `F5AI_API_KEY`  
   - Scopes: **Functions** и Production (без Functions ключ не работает!)  
3. **Clear cache and deploy** (или `обновить-сайт.bat` → `deploy.zip`)

В BotFather укажите URL Mini App: `https://pavlovartem.netlify.app`

## Telegram-бот

1. `bot.local.json` — токен от [@BotFather](https://t.me/BotFather) (см. `bot.example.json`)
2. `config.local.json` — ключ F5AI (для ответов в чате)
3. Запуск: **`start-bot.bat`**

Бот ставит кнопку меню «Text Fix» и три кнопки внизу чата: **Грамматика**, **Стиль**, **Деловой** (как на сайте). Выберите режим → отправьте текст.
