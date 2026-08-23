import {
  forumSections,
  type StaffRoleId,
  type ThreadStatus,
} from "@/lib/forum-data";

export type UserRole = StaffRoleId | "member";

export type ForumUser = {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
};

export type ForumPost = {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  body: string;
  createdAt: string;
};

export type ForumThread = {
  id: string;
  boardId: string;
  title: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  status: ThreadStatus;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type ForumState = {
  users: ForumUser[];
  threads: ForumThread[];
  posts: ForumPost[];
  sessionUserId: string | null;
};

const STORAGE_KEY = "cloudworld-forum-v1";

const BOOTSTRAP_ADMIN = {
  username: "CloudOwner",
  password: "CloudWorldAdmin1",
};

export function isStaff(role: UserRole): role is StaffRoleId {
  return role !== "member";
}

export function canModerate(role: UserRole) {
  return role === "moderator" || role === "admin" || role === "chief";
}

export function canAdmin(role: UserRole) {
  return role === "admin" || role === "chief";
}

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(`cw:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function nowLabel() {
  return new Date().toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function seedThreads(): { threads: ForumThread[]; posts: ForumPost[] } {
  const threads: ForumThread[] = [
    {
      id: "t-welcome",
      boardId: "howto",
      title: "Как начать играть на CloudWorld",
      authorId: "u-owner",
      authorName: "CloudOwner",
      authorRole: "chief",
      status: "important",
      body: "IP: cloudworldmc.ru. Привязка аккаунта через @CloudWorldMCBot. Вопросы пишите ниже.",
      createdAt: "сегодня, 09:00",
      updatedAt: "сегодня, 09:00",
    },
    {
      id: "t-rules",
      boardId: "rules",
      title: "Правила сервера — обязательно к прочтению",
      authorId: "u-owner",
      authorName: "CloudOwner",
      authorRole: "chief",
      status: "important",
      body: "Запрещены читы, гриф вне разрешённых зон, токсик и обман при трейдах. Жалобы — только с доказательствами.",
      createdAt: "вчера, 18:00",
      updatedAt: "вчера, 18:00",
    },
    {
      id: "t-report",
      boardId: "reports",
      title: "Пример жалобы: укажите ник, время и скрины",
      authorId: "u-owner",
      authorName: "CloudOwner",
      authorRole: "chief",
      status: "new",
      body: "Шаблон: ник нарушителя, ваши координаты, примерное время, ссылки/скрины. Без этого модерация не разберёт.",
      createdAt: "вчера, 12:00",
      updatedAt: "вчера, 12:00",
    },
  ];

  const posts: ForumPost[] = [
    {
      id: "p1",
      threadId: "t-welcome",
      authorId: "u-owner",
      authorName: "CloudOwner",
      authorRole: "chief",
      body: "Донат: https://cloudeworld.trademc.org/ — если привилегия не выдалась, пишите в техподдержку.",
      createdAt: "сегодня, 09:05",
    },
  ];

  return { threads, posts };
}

export async function createInitialState(): Promise<ForumState> {
  const passwordHash = await hashPassword(BOOTSTRAP_ADMIN.password);
  const { threads, posts } = seedThreads();

  return {
    users: [
      {
        id: "u-owner",
        username: BOOTSTRAP_ADMIN.username,
        passwordHash,
        role: "chief",
        createdAt: "система",
      },
    ],
    threads,
    posts,
    sessionUserId: null,
  };
}

export function loadState(): ForumState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ForumState;
  } catch {
    return null;
  }
}

export function saveState(state: ForumState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function ensureState(): Promise<ForumState> {
  const existing = loadState();
  if (existing?.users?.length) return existing;
  const initial = await createInitialState();
  saveState(initial);
  return initial;
}

export async function registerUser(
  state: ForumState,
  username: string,
  password: string,
): Promise<{ state: ForumState; error?: string }> {
  const name = username.trim();
  if (name.length < 3) return { state, error: "Ник слишком короткий (мин. 3)." };
  if (password.length < 6) return { state, error: "Пароль минимум 6 символов." };
  if (state.users.some((u) => u.username.toLowerCase() === name.toLowerCase())) {
    return { state, error: "Такой ник уже занят." };
  }

  const user: ForumUser = {
    id: uid("u"),
    username: name,
    passwordHash: await hashPassword(password),
    role: "member",
    createdAt: nowLabel(),
  };

  const next = {
    ...state,
    users: [...state.users, user],
    sessionUserId: user.id,
  };
  saveState(next);
  return { state: next };
}

export async function loginUser(
  state: ForumState,
  username: string,
  password: string,
): Promise<{ state: ForumState; error?: string }> {
  const hash = await hashPassword(password);
  const user = state.users.find(
    (u) =>
      u.username.toLowerCase() === username.trim().toLowerCase() &&
      u.passwordHash === hash,
  );
  if (!user) return { state, error: "Неверный ник или пароль." };

  const next = { ...state, sessionUserId: user.id };
  saveState(next);
  return { state: next };
}

export function logoutUser(state: ForumState): ForumState {
  const next = { ...state, sessionUserId: null };
  saveState(next);
  return next;
}

export function setUserRole(
  state: ForumState,
  actorId: string,
  targetId: string,
  role: UserRole,
): { state: ForumState; error?: string } {
  const actor = state.users.find((u) => u.id === actorId);
  if (!actor || !canAdmin(actor.role)) {
    return { state, error: "Нет прав администратора." };
  }
  if (actor.role !== "chief" && (role === "chief" || role === "admin")) {
    return { state, error: "Только главный админ может выдавать админов." };
  }

  const next = {
    ...state,
    users: state.users.map((u) =>
      u.id === targetId
        ? {
            ...u,
            role,
          }
        : u,
    ),
    threads: state.threads.map((t) =>
      t.authorId === targetId
        ? { ...t, authorRole: role, authorName: t.authorName }
        : t,
    ),
    posts: state.posts.map((p) =>
      p.authorId === targetId ? { ...p, authorRole: role } : p,
    ),
  };

  // keep author names in sync if needed - roles updated
  const target = next.users.find((u) => u.id === targetId);
  if (target) {
    next.threads = next.threads.map((t) =>
      t.authorId === targetId ? { ...t, authorRole: target.role } : t,
    );
    next.posts = next.posts.map((p) =>
      p.authorId === targetId ? { ...p, authorRole: target.role } : p,
    );
  }

  saveState(next);
  return { state: next };
}

export function createThread(
  state: ForumState,
  boardId: string,
  title: string,
  body: string,
): { state: ForumState; thread?: ForumThread; error?: string } {
  const user = state.users.find((u) => u.id === state.sessionUserId);
  if (!user) return { state, error: "Сначала войдите в аккаунт." };
  if (title.trim().length < 8) return { state, error: "Заголовок слишком короткий." };
  if (body.trim().length < 20) return { state, error: "Опишите тему подробнее." };

  const thread: ForumThread = {
    id: uid("t"),
    boardId,
    title: title.trim(),
    authorId: user.id,
    authorName: user.username,
    authorRole: user.role,
    status: "new",
    body: body.trim(),
    createdAt: nowLabel(),
    updatedAt: nowLabel(),
  };

  const next = { ...state, threads: [thread, ...state.threads] };
  saveState(next);
  return { state: next, thread };
}

export function createPost(
  state: ForumState,
  threadId: string,
  body: string,
): { state: ForumState; error?: string } {
  const user = state.users.find((u) => u.id === state.sessionUserId);
  if (!user) return { state, error: "Сначала войдите в аккаунт." };
  if (body.trim().length < 2) return { state, error: "Пустой ответ." };

  const post: ForumPost = {
    id: uid("p"),
    threadId,
    authorId: user.id,
    authorName: user.username,
    authorRole: user.role,
    body: body.trim(),
    createdAt: nowLabel(),
  };

  const next = {
    ...state,
    posts: [...state.posts, post],
    threads: state.threads.map((t) =>
      t.id === threadId ? { ...t, updatedAt: nowLabel() } : t,
    ),
  };
  saveState(next);
  return { state: next };
}

export function setThreadStatus(
  state: ForumState,
  threadId: string,
  status: ThreadStatus,
): { state: ForumState; error?: string } {
  const user = state.users.find((u) => u.id === state.sessionUserId);
  if (!user || !canModerate(user.role)) {
    return { state, error: "Нужны права модератора." };
  }
  const next = {
    ...state,
    threads: state.threads.map((t) =>
      t.id === threadId ? { ...t, status, updatedAt: nowLabel() } : t,
    ),
  };
  saveState(next);
  return { state: next };
}

export function getBoard(boardId: string) {
  for (const section of forumSections) {
    const board = section.boards.find((b) => b.id === boardId);
    if (board) return board;
  }
  return null;
}

export function getCurrentUser(state: ForumState) {
  return state.users.find((u) => u.id === state.sessionUserId) ?? null;
}

export const bootstrapAdmin = BOOTSTRAP_ADMIN;

export const roleOptions: { id: UserRole; label: string }[] = [
  { id: "member", label: "Игрок" },
  { id: "helper", label: "Хелпер" },
  { id: "moderator", label: "Модератор" },
  { id: "admin", label: "Админ" },
  { id: "chief", label: "Главный админ" },
];
