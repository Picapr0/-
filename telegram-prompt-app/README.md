# AI Image Studio — Telegram Mini App

Три стиля генерации изображений через F5AI: Ковбой, Губка Боб, Уиллем Дефо.

## HTTPS

**Telegram требует HTTPS.** Подробная инструкция: **[HTTPS.md](./HTTPS.md)**

| Где | Как |
|-----|-----|
| **Локально** | `start-https.bat` → https://localhost:8443 |
| **Telegram** | Деплой на Netlify/Vercel → `https://ваш-сайт.netlify.app` |

## Быстрый старт (локально)

1. Скопируйте `config.example.json` → `config.local.json`, вставьте токен F5AI
2. Запустите **`start-https.bat`**
3. Откройте **https://localhost:8443**

## Деплой (публичный HTTPS)

1. Залейте проект на [Netlify](https://www.netlify.com) (через Git)
2. Добавьте переменную **`F5AI_API_KEY`** в Environment variables
3. URL сайта укажите в BotFather (`/newapp`)

## Файлы

| Файл | Назначение |
|------|------------|
| `index.html`, `app.js`, `styles.css` | Сайт |
| `start-https.bat` | Локальный HTTPS |
| `netlify.toml`, `netlify/functions/` | Деплой Netlify |
| `api/image.js` | Деплой Vercel |
| `HTTPS.md` | Инструкция по HTTPS |
