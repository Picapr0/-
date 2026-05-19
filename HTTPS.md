# Как получить URL для сайта (HTTPS)

Telegram Mini App принимает только **`https://...`** — не `http://` и не открытие файла с диска.

Ваш проект уже готов к деплою: нужен хостинг + переменная **`F5AI_API_KEY`**.

---

## Сравнение способов

| Способ | URL | Сложность | ИИ работает? | Для Telegram |
|--------|-----|-----------|--------------|--------------|
| **localhost** (`start-https.bat`) | `https://localhost:8443` | Легко | ✅ | ❌ только на ПК |
| **Netlify** | `https://имя.netlify.app` | Средне | ✅ | ✅ рекомендуется |
| **Vercel** | `https://имя.vercel.app` | Средне | ✅ | ✅ |
| **Cloudflare Tunnel** | `https://xxx.trycloudflare.com` | Легко | ✅* | ⚠️ временно |
| **Render** | `https://имя.onrender.com` | Средне | ✅ | ✅ |
| **Netlify Drop** | `https://имя.netlify.app` | Очень легко | ❌ | ❌ без API |
| **GitHub Pages** | `https://user.github.io/...` | Средне | ❌ | ❌ только статика |

\* Tunnel проксирует ваш локальный `start-https.bat` — пока компьютер включён.

---

## Способ 1 — Netlify (лучший для Telegram)

1. Регистрация: [netlify.com](https://www.netlify.com)
2. Папку проекта залейте через **Git** (GitHub/GitLab) или zip:
   - **Add new site** → **Import an existing project**
3. **Site configuration** → **Environment variables** → добавьте:

   | Key | Value |
   |-----|-------|
   | `F5AI_API_KEY` | токен с [f5ai.ru](https://f5ai.ru) |

4. **Deploy**
5. Скопируйте URL: **Site overview** → **Domain management** → что-то вроде  
   `https://random-name-123.netlify.app`

**Свой домен (необязательно):** Domain management → Add custom domain → `app.ваш-сайт.ru`

### BotFather

```
/newapp → выбрать бота → URL: https://random-name-123.netlify.app
```

---

## Способ 2 — Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Импортируйте папку `telegram-prompt-app`
3. **Environment Variables** → `F5AI_API_KEY` = ваш токен
4. **Deploy** → URL: `https://telegram-prompt-xxxx.vercel.app`

В проекте уже есть `vercel.json` и `api/image.js`.

---

## Способ 3 — Cloudflare Tunnel (быстро, без деплоя)

Публичный HTTPS на ваш **локальный** сервер. URL живёт, пока включён ПК и туннель.

1. Установите [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
2. Запустите **`start-https.bat`** (сайт на порту 8443)
3. В новом терминале:

```powershell
cloudflared tunnel --url https://localhost:8443
```

4. В выводе будет строка вида:  
   `https://something-random.trycloudflare.com` — это и есть URL для BotFather.

⚠️ URL **меняется** при каждом запуске. Для постоянного бота лучше Netlify/Vercel.

---

## Способ 4 — Render

1. [render.com](https://render.com) → **New** → **Web Service**
2. Подключите Git-репозиторий с проектом
3. **Build command:** (пусто или `npm install` если добавите)
4. **Start command:**  
   `node scripts/https-server.mjs`  
   (нужно доработать сервер под переменную `PORT` — для Render порт из `process.env.PORT`)
5. Environment: `F5AI_API_KEY`
6. URL: `https://ваш-сервис.onrender.com`

> Для Render может понадобиться слушать `0.0.0.0` и порт из `PORT` — при необходимости напишите, настроим.

---

## Способ 5 — Только локально (без интернета)

```
start-https.bat → https://localhost:8443
```

Ключа хватает из `config.local.json`. Для Telegram **не подходит**.

---

## Что указать в Telegram

| Поле | Значение |
|------|----------|
| Mini App URL | `https://ваш-домен.netlify.app` |
| Без `/` в конце | ✅ `https://site.netlify.app` |
| С путём | ❌ не нужно, если сайт в корне |

Проверка: откройте URL в телефоне в Chrome — должны быть 3 кнопки (Ковбой, Губка Боб, Уиллем Дефо).

---

## Безопасность

- **Не публикуйте** `config.local.json` в интернет
- На хостинге только **`F5AI_API_KEY`** в настройках (Environment variables)
- Токен из чата лучше **перевыпустить** на f5ai.ru

---

## Частые ошибки

| Проблема | Решение |
|----------|---------|
| «Запустите start-https.bat» на хостинге | Не задан `F5AI_API_KEY` или деплой без Functions |
| Netlify Drop без Git | Functions не работают — используйте Git + Netlify |
| Сертификат на localhost | Нормально — «Дополнительно» → перейти |
| HTTP вместо HTTPS | Telegram не примет — только HTTPS |
