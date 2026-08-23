export const site = {
  name: "CloudWorld",
  tagline: "Майнкрафт-форум сервера",
  ip: "cloudworldmc.ru",
  bot: "@CloudWorldMCBot",
  botUrl: "https://t.me/CloudWorldMCBot",
};

export const quickLinks = [
  {
    id: "tg",
    label: "Telegram",
    href: "https://t.me/cloudworldmc",
    hint: "Новости и анонсы",
  },
  {
    id: "vk-chat",
    label: "VK — общение игроков",
    href: "https://vk.me/join/3BxUJ4KAP8/wW9PmJBme0GCPtf4U/7drlRk=",
    hint: "Общий чат",
  },
  {
    id: "vk",
    label: "VK — сообщество",
    href: "https://vk.ru/cloudworlds1",
    hint: "Группа проекта",
  },
  {
    id: "bot",
    label: "Привязать аккаунт",
    href: "https://t.me/CloudWorldMCBot",
    hint: "Бот @CloudWorldMCBot",
  },
  {
    id: "ds",
    label: "Discord",
    href: "https://discord.gg/xHMdWm5Qs",
    hint: "Голос и тикеты",
  },
  {
    id: "donate",
    label: "Донат / привилегии",
    href: "https://cloudeworld.trademc.org/",
    hint: "Магазин сервера",
  },
] as const;

export const staffRoles = [
  {
    id: "helper",
    label: "Хелпер",
    rank: 1,
    color: "#3d8b5a",
    description: "Помогает новичкам, отмечает нарушенные темы, зовёт модерацию.",
  },
  {
    id: "moderator",
    label: "Модератор",
    rank: 2,
    color: "#2f6f9f",
    description: "Жалобы, муты, закрытие тем, порядок в разделах.",
  },
  {
    id: "admin",
    label: "Админ",
    rank: 3,
    color: "#b45309",
    description: "Управляет разделами, ивентами и составом модерации.",
  },
  {
    id: "chief",
    label: "Главный админ",
    rank: 4,
    color: "#b91c1c",
    description: "Финальное слово по правилам и администрации CloudWorld.",
  },
] as const;

export type StaffRoleId = (typeof staffRoles)[number]["id"];

export type StaffMember = {
  name: string;
  role: StaffRoleId;
};

export const staffRoster: StaffMember[] = [
  { name: "CloudOwner", role: "chief" },
  { name: "SkyAdmin", role: "admin" },
  { name: "BlockMod", role: "moderator" },
  { name: "GrassHelp", role: "helper" },
];

const roleById = Object.fromEntries(
  staffRoles.map((role) => [role.id, role]),
) as Record<StaffRoleId, (typeof staffRoles)[number]>;

export function getStaffRole(id: StaffRoleId) {
  return roleById[id];
}

export function roleForAuthor(name: string): StaffRoleId | undefined {
  return staffRoster.find((member) => member.name === name)?.role;
}

export type ThreadStatus =
  | "new"
  | "important"
  | "review"
  | "rejected"
  | "resolved";

export type Reply = {
  id: string;
  author: string;
  role?: StaffRoleId;
  body: string;
  createdAt: string;
};

export type Thread = {
  id: string;
  title: string;
  author: string;
  role?: StaffRoleId;
  status?: ThreadStatus;
  preview: string;
  replies: Reply[];
  createdAt: string;
};

export type ForumBoard = {
  id: string;
  title: string;
  description: string;
  icon: string;
  tone: string;
  threadsCount: string;
  subforums: string[];
  latest: {
    title: string;
    author: string;
    role?: StaffRoleId;
    status?: ThreadStatus;
    when: string;
  };
};

export type ForumSection = {
  id: string;
  title: string;
  boards: ForumBoard[];
};

export const forumSections: ForumSection[] = [
  {
    id: "main",
    title: "Главный раздел",
    boards: [
      {
        id: "news",
        title: "Новости проекта",
        description: "Обновления CloudWorld, вайпы, техработы и анонсы.",
        icon: "📰",
        tone: "#c2410c",
        threadsCount: "1.2K",
        subforums: ["Патчноуты", "Техработы"],
        latest: {
          title: "Обновление 1.21 — новые миры и квесты",
          author: "CloudOwner",
          role: "chief",
          status: "important",
          when: "12 мин назад",
        },
      },
      {
        id: "rules",
        title: "Правила сервера",
        description: "Общие правила, чат, гриф, донат и апелляции.",
        icon: "📜",
        tone: "#1d4ed8",
        threadsCount: "86",
        subforums: ["Апелляции", "FAQ"],
        latest: {
          title: "Уточнение по PvP-зонам в хабе",
          author: "SkyAdmin",
          role: "admin",
          status: "important",
          when: "1 ч назад",
        },
      },
      {
        id: "howto",
        title: "Как начать играть",
        description: "IP, лаунчер, привязка аккаунта к Telegram-боту.",
        icon: "🎮",
        tone: "#15803d",
        threadsCount: "340",
        subforums: ["Лаунчер", "Привязка"],
        latest: {
          title: "Не приходит код от @CloudWorldMCBot",
          author: "Новичок_42",
          status: "review",
          when: "25 мин назад",
        },
      },
    ],
  },
  {
    id: "servers",
    title: "Игровые разделы",
    boards: [
      {
        id: "survival",
        title: "Выживание",
        description: "Базы, экономика, трейды и соседские споры.",
        icon: "⛏️",
        tone: "#3f6212",
        threadsCount: "8.4K",
        subforums: ["Рынок", "Поиск напарника"],
        latest: {
          title: "Продам шалкеры с ресурсами — честный трейд",
          author: "MinerFox",
          when: "3 мин назад",
        },
      },
      {
        id: "events",
        title: "Ивенты и ивент-заявки",
        description: "Игровые события CloudWorld и заявки на проведение.",
        icon: "🏆",
        tone: "#a16207",
        threadsCount: "512",
        subforums: ["Расписание", "Заявки"],
        latest: {
          title: "Заявка: воздушная битва на выходных",
          author: "SkyAdmin",
          role: "admin",
          status: "review",
          when: "40 мин назад",
        },
      },
      {
        id: "reports",
        title: "Жалобы на игроков",
        description: "Читы, гриф, токсик. С доказательствами — без флуда.",
        icon: "🛡️",
        tone: "#9f1239",
        threadsCount: "2.1K",
        subforums: ["На рассмотрении", "Архив"],
        latest: {
          title: "Жалоба: киллаура на спавне",
          author: "BlockMod",
          role: "moderator",
          status: "rejected",
          when: "8 мин назад",
        },
      },
      {
        id: "support",
        title: "Техподдержка",
        description: "Баги, лаги, донат не выдался, проблемы со входом.",
        icon: "⚙️",
        tone: "#334155",
        threadsCount: "960",
        subforums: ["Баги", "Донат"],
        latest: {
          title: "Не зачислилась привилегия после оплаты",
          author: "GrassHelp",
          role: "helper",
          status: "resolved",
          when: "18 мин назад",
        },
      },
    ],
  },
  {
    id: "community",
    title: "Общение",
    boards: [
      {
        id: "flood",
        title: "Флуд и общение",
        description: "Оффтоп, скрины построек, мемы — без токсичности.",
        icon: "💬",
        tone: "#0369a1",
        threadsCount: "12K",
        subforums: ["Скриншоты", "Мемы"],
        latest: {
          title: "Показал базу в облаках — оценка?",
          author: "CloudBuilder",
          status: "new",
          when: "1 мин назад",
        },
      },
      {
        id: "suggestions",
        title: "Идеи и предложения",
        description: "Что добавить на CloudWorld: плагины, миры, ивенты.",
        icon: "💡",
        tone: "#0f766e",
        threadsCount: "420",
        subforums: ["Плагины", "Миры"],
        latest: {
          title: "Идея: сезонный мир с уникальным лутом",
          author: "IdeaSteve",
          status: "review",
          when: "2 ч назад",
        },
      },
    ],
  },
];

export const initialThreads: Thread[] = [
  {
    id: "t1",
    title: "Как привязать аккаунт к @CloudWorldMCBot?",
    author: "Новичок_42",
    status: "new",
    preview:
      "Зашёл на cloudworldmc.ru, написал боту — кода нет. Подскажите пошагово, куда смотреть.",
    createdAt: "сегодня, 09:10",
    replies: [
      {
        id: "r1",
        author: "GrassHelp",
        role: "helper",
        body: "1) Зайди на сервер. 2) Напиши боту /start. 3) В игре получи код и отправь его боту. Если код не пришёл — проверь, что ник в игре совпадает.",
        createdAt: "сегодня, 09:18",
      },
      {
        id: "r2",
        author: "SkyAdmin",
        role: "admin",
        body: "Если снова пусто — создай тему в техподдержке и приложи ник + скрин бота. Не кидай пароль никому.",
        createdAt: "сегодня, 09:24",
      },
    ],
  },
  {
    id: "t2",
    title: "Жалоба: гриф дома у спавна",
    author: "BuilderKate",
    status: "review",
    preview:
      "Сломали фасад и сундуки. Координаты и скрины прилагаю. Прошу откат и проверку грифера.",
    createdAt: "сегодня, 08:40",
    replies: [
      {
        id: "r3",
        author: "BlockMod",
        role: "moderator",
        body: "Тема взята в работу. Нужны точные координаты и примерное время. Без этого откат сделать сложнее.",
        createdAt: "сегодня, 08:55",
      },
    ],
  },
  {
    id: "t3",
    title: "Ивент выходного дня: воздушная дуэль",
    author: "CloudOwner",
    role: "chief",
    status: "important",
    preview:
      "В субботу в 18:00 МСК собираемся на арене в облаках. Награда — донат-кейсы и титул сезона.",
    createdAt: "вчера, 21:00",
    replies: [
      {
        id: "r4",
        author: "MinerFox",
        body: "Буду. Можно в соло или только командами?",
        createdAt: "вчера, 21:20",
      },
      {
        id: "r5",
        author: "CloudOwner",
        role: "chief",
        body: "И соло, и дуо. Рега в Discord за час до старта.",
        createdAt: "вчера, 21:28",
      },
    ],
  },
  {
    id: "t4",
    title: "Донат не выдался после оплаты на TradeMC",
    author: "PayIssue",
    status: "resolved",
    preview:
      "Оплатил привилегию на cloudeworld.trademc.org, денег списало, в игре ничего нет.",
    createdAt: "2 дня назад",
    replies: [
      {
        id: "r6",
        author: "SkyAdmin",
        role: "admin",
        body: "Проверили чек — привилегия выдана вручную. Перезайди на сервер. Если снова пусто, напиши ник в ЛС админам.",
        createdAt: "2 дня назад",
      },
    ],
  },
];

export const onlineUsers = [
  { name: "CloudOwner", role: "chief" as StaffRoleId },
  { name: "SkyAdmin", role: "admin" as StaffRoleId },
  { name: "BlockMod", role: "moderator" as StaffRoleId },
  { name: "GrassHelp", role: "helper" as StaffRoleId },
  { name: "MinerFox" },
  { name: "BuilderKate" },
  { name: "CloudBuilder" },
  { name: "IdeaSteve" },
  { name: "Новичок_42" },
];

export const statusLabel: Record<ThreadStatus, string> = {
  new: "Новое",
  important: "Важно",
  review: "На рассмотрении",
  rejected: "Отказано",
  resolved: "Решено",
};
