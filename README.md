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

- Next.js (static export) + TypeScript + Tailwind + shadcn/ui
- Node.js 20+ для сборки

## Локально

```bash
npm install
npm run dev
```

Открой http://127.0.0.1:3847

## Деплой на Cloudflare Pages (бесплатно)

Репозиторий уже на GitHub: https://github.com/ivanzolow833-droid/nit-forums

1. Зайди на https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Подключи GitHub и выбери **`nit-forums`**
3. Настройки:
   - Framework preset: **Next.js (Static HTML Export)** или None
   - Build command: `npm run build`
   - Build output directory: `out`
4. **Save and Deploy**
5. Получишь ссылку вида `https://nit-forums.pages.dev`

Без Git (с ПК после `npm run build`):

```bash
npx wrangler pages deploy out --project-name=cloudworld-forum
```

## Другие хостинги

- **Vercel / Netlify** — тоже ок (тот же репозиторий)
- Обычный PHP-хостинг — **не подойдёт**, пока не зальёшь содержимое папки `out` как статику

## Роли

Хелпер → Модератор → Админ → Главный админ
