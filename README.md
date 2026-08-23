# CloudWorld Forum

Форум Minecraft-сервера **CloudWorld** в стиле крупных RP-форумов: разделы, сайдбар со ссылками, роли администрации, живые темы (демо без БД).

## Ссылки проекта

- IP: `cloudworldmc.ru`
- Telegram: https://t.me/cloudworldmc
- VK чат: https://vk.me/join/3BxUJ4KAP8/wW9PmJBme0GCPtf4U/7drlRk=
- VK сообщество: https://vk.ru/cloudworlds1
- Привязка аккаунта: https://t.me/CloudWorldMCBot
- Discord: https://discord.gg/xHMdWm5Qs
- Донат: https://cloudeworld.trademc.org/

## Стек

- Next.js + TypeScript + Tailwind + shadcn/ui
- Node.js 20+

## Локально

```bash
npm install
npm run dev
```

Открой http://127.0.0.1:3847

## Деплой

Нужен хост с Node.js (Vercel / VPS). PHP-хостинг не подойдёт.

```bash
npm ci
npm run build
PORT=3847 npm start
```

Или Docker — см. `Dockerfile`.
