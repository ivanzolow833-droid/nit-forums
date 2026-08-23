"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  Copy,
  Database,
  Home,
  LockKeyhole,
  LogIn,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { ForumAdmin } from "@/components/forum-admin";
import { ForumSidebar } from "@/components/forum-sidebar";
import { HeroBanner } from "@/components/hero";
import { RoleBadge, StatusBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { site, statusLabels, type ThreadStatus } from "@/lib/forum-data";
import {
  loadForum,
  runForumAction,
  type ForumAction,
  type ForumBoard,
  type ForumPayload,
  type ForumPost,
  type ForumThread,
} from "@/lib/forum-store";

type View =
  | { name: "home" }
  | { name: "board"; boardId: string }
  | { name: "thread"; threadId: string }
  | { name: "auth"; mode: "login" | "register" }
  | { name: "admin" };

export function ForumApp() {
  const [view, setView] = useState<View>({ name: "home" });
  const [payload, setPayload] = useState<ForumPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [threadTitle, setThreadTitle] = useState("");
  const [threadBody, setThreadBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadForum(
        view.name === "board"
          ? { boardId: view.boardId }
          : view.name === "thread"
            ? { threadId: view.threadId }
            : undefined,
      );
      setPayload(data);
      setFatalError(null);
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : "Форум временно недоступен.");
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const currentBoard = useMemo(() => {
    if (!payload || view.name !== "board") return null;
    return payload.sections.flatMap((section) => section.boards).find((board) => board.id === view.boardId) ?? null;
  }, [payload, view]);

  function navigate(next: View) {
    setFormError(null);
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function perform(action: ForumAction, after?: () => void) {
    setBusy(true);
    setFormError(null);
    try {
      const result = await runForumAction(action);
      after?.();
      await refresh();
      return result;
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Действие не выполнено.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function copyIp() {
    try {
      await navigator.clipboard.writeText(site.ip);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setFormError("Не удалось скопировать IP. Выделите его вручную.");
    }
  }

  async function submitAuth() {
    if (view.name !== "auth") return;
    const result = await perform({ action: view.mode, username, password });
    if (result) {
      setUsername("");
      setPassword("");
      navigate({ name: "home" });
    }
  }

  async function logout() {
    const result = await perform({ action: "logout" });
    if (result) navigate({ name: "home" });
  }

  async function createThread(boardId: string) {
    const result = await perform({ action: "create_thread", boardId, title: threadTitle, body: threadBody });
    if (result?.id) {
      setThreadTitle("");
      setThreadBody("");
      navigate({ name: "thread", threadId: result.id });
    }
  }

  async function createPost(threadId: string) {
    const result = await perform({ action: "create_post", threadId, body: replyBody });
    if (result) setReplyBody("");
  }

  if (fatalError && !payload) {
    return <DatabaseSetup error={fatalError} onRetry={() => void refresh()} />;
  }

  if (!payload) {
    return <LoadingScreen />;
  }

  const user = payload.currentUser;
  const showHero = view.name === "home";

  return (
    <>
      {user?.mustChangePassword ? (
        <PasswordChangeDialog
          currentPassword={currentPassword}
          newPassword={newPassword}
          error={formError}
          busy={busy}
          onCurrentPassword={setCurrentPassword}
          onNewPassword={setNewPassword}
          onSave={() => void perform(
            { action: "change_password", currentPassword, newPassword },
            () => {
              setCurrentPassword("");
              setNewPassword("");
            },
          )}
        />
      ) : null}
      <header className="site-header">
        <div className="header-accent" />
        <div className="mx-auto flex w-full max-w-[1380px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => navigate({ name: "home" })} className="brand-lockup">
            <span className="brand-mark">CW</span>
            <span><strong>CLOUD<span>WORLD</span></strong><small>Официальный форум</small></span>
          </button>

          <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto border-t border-white/[0.06] pt-2 text-xs font-bold uppercase tracking-wider sm:order-none sm:ml-4 sm:w-auto sm:border-0 sm:pt-0">
            <button type="button" className={view.name === "home" ? "nav-link active" : "nav-link"} onClick={() => navigate({ name: "home" })}><Home /> Главная</button>
            {user?.role.canManageForum || user?.role.canManageRoles ? (
              <button type="button" className={view.name === "admin" ? "nav-link active" : "nav-link"} onClick={() => navigate({ name: "admin" })}><Settings /> Управление</button>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" className="hidden h-9 rounded-md border-white/10 bg-white/[0.03] font-mono text-xs text-white hover:bg-white/[0.07] hover:text-white md:inline-flex" onClick={copyIp}>
              <Copy /> {copied ? "Скопировано" : site.ip}
            </Button>
            {user ? (
              <>
                <div className="hidden text-right sm:block"><strong className="block text-xs text-white">{user.username}</strong><RoleBadge role={user.role} /></div>
                <Button type="button" size="icon" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" aria-label="Выйти" onClick={() => void logout()}><LogOut /></Button>
              </>
            ) : (
              <>
                <Button type="button" variant="ghost" className="text-white/70 hover:bg-white/5 hover:text-white" onClick={() => navigate({ name: "auth", mode: "login" })}><LogIn /> Войти</Button>
                <Button type="button" className="bg-red-600 font-bold hover:bg-red-500" onClick={() => navigate({ name: "auth", mode: "register" })}><UserPlus /> Регистрация</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {showHero ? <HeroBanner members={payload.stats.members} threads={payload.stats.threads} onBoards={() => document.getElementById("forum-sections")?.scrollIntoView({ behavior: "smooth" })} /> : null}

      <main className="mx-auto grid w-full max-w-[1380px] flex-1 gap-5 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:py-9">
        <div className="min-w-0 space-y-5">
          {loading ? <div className="loading-line" /> : null}
          {formError ? <div className="form-error">{formError}</div> : null}

          {view.name === "home" ? (
            <HomeView
              payload={payload}
              onBoard={(boardId) => navigate({ name: "board", boardId })}
              onThread={(threadId) => navigate({ name: "thread", threadId })}
            />
          ) : null}

          {view.name === "board" && currentBoard ? (
            <BoardView
              board={currentBoard}
              threads={payload.boardThreads}
              userRank={user?.role.rank ?? -1}
              loggedIn={Boolean(user)}
              title={threadTitle}
              body={threadBody}
              busy={busy}
              onTitle={setThreadTitle}
              onBody={setThreadBody}
              onBack={() => navigate({ name: "home" })}
              onThread={(threadId) => navigate({ name: "thread", threadId })}
              onCreate={() => void createThread(currentBoard.id)}
              onLogin={() => navigate({ name: "auth", mode: "login" })}
            />
          ) : null}

          {view.name === "thread" && payload.activeThread ? (
            <ThreadView
              thread={payload.activeThread}
              posts={payload.posts}
              currentUser={user}
              reply={replyBody}
              busy={busy}
              onReply={setReplyBody}
              onSend={() => void createPost(payload.activeThread!.id)}
              onBack={() => navigate({ name: "board", boardId: payload.activeThread!.boardId })}
              onLogin={() => navigate({ name: "auth", mode: "login" })}
              onStatus={(status) => void perform({ action: "set_thread_status", threadId: payload.activeThread!.id, status })}
            />
          ) : null}

          {view.name === "auth" ? (
            <AuthView
              mode={view.mode}
              username={username}
              password={password}
              busy={busy}
              onUsername={setUsername}
              onPassword={setPassword}
              onSubmit={() => void submitAuth()}
              onMode={(mode) => navigate({ name: "auth", mode })}
            />
          ) : null}

          {view.name === "admin" ? <ForumAdmin payload={payload} onChanged={refresh} /> : null}
        </div>

        <ForumSidebar user={user} roles={payload.roles} members={payload.stats.members} />
      </main>

      <footer className="border-t border-white/[0.06] bg-[#080a0e]">
        <div className="mx-auto flex max-w-[1380px] flex-col gap-3 px-4 py-8 text-xs text-white/35 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div><strong className="text-white/70">CloudWorld Forum</strong><br />Официальный форум игрового проекта</div>
          <div className="md:text-right">IP: <span className="font-mono text-white/60">{site.ip}</span><br />© {new Date().getFullYear()} CloudWorld</div>
        </div>
      </footer>
    </>
  );
}

function HomeView({ payload, onBoard, onThread }: { payload: ForumPayload; onBoard: (id: string) => void; onThread: (id: string) => void }) {
  return (
    <>
      <section id="forum-sections" className="space-y-5 scroll-mt-24">
        {payload.sections.map((section) => (
          <div key={section.id} className="forum-section">
            <div className="section-head">
              <div><h2>{section.title}</h2><p>{section.description}</p></div>
              {section.isStaffOnly ? <span className="private-pill"><LockKeyhole /> Только состав</span> : null}
            </div>
            <div className="divide-y divide-white/[0.06]">
              {section.boards.map((board) => (
                <button key={board.id} type="button" className="board-row" onClick={() => onBoard(board.id)}>
                  <span className="board-icon" style={{ color: board.accent, borderColor: `${board.accent}55`, backgroundColor: `${board.accent}12` }}>{board.icon}</span>
                  <span className="min-w-0 flex-1 text-left">
                    <strong>{board.title}</strong>
                    <small>{board.description}</small>
                  </span>
                  <span className="board-count"><strong>{board.threadCount}</strong><small>тем</small></span>
                  <span className="latest-cell">
                    {board.latestThread ? (
                      <><strong>{board.latestThread.title}</strong><small>{board.latestThread.authorName} · {formatDate(board.latestThread.updatedAt)}</small></>
                    ) : (
                      <><strong>Пока нет тем</strong><small>Создайте первую публикацию</small></>
                    )}
                  </span>
                  <ChevronRight className="size-4 text-white/20" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="dark-panel overflow-hidden">
        <div className="panel-title"><Clock3 /> Последние обновления тем</div>
        <div className="divide-y divide-white/[0.06]">
          {payload.recentThreads.map((thread) => (
            <button key={thread.id} type="button" className="recent-row" onClick={() => onThread(thread.id)}>
              <StatusBadge status={thread.status} />
              <span className="min-w-0 flex-1 text-left"><strong>{thread.title}</strong><small>{thread.author.username} · {formatDate(thread.updatedAt)}</small></span>
              <span className="inline-flex items-center gap-1 text-xs text-white/35"><MessageSquare className="size-3.5" /> {thread.replyCount}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function BoardView({
  board,
  threads,
  userRank,
  loggedIn,
  title,
  body,
  busy,
  onTitle,
  onBody,
  onBack,
  onThread,
  onCreate,
  onLogin,
}: {
  board: ForumBoard;
  threads: ForumThread[];
  userRank: number;
  loggedIn: boolean;
  title: string;
  body: string;
  busy: boolean;
  onTitle: (value: string) => void;
  onBody: (value: string) => void;
  onBack: () => void;
  onThread: (id: string) => void;
  onCreate: () => void;
  onLogin: () => void;
}) {
  const canCreate = loggedIn && userRank >= board.postingMinRank;
  return (
    <section className="space-y-5">
      <button type="button" className="back-link" onClick={onBack}><ArrowLeft /> Все разделы</button>
      <div className="dark-panel overflow-hidden">
        <div className="board-hero">
          <span className="board-icon large" style={{ color: board.accent, borderColor: `${board.accent}66`, backgroundColor: `${board.accent}15` }}>{board.icon}</span>
          <div><div className="hero-kicker"><span /> Подраздел форума</div><h1>{board.title}</h1><p>{board.description}</p></div>
        </div>
        <div className="divide-y divide-white/[0.06] border-t border-white/[0.07]">
          {threads.length ? threads.map((thread) => (
            <button key={thread.id} type="button" className="thread-row" onClick={() => onThread(thread.id)}>
              <MessageSquare className="size-5 shrink-0 text-white/20" />
              <span className="min-w-0 flex-1 text-left"><span className="flex flex-wrap items-center gap-2"><StatusBadge status={thread.status} /><strong>{thread.title}</strong></span><small>{thread.author.username} · {formatDate(thread.updatedAt)}</small></span>
              <span className="thread-replies"><strong>{thread.replyCount}</strong><small>ответов</small></span>
              <ChevronRight className="size-4 text-white/20" />
            </button>
          )) : <div className="empty-state">В этом подразделе ещё нет тем.</div>}
        </div>
      </div>

      <div className="dark-panel overflow-hidden">
        <div className="panel-title"><Plus /> Создать новую тему</div>
        <div className="space-y-3 p-4">
          {!loggedIn ? (
            <div className="empty-state compact">Чтобы опубликовать тему, <button type="button" onClick={onLogin}>войдите в аккаунт</button>.</div>
          ) : !canCreate ? (
            <div className="empty-state compact">В этом подразделе публикация доступна только администрации.</div>
          ) : (
            <>
              <Input value={title} onChange={(event) => onTitle(event.target.value)} placeholder="Заголовок темы" maxLength={140} />
              <Textarea value={body} onChange={(event) => onBody(event.target.value)} placeholder="Подробно опишите тему…" rows={6} maxLength={20_000} />
              <Button type="button" disabled={busy} className="bg-red-600 font-bold hover:bg-red-500" onClick={onCreate}><Send /> Опубликовать тему</Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ThreadView({
  thread,
  posts,
  currentUser,
  reply,
  busy,
  onReply,
  onSend,
  onBack,
  onLogin,
  onStatus,
}: {
  thread: ForumThread;
  posts: ForumPost[];
  currentUser: ForumPayload["currentUser"];
  reply: string;
  busy: boolean;
  onReply: (value: string) => void;
  onSend: () => void;
  onBack: () => void;
  onLogin: () => void;
  onStatus: (status: ThreadStatus) => void;
}) {
  return (
    <section className="space-y-4">
      <button type="button" className="back-link" onClick={onBack}><ArrowLeft /> К подразделу</button>
      <article className="post-card topic-card">
        <AuthorRail user={thread.author} />
        <div className="post-body">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={thread.status} /><span className="text-xs text-white/35">{formatDate(thread.createdAt)}</span></div>
            {currentUser?.role.canModerate ? (
              <select className="forum-select w-auto text-xs" value={thread.status} onChange={(event) => onStatus(event.target.value as ThreadStatus)}>
                {(Object.keys(statusLabels) as ThreadStatus[]).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
              </select>
            ) : null}
          </div>
          <h1 className="mt-4 font-heading text-2xl font-black text-white sm:text-3xl">{thread.title}</h1>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/70">{thread.body}</p>
        </div>
      </article>

      {posts.map((post) => (
        <article key={post.id} className="post-card">
          <AuthorRail user={post.author} />
          <div className="post-body"><div className="border-b border-white/[0.06] pb-3 text-xs text-white/35">{formatDate(post.createdAt)}</div><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/70">{post.body}</p></div>
        </article>
      ))}

      <div className="dark-panel overflow-hidden">
        <div className="panel-title"><MessageSquare /> Ответить в теме</div>
        <div className="space-y-3 p-4">
          {!currentUser ? (
            <div className="empty-state compact">Чтобы ответить, <button type="button" onClick={onLogin}>войдите в аккаунт</button>.</div>
          ) : thread.status === "closed" && !currentUser.role.canModerate ? (
            <div className="empty-state compact">Тема закрыта для новых ответов.</div>
          ) : (
            <><Textarea value={reply} onChange={(event) => onReply(event.target.value)} placeholder="Ваш ответ…" rows={6} maxLength={10_000} /><Button type="button" disabled={busy} className="bg-red-600 font-bold hover:bg-red-500" onClick={onSend}><Send /> Отправить ответ</Button></>
          )}
        </div>
      </div>
    </section>
  );
}

function AuthorRail({ user }: { user: ForumThread["author"] }) {
  return (
    <aside className="author-rail">
      <div className="avatar-mark">{user.username.slice(0, 2).toUpperCase()}</div>
      <strong>{user.username}</strong>
      <RoleBadge role={user.role} />
      <small>На форуме с<br />{formatDate(user.createdAt, true)}</small>
    </aside>
  );
}

function AuthView({ mode, username, password, busy, onUsername, onPassword, onSubmit, onMode }: { mode: "login" | "register"; username: string; password: string; busy: boolean; onUsername: (value: string) => void; onPassword: (value: string) => void; onSubmit: () => void; onMode: (mode: "login" | "register") => void }) {
  return (
    <section className="mx-auto max-w-lg">
      <div className="dark-panel overflow-hidden">
        <div className="auth-head"><div className="auth-icon">{mode === "login" ? <LogIn /> : <UserPlus />}</div><div><div className="hero-kicker"><span /> CloudWorld ID</div><h1>{mode === "login" ? "Вход на форум" : "Регистрация"}</h1></div></div>
        <div className="space-y-3 border-t border-white/[0.07] p-5">
          <label className="editor-label">Игровой ник<Input value={username} onChange={(event) => onUsername(event.target.value)} placeholder="Ваш ник" autoComplete="username" maxLength={24} /></label>
          <label className="editor-label">Пароль<Input type="password" value={password} onChange={(event) => onPassword(event.target.value)} placeholder={mode === "login" ? "Введите пароль" : "Минимум 8 символов"} autoComplete={mode === "login" ? "current-password" : "new-password"} maxLength={128} onKeyDown={(event) => { if (event.key === "Enter") onSubmit(); }} /></label>
          <Button type="button" disabled={busy} className="h-11 w-full bg-red-600 font-bold uppercase hover:bg-red-500" onClick={onSubmit}>{mode === "login" ? "Войти" : "Создать аккаунт"}</Button>
          <button type="button" className="w-full text-center text-xs text-white/45 hover:text-red-400" onClick={() => onMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже зарегистрированы? Войти"}</button>
        </div>
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-white/30"><ShieldCheck className="mr-1 inline size-3.5" /> Пароль хешируется на сервере, а вход хранится в защищённой HTTP-only сессии.</p>
    </section>
  );
}

function DatabaseSetup({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07090d] p-4">
      <div className="dark-panel w-full max-w-xl overflow-hidden text-center">
        <div className="p-8">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-400"><Database className="size-7" /></div>
          <h1 className="mt-5 font-heading text-2xl font-black uppercase text-white">Подключите базу данных</h1>
          <p className="mt-3 text-sm leading-6 text-white/50">{error}</p>
          <div className="mt-5 rounded-lg border border-white/[0.07] bg-black/25 p-4 text-left text-xs leading-6 text-white/45">Vercel → проект <strong className="text-white/70">nit-forums</strong> → Storage → Neon → Connect. Интеграция автоматически добавит переменную <code>DATABASE_URL</code>.</div>
          <Button type="button" className="mt-5 bg-red-600 font-bold hover:bg-red-500" onClick={onRetry}><RefreshCw /> Проверить снова</Button>
        </div>
      </div>
    </main>
  );
}

function PasswordChangeDialog({
  currentPassword,
  newPassword,
  error,
  busy,
  onCurrentPassword,
  onNewPassword,
  onSave,
}: {
  currentPassword: string;
  newPassword: string;
  error: string | null;
  busy: boolean;
  onCurrentPassword: (value: string) => void;
  onNewPassword: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="dark-panel w-full max-w-md overflow-hidden">
        <div className="auth-head">
          <div className="auth-icon"><LockKeyhole /></div>
          <div><div className="hero-kicker"><span /> Безопасность владельца</div><h1>Смените пароль</h1></div>
        </div>
        <div className="space-y-3 border-t border-white/[0.07] p-5">
          <p className="text-xs leading-5 text-white/45">Стандартный пароль известен из настроек проекта. Перед управлением форумом установите собственный пароль.</p>
          {error ? <div className="form-error">{error}</div> : null}
          <label className="editor-label">Текущий пароль<Input type="password" value={currentPassword} onChange={(event) => onCurrentPassword(event.target.value)} autoComplete="current-password" /></label>
          <label className="editor-label">Новый пароль<Input type="password" value={newPassword} onChange={(event) => onNewPassword(event.target.value)} placeholder="Минимум 10 символов" autoComplete="new-password" maxLength={128} /></label>
          <Button type="button" disabled={busy} className="h-11 w-full bg-red-600 font-bold uppercase hover:bg-red-500" onClick={onSave}><ShieldCheck /> Сохранить новый пароль</Button>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return <main className="flex min-h-screen items-center justify-center bg-[#07090d]"><div className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-white/45"><RefreshCw className="size-5 animate-spin text-red-500" /> Загрузка CloudWorld</div></main>;
}

function formatDate(value: string, short = false) {
  return new Intl.DateTimeFormat("ru-RU", short ? { month: "short", year: "numeric" } : { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
