export const site = {
  name: "CloudWorld",
  tagline: "Официальный форум игрового проекта",
  ip: "cloudworldmc.ru",
  bot: "@CloudWorldMCBot",
  botUrl: "https://t.me/CloudWorldMCBot",
};

export const quickLinks = [
  { id: "tg", label: "Telegram проекта", href: "https://t.me/cloudworldmc", hint: "Новости и важные анонсы" },
  { id: "vk-chat", label: "VK — чат игроков", href: "https://vk.me/join/3BxUJ4KAP8/wW9PmJBme0GCPtf4U/7drlRk=", hint: "Общение сообщества" },
  { id: "vk", label: "VK — сообщество", href: "https://vk.ru/cloudworlds1", hint: "Публикации проекта" },
  { id: "bot", label: "Привязать аккаунт", href: "https://t.me/CloudWorldMCBot", hint: "Бот CloudWorld" },
  { id: "ds", label: "Discord", href: "https://discord.gg/xHMdWm5Qs", hint: "Голосовые каналы и поддержка" },
  { id: "donate", label: "Магазин привилегий", href: "https://cloudeworld.trademc.org/", hint: "Донат CloudWorld" },
] as const;

export const statusLabels: Record<string, string> = {
  open: "Открыто",
  important: "Важно",
  review: "На рассмотрении",
  rejected: "Отказано",
  resolved: "Решено",
  closed: "Закрыто",
};

export type ThreadStatus = string;
