"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RoleBadge, StatusBadge } from "@/components/role-badge";
import { ForumSidebar } from "@/components/forum-sidebar";
import { HeroBanner } from "@/components/hero";
import { StaffRoles } from "@/components/staff-roles";
import {
  forumSections,
  site,
  statusLabel,
  type ThreadStatus,
} from "@/lib/forum-data";
import {
  bootstrapAdmin,
  canAdmin,
  canModerate,
  createPost,
  createThread,
  ensureState,
  getBoard,
  getCurrentUser,
  isStaff,
  loginUser,
  logoutUser,
  registerUser,
  roleOptions,
  setThreadStatus,
  setUserRole,
  type ForumPost,
  type ForumState,
  type ForumThread,
  type UserRole,
} from "@/lib/forum-store";

type View =
  | { name: "home" }
  | { name: "board"; boardId: string }
  | { name: "thread"; threadId: string }
  | { name: "admin" }
  | { name: "auth"; mode: "login" | "register" };

function RoleTag({ role }: { role: UserRole }) {
  if (!isStaff(role)) {
    return (
      <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Игрок
      </span>
    );
  }
  return <RoleBadge role={role} />;
}

export function ForumApp() {
  const [state, setState] = useState<ForumState | null>(null);
  const [view, setView] = useState<View>({ name: "home" });
  const [authError, setAuthError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [threadTitle, setThreadTitle] = useState("");
  const [threadBody, setThreadBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void ensureState().then(setState);
  }, []);

  const user = state ? getCurrentUser(state) : null;

  const openThread = useMemo(() => {
    if (!state || view.name !== "thread") return null;
    return state.threads.find((t) => t.id === view.threadId) ?? null;
  }, [state, view]);

  const boardThreads = useMemo(() => {
    if (!state || view.name !== "board") return [];
    return state.threads.filter((t) => t.boardId === view.boardId);
  }, [state, view]);

  async function copyIp() {
    try {
      await navigator.clipboard.writeText(site.ip);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  if (!state) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-muted-foreground">
        Загрузка форума…
      </div>
    );
  }

  const forum = state;

  async function onAuth(mode: "login" | "register") {
    setAuthError(null);
    const result =
      mode === "login"
        ? await loginUser(forum, username, password)
        : await registerUser(forum, username, password);
    if (result.error) {
      setAuthError(result.error);
      return;
    }
    setState(result.state);
    setUsername("");
    setPassword("");
    setView({ name: "home" });
  }

  function onLogout() {
    setState(logoutUser(forum));
    setView({ name: "home" });
  }

  function onCreateThread(boardId: string) {
    setFormError(null);
    const result = createThread(forum, boardId, threadTitle, threadBody);
    if (result.error || !result.thread) {
      setFormError(result.error ?? "Не удалось создать тему.");
      return;
    }
    setState(result.state);
    setThreadTitle("");
    setThreadBody("");
    setView({ name: "thread", threadId: result.thread.id });
  }

  function onReply(threadId: string) {
    setFormError(null);
    const result = createPost(forum, threadId, replyBody);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setState(result.state);
    setReplyBody("");
  }

  function onRoleChange(targetId: string, role: UserRole) {
    if (!user) return;
    const result = setUserRole(forum, user.id, targetId, role);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setState(result.state);
  }

  function onStatus(threadId: string, status: ThreadStatus) {
    const result = setThreadStatus(forum, threadId, status);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setState(result.state);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setView({ name: "home" })}
            className="flex items-center gap-3 text-left"
          >
            <span className="mc-block flex size-10 items-center justify-center rounded-lg bg-grass text-lg font-black text-white">
              CW
            </span>
            <span>
              <span className="block font-heading text-xl leading-none font-extrabold tracking-tight text-ink">
                {site.name}
              </span>
              <span className="text-xs text-muted-foreground">{site.tagline}</span>
            </span>
          </button>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              className="rounded-lg px-3 py-2 hover:bg-secondary"
              onClick={() => setView({ name: "home" })}
            >
              Разделы
            </button>
            {user && canAdmin(user.role) ? (
              <button
                type="button"
                className="rounded-lg px-3 py-2 font-semibold text-dirt hover:bg-secondary"
                onClick={() => setView({ name: "admin" })}
              >
                Админ-панель
              </button>
            ) : null}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={copyIp}
              className="rounded-xl border-grass/30 bg-white font-mono text-sm"
            >
              IP: {site.ip}
              <span className="ml-2 text-grass">{copied ? "✓" : "копировать"}</span>
            </Button>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{user.username}</span>
                <RoleTag role={user.role} />
                <Button type="button" variant="outline" className="rounded-xl" onClick={onLogout}>
                  Выйти
                </Button>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setView({ name: "auth", mode: "login" })}
                >
                  Войти
                </Button>
                <Button
                  type="button"
                  className="rounded-xl bg-grass hover:bg-[#2f6d2f]"
                  onClick={() => setView({ name: "auth", mode: "register" })}
                >
                  Регистрация
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {view.name === "home" ? <HeroBanner /> : null}

        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8 lg:py-10">
          <div className="space-y-6">
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Данные форума пока хранятся в браузере этого устройства (без общей
              облачной БД). Админ:{" "}
              <strong>{bootstrapAdmin.username}</strong> /{" "}
              <strong>{bootstrapAdmin.password}</strong>
            </div>

            {view.name === "home" ? (
              <>
                <section id="boards" className="space-y-8">
                  {forumSections.map((section) => (
                    <div key={section.id}>
                      <h2 className="mb-3 font-heading text-xl font-extrabold text-ink sm:text-2xl">
                        {section.title}
                      </h2>
                      <div className="space-y-3">
                        {section.boards.map((board) => {
                          const count = state.threads.filter(
                            (t) => t.boardId === board.id,
                          ).length;
                          const latest = state.threads
                            .filter((t) => t.boardId === board.id)
                            .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
                          return (
                            <button
                              key={board.id}
                              type="button"
                              onClick={() =>
                                setView({ name: "board", boardId: board.id })
                              }
                              className="panel flex w-full flex-col gap-4 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(28,36,48,0.1)] sm:flex-row sm:items-center sm:gap-5 sm:p-5"
                            >
                              <div
                                className="mc-block flex size-14 shrink-0 items-center justify-center rounded-full text-2xl text-white"
                                style={{ backgroundColor: board.tone }}
                              >
                                {board.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-heading text-lg font-bold text-ink">
                                  {board.title}
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {board.description}
                                </p>
                              </div>
                              <div className="sm:w-20 sm:text-right">
                                <div className="font-semibold text-ink">{count}</div>
                                <div className="text-xs text-muted-foreground">тем</div>
                              </div>
                              <div className="min-w-0 sm:w-56">
                                {latest ? (
                                  <>
                                    <p className="truncate text-sm font-medium">
                                      {latest.title}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {latest.authorName} · {latest.updatedAt}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    Пока нет тем — открой раздел
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>
                <StaffRoles />
              </>
            ) : null}

            {view.name === "board" ? (
              <BoardView
                boardId={view.boardId}
                threads={boardThreads}
                userLoggedIn={Boolean(user)}
                threadTitle={threadTitle}
                threadBody={threadBody}
                formError={formError}
                onTitle={setThreadTitle}
                onBody={setThreadBody}
                onBack={() => setView({ name: "home" })}
                onOpenThread={(id) => setView({ name: "thread", threadId: id })}
                onCreate={() => onCreateThread(view.boardId)}
                onNeedAuth={() => setView({ name: "auth", mode: "login" })}
              />
            ) : null}

            {view.name === "thread" && openThread ? (
              <ThreadView
                thread={openThread}
                posts={state.posts.filter((p) => p.threadId === openThread.id)}
                user={user}
                replyBody={replyBody}
                formError={formError}
                onReplyBody={setReplyBody}
                onReply={() => onReply(openThread.id)}
                onStatus={(status) => onStatus(openThread.id, status)}
                onBack={() =>
                  setView({ name: "board", boardId: openThread.boardId })
                }
                onNeedAuth={() => setView({ name: "auth", mode: "login" })}
              />
            ) : null}

            {view.name === "auth" ? (
              <section className="panel mx-auto max-w-md p-6">
                <h2 className="font-heading text-2xl font-extrabold text-ink">
                  {view.mode === "login" ? "Вход" : "Регистрация"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Админ-аккаунт уже создан: {bootstrapAdmin.username} /{" "}
                  {bootstrapAdmin.password}
                </p>
                <div className="mt-5 space-y-3">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ник"
                    className="bg-white"
                  />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Пароль"
                    className="bg-white"
                  />
                  {authError ? (
                    <p className="text-sm text-destructive">{authError}</p>
                  ) : null}
                  <Button
                    type="button"
                    className="w-full rounded-xl bg-grass hover:bg-[#2f6d2f]"
                    onClick={() => void onAuth(view.mode)}
                  >
                    {view.mode === "login" ? "Войти" : "Создать аккаунт"}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-sm text-muted-foreground underline"
                    onClick={() =>
                      setView({
                        name: "auth",
                        mode: view.mode === "login" ? "register" : "login",
                      })
                    }
                  >
                    {view.mode === "login"
                      ? "Нет аккаунта? Регистрация"
                      : "Уже есть аккаунт? Войти"}
                  </button>
                </div>
              </section>
            ) : null}

            {view.name === "admin" && user && canAdmin(user.role) ? (
              <section className="panel p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-heading text-2xl font-extrabold text-ink">
                    Админ-панель
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setView({ name: "home" })}
                  >
                    На главную
                  </Button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Выдавай роли: Игрок → Хелпер → Модератор → Админ → Главный админ.
                </p>
                {formError ? (
                  <p className="mt-3 text-sm text-destructive">{formError}</p>
                ) : null}
                <ul className="mt-6 divide-y divide-border border-y border-border">
                  {state.users.map((u) => (
                    <li
                      key={u.id}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{u.username}</span>
                          <RoleTag role={u.role} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          с {u.createdAt}
                        </p>
                      </div>
                      <select
                        className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
                        value={u.role}
                        disabled={u.id === user.id && user.role === "chief"}
                        onChange={(e) =>
                          onRoleChange(u.id, e.target.value as UserRole)
                        }
                      >
                        {roleOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <ForumSidebar />
        </div>
      </main>

      <footer className="border-t border-border/80 bg-white/70 px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
        CloudWorld Forum · IP {site.ip} ·{" "}
        <a className="underline" href={site.botUrl} target="_blank" rel="noreferrer">
          {site.bot}
        </a>
      </footer>
    </>
  );
}

function BoardView({
  boardId,
  threads,
  userLoggedIn,
  threadTitle,
  threadBody,
  formError,
  onTitle,
  onBody,
  onBack,
  onOpenThread,
  onCreate,
  onNeedAuth,
}: {
  boardId: string;
  threads: ForumThread[];
  userLoggedIn: boolean;
  threadTitle: string;
  threadBody: string;
  formError: string | null;
  onTitle: (v: string) => void;
  onBody: (v: string) => void;
  onBack: () => void;
  onOpenThread: (id: string) => void;
  onCreate: () => void;
  onNeedAuth: () => void;
}) {
  const board = getBoard(boardId);
  if (!board) return null;

  return (
    <section className="space-y-5">
      <button type="button" onClick={onBack} className="text-sm text-grass hover:underline">
        ← Все разделы
      </button>
      <div className="panel p-5">
        <div className="flex items-center gap-3">
          <span
            className="mc-block flex size-12 items-center justify-center rounded-full text-xl text-white"
            style={{ backgroundColor: board.tone }}
          >
            {board.icon}
          </span>
          <div>
            <h2 className="font-heading text-2xl font-extrabold text-ink">
              {board.title}
            </h2>
            <p className="text-sm text-muted-foreground">{board.description}</p>
          </div>
        </div>
      </div>

      <div className="panel divide-y divide-border overflow-hidden">
        {threads.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            В разделе пока нет тем. Создай первую.
          </p>
        ) : (
          threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => onOpenThread(thread.id)}
              className="flex w-full flex-col gap-2 p-4 text-left hover:bg-secondary/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={statusLabel[thread.status]}
                    tone={thread.status}
                  />
                  <span className="font-heading text-lg font-bold text-ink">
                    {thread.title}
                  </span>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{thread.authorName}</span>
                  <RoleTag role={thread.authorRole} />
                  <span>· {thread.updatedAt}</span>
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="panel space-y-3 p-5">
        <h3 className="font-heading text-xl font-bold">Новая тема</h3>
        {userLoggedIn ? (
          <>
            <Input
              value={threadTitle}
              onChange={(e) => onTitle(e.target.value)}
              placeholder="Заголовок"
              className="bg-white"
            />
            <Textarea
              value={threadBody}
              onChange={(e) => onBody(e.target.value)}
              placeholder="Текст темы"
              rows={4}
              className="bg-white"
            />
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <Button
              type="button"
              className="rounded-xl bg-grass hover:bg-[#2f6d2f]"
              onClick={onCreate}
            >
              Опубликовать
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Чтобы создать тему,{" "}
            <button type="button" className="text-grass underline" onClick={onNeedAuth}>
              войди
            </button>
            .
          </p>
        )}
      </div>
    </section>
  );
}

function ThreadView({
  thread,
  posts,
  user,
  replyBody,
  formError,
  onReplyBody,
  onReply,
  onStatus,
  onBack,
  onNeedAuth,
}: {
  thread: ForumThread;
  posts: ForumPost[];
  user: ReturnType<typeof getCurrentUser>;
  replyBody: string;
  formError: string | null;
  onReplyBody: (v: string) => void;
  onReply: () => void;
  onStatus: (s: ThreadStatus) => void;
  onBack: () => void;
  onNeedAuth: () => void;
}) {
  return (
    <section className="space-y-5">
      <button type="button" onClick={onBack} className="text-sm text-grass hover:underline">
        ← К разделу
      </button>
      <article className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={statusLabel[thread.status]} tone={thread.status} />
          {user && canModerate(user.role) ? (
            <select
              className="rounded-lg border border-border bg-white px-2 py-1 text-xs"
              value={thread.status}
              onChange={(e) => onStatus(e.target.value as ThreadStatus)}
            >
              {(Object.keys(statusLabel) as ThreadStatus[]).map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <h2 className="mt-3 font-heading text-2xl font-extrabold text-ink sm:text-3xl">
          {thread.title}
        </h2>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{thread.authorName}</span>
          <RoleTag role={thread.authorRole} />
          <span>· {thread.createdAt}</span>
        </p>
        <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed">
          {thread.body}
        </p>
      </article>

      <div className="space-y-3">
        <h3 className="font-heading text-xl font-bold">Ответы ({posts.length})</h3>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет ответов.</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="panel p-4">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <span>{post.authorName}</span>
                <RoleTag role={post.authorRole} />
                <span className="font-normal text-muted-foreground">
                  {post.createdAt}
                </span>
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                {post.body}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="panel space-y-3 p-5">
        <h3 className="font-heading text-lg font-bold">Ваш ответ</h3>
        {user ? (
          <>
            <Textarea
              value={replyBody}
              onChange={(e) => onReplyBody(e.target.value)}
              rows={4}
              placeholder="Написать ответ…"
              className="bg-white"
            />
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <Button
              type="button"
              className="rounded-xl bg-grass hover:bg-[#2f6d2f]"
              onClick={onReply}
            >
              Ответить
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Чтобы ответить,{" "}
            <button type="button" className="text-grass underline" onClick={onNeedAuth}>
              войди
            </button>
            .
          </p>
        )}
      </div>
    </section>
  );
}
