/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Copy,
  Database,
  FileSignature,
  FolderSearch,
  History,
  Home,
  Inbox,
  Lock,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Unlock,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { ForumAdmin } from "@/components/forum-admin";
import { ForumSidebar } from "@/components/forum-sidebar";
import { ForumStaffPanel } from "@/components/forum-staff";
import { HeroBanner } from "@/components/hero";
import { RoleBadge, StatusBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { site } from "@/lib/forum-data";
import type { PermissionKey } from "@/lib/forum-permissions";
import {
  loadForum,
  runForumAction,
  type ForumAction,
  type ForumAiSuggestion,
  type ForumBoard,
  type ForumFormField,
  type ForumPayload,
  type ForumPost,
  type ForumSignature,
  type ForumTemplate,
  type ForumThread,
  type ForumUser,
} from "@/lib/forum-store";

type AccountTab = "account" | "notifications" | "bookmarks" | "publications" | "reactions" | "info" | "security" | "privacy" | "settings" | "subscriptions" | "followers" | "following" | "ignoring";
type View =
  | { name: "home" }
  | { name: "board"; boardId: string }
  | { name: "thread"; threadId: string }
  | { name: "auth"; mode: "login" | "register" }
  | { name: "admin" }
  | { name: "staff" }
  | { name: "messages"; conversationId?: string }
  | { name: "account"; tab: AccountTab }
  | { name: "search" };

type MenuName = "notifications" | "messages" | "profile" | null;

function roleHas(user: ForumUser | null, permission: PermissionKey) {
  return Boolean(user && (["owner", "mrproper"].includes(user.role.id) || user.role.permissions.includes(permission)));
}

export function ForumApp() {
  const [view, setView] = useState<View>({ name: "home" });
  const [payload, setPayload] = useState<ForumPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<MenuName>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [threadTitle, setThreadTitle] = useState("");
  const [threadBody, setThreadBody] = useState("");
  const [threadTagIds, setThreadTagIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [replyBody, setReplyBody] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchTag, setSearchTag] = useState("");
  const [searchRole, setSearchRole] = useState("");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [copied, setCopied] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferUserId, setTransferUserId] = useState("");
  const [transferRoleId, setTransferRoleId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [templateUse, setTemplateUse] = useState<ForumTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadForum(
        view.name === "board" ? { boardId: view.boardId }
          : view.name === "thread" ? { threadId: view.threadId }
            : view.name === "messages" ? { conversationId: view.conversationId }
              : view.name === "search" ? { search: searchTerm, status: searchStatus, tag: searchTag, role: searchRole, dateFrom: searchDateFrom }
                : undefined,
      );
      setPayload(data);
      setFatalError(null);
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : "Форум временно недоступен.");
    } finally {
      setLoading(false);
    }
  }, [view, searchTerm, searchStatus, searchTag, searchRole, searchDateFrom]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const currentBoard = useMemo(() => {
    if (!payload || view.name !== "board") return null;
    return payload.sections.flatMap((section) => section.boards).find((board) => board.id === view.boardId) ?? null;
  }, [payload, view]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (view.name === "board") {
        const local = window.localStorage.getItem(`cloudworld:draft:thread:${view.boardId}`);
        const server = payload?.drafts[`thread:${view.boardId}`];
        const saved = local ? JSON.parse(local) as Record<string, unknown> : server as Record<string, unknown> | undefined;
        if (saved) {
          setThreadTitle(String(saved.title ?? "")); setThreadBody(String(saved.body ?? ""));
          setThreadTagIds(Array.isArray(saved.tagIds) ? saved.tagIds.map(String) : []); setFormData((saved.formData as Record<string, unknown>) ?? {});
        }
      }
      if (view.name === "thread") {
        const local = window.localStorage.getItem(`cloudworld:draft:reply:${view.threadId}`);
        const server = payload?.drafts[`reply:${view.threadId}`];
        const saved = local ? JSON.parse(local) as Record<string, unknown> : server as Record<string, unknown> | undefined;
        if (saved) setReplyBody(String(saved.body ?? ""));
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [view, payload?.drafts]);

  useEffect(() => {
    if (view.name !== "board" || (!threadTitle && !threadBody && !Object.keys(formData).length)) return;
    const value = { title: threadTitle, body: threadBody, tagIds: threadTagIds, formData };
    window.localStorage.setItem(`cloudworld:draft:thread:${view.boardId}`, JSON.stringify(value));
    const timer = window.setTimeout(() => { if (payload?.currentUser) void runForumAction({ action: "save_draft", key: `thread:${view.boardId}`, body: value }).catch(() => undefined); }, 1400);
    return () => window.clearTimeout(timer);
  }, [view, threadTitle, threadBody, threadTagIds, formData, payload?.currentUser]);

  useEffect(() => {
    if (view.name !== "thread" || !replyBody) return;
    const value = { body: replyBody };
    window.localStorage.setItem(`cloudworld:draft:reply:${view.threadId}`, JSON.stringify(value));
    const timer = window.setTimeout(() => { if (payload?.currentUser) void runForumAction({ action: "save_draft", key: `reply:${view.threadId}`, body: value }).catch(() => undefined); }, 1400);
    return () => window.clearTimeout(timer);
  }, [view, replyBody, payload?.currentUser]);

  function navigate(next: View) {
    setFormError(null); setMenu(null); setView(next); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function perform(action: ForumAction, after?: () => void) {
    setBusy(true); setFormError(null);
    try {
      const result = await runForumAction(action);
      after?.(); await refresh(); return result;
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Действие не выполнено."); return null;
    } finally { setBusy(false); }
  }

  async function copyIp() {
    try { await navigator.clipboard.writeText(site.ip); setCopied(true); window.setTimeout(() => setCopied(false), 1400); }
    catch { setFormError("Не удалось скопировать IP."); }
  }

  async function submitAuth() {
    if (view.name !== "auth") return;
    const result = await perform({ action: view.mode, username, password });
    if (result) { setUsername(""); setPassword(""); navigate({ name: "home" }); }
  }

  async function createThread(boardId: string) {
    const result = await perform({ action: "create_thread", boardId, title: threadTitle, body: threadBody, tagIds: threadTagIds, formData });
    if (result?.id) {
      window.localStorage.removeItem(`cloudworld:draft:thread:${boardId}`);
      void runForumAction({ action: "delete_draft", key: `thread:${boardId}` }).catch(() => undefined);
      setThreadTitle(""); setThreadBody(""); setThreadTagIds([]); setFormData({}); navigate({ name: "thread", threadId: result.id });
    }
  }

  async function createPost(threadId: string) {
    const result = await perform({ action: "create_post", threadId, body: replyBody });
    if (result) { window.localStorage.removeItem(`cloudworld:draft:reply:${threadId}`); void runForumAction({ action: "delete_draft", key: `reply:${threadId}` }).catch(() => undefined); setReplyBody(""); }
  }

  function openLinked(href: string) {
    if (href.startsWith("thread:")) navigate({ name: "thread", threadId: href.slice(7) });
    else if (href.startsWith("conversation:")) navigate({ name: "messages", conversationId: href.slice(13) });
    else if (href === "profile") navigate({ name: "account", tab: "account" });
    else navigate({ name: "home" });
  }

  if (fatalError && !payload) return <DatabaseSetup error={fatalError} onRetry={() => void refresh()} />;
  if (!payload) return <LoadingScreen />;

  const user = payload.currentUser;
  const effectiveRole = payload.viewingAsRole ?? user?.role ?? payload.roles.find((role) => role.id === "member") ?? null;
  const staffVisible = Boolean(user && !payload.viewingAsRole && roleHas(user, "forum.topic.assign"));
  const adminVisible = Boolean(user && !payload.viewingAsRole && (roleHas(user, "forum.roles.manage") || roleHas(user, "forum.sections.manage") || roleHas(user, "forum.audit.view")));
  const showHero = view.name === "home";

  return <>
    {user?.mustChangePassword ? <PasswordChangeDialog currentPassword={currentPassword} newPassword={newPassword} error={formError} busy={busy} onCurrentPassword={setCurrentPassword} onNewPassword={setNewPassword} onSave={() => void perform({ action: "change_password", currentPassword, newPassword }, () => { setCurrentPassword(""); setNewPassword(""); })} /> : null}
    {payload.viewingAsRole ? <div className="view-as-banner"><span>Просмотр как: <RoleBadge role={payload.viewingAsRole} /></span><Button size="sm" onClick={() => void perform({ action: "set_view_as_role", roleId: null })}><ShieldCheck /> Вернуться в режим владельца</Button></div> : null}
    <header className="site-header">
      <div className="header-accent" />
      <div className="mx-auto flex w-full max-w-[1380px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <button onClick={() => navigate({ name: "home" })} className="brand-lockup"><span className="brand-mark">CW</span><span><strong>CLOUD<span>WORLD</span></strong><small>Официальный форум</small></span></button>
        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto border-t border-white/[0.06] pt-2 text-xs font-bold uppercase tracking-wider lg:order-none lg:ml-4 lg:w-auto lg:border-0 lg:pt-0">
          <button className={view.name === "home" ? "nav-link active" : "nav-link"} onClick={() => navigate({ name: "home" })}><Home /> Главная</button>
          <button className={view.name === "search" ? "nav-link active" : "nav-link"} onClick={() => navigate({ name: "search" })}><Search /> Поиск</button>
          {staffVisible ? <button className={view.name === "staff" ? "nav-link active" : "nav-link"} onClick={() => navigate({ name: "staff" })}><ShieldCheck /> Модерация</button> : null}
          {adminVisible ? <button className={view.name === "admin" ? "nav-link active" : "nav-link"} onClick={() => navigate({ name: "admin" })}><Settings /> Управление</button> : null}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" className="hidden h-9 border-white/10 bg-white/[0.03] font-mono text-xs text-white hover:bg-white/[0.07] md:inline-flex" onClick={copyIp}><Copy /> {copied ? "Скопировано" : site.ip}</Button>
          {user ? <>
            <HeaderMenuButton label="Уведомления" count={payload.unreadNotifications} active={menu === "notifications"} onClick={() => setMenu(menu === "notifications" ? null : "notifications")}><Bell /></HeaderMenuButton>
            <HeaderMenuButton label="Переписки" count={payload.unreadMessages} active={menu === "messages"} onClick={() => setMenu(menu === "messages" ? null : "messages")}><Mail /></HeaderMenuButton>
            <button className="profile-trigger" onClick={() => setMenu(menu === "profile" ? null : "profile")}><Avatar user={user} /><span className="hidden text-left sm:block"><strong>{user.username}</strong><RoleBadge role={effectiveRole ?? user.role} /></span><ChevronDown /></button>
            {menu === "notifications" ? <NotificationsDropdown payload={payload} onOpen={openLinked} onRead={() => void perform({ action: "mark_notifications_read" })} onAll={() => navigate({ name: "account", tab: "notifications" })} /> : null}
            {menu === "messages" ? <MessagesDropdown payload={payload} onOpen={(conversationId) => navigate({ name: "messages", conversationId })} onAll={() => navigate({ name: "messages" })} /> : null}
            {menu === "profile" ? <ProfileDropdown user={user} staff={staffVisible} onNavigate={navigate} onLogout={() => void perform({ action: "logout" }, () => navigate({ name: "home" }))} /> : null}
          </> : <><Button variant="ghost" className="text-white/70 hover:bg-white/5 hover:text-white" onClick={() => navigate({ name: "auth", mode: "login" })}><LogIn /> Войти</Button><Button className="bg-red-600 font-bold hover:bg-red-500" onClick={() => navigate({ name: "auth", mode: "register" })}><UserPlus /> Регистрация</Button></>}
        </div>
      </div>
    </header>

    {showHero ? <HeroBanner members={payload.stats.members} threads={payload.stats.threads} onBoards={() => document.getElementById("forum-sections")?.scrollIntoView({ behavior: "smooth" })} /> : null}

    <main className={view.name === "admin" || view.name === "staff" || view.name === "messages" || view.name === "account" || view.name === "search" ? "mx-auto w-full max-w-[1380px] flex-1 px-4 py-7 sm:px-6 lg:py-9" : "mx-auto grid w-full max-w-[1380px] flex-1 gap-5 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:py-9"}>
      <div className="min-w-0 space-y-5">
        {loading ? <div className="loading-line" /> : null}
        {formError ? <div className="form-error">{formError}</div> : null}
        {view.name === "thread" && payload.activeThread && user && !payload.viewingAsRole ? <ThreadManagementToolbar thread={payload.activeThread} payload={payload} user={user} onAction={(action) => void perform(action)} /> : null}
        {view.name === "home" ? <HomeView payload={payload} navigate={navigate} /> : null}
        {view.name === "board" ? <BoardView board={currentBoard} threads={payload.boardThreads} user={user} payload={payload} title={threadTitle} body={threadBody} tagIds={threadTagIds} formData={formData} busy={busy} onBack={() => navigate({ name: "home" })} onThread={(threadId) => navigate({ name: "thread", threadId })} onTitle={setThreadTitle} onBody={setThreadBody} onTags={setThreadTagIds} onFormData={setFormData} onCreate={() => void createThread(view.boardId)} onLogin={() => navigate({ name: "auth", mode: "login" })} onAction={(action) => void perform(action)} /> : null}
        {view.name === "thread" ? <ThreadView thread={payload.activeThread} posts={payload.posts} payload={payload} user={user} reply={replyBody} busy={busy} transferOpen={transferOpen} transferUserId={transferUserId} transferRoleId={transferRoleId} transferReason={transferReason} onBack={(boardId) => navigate({ name: "board", boardId })} onReply={setReplyBody} onSend={() => void createPost(view.threadId)} onLogin={() => navigate({ name: "auth", mode: "login" })} onAction={(action) => void perform(action)} onTransferOpen={setTransferOpen} onTransferUser={setTransferUserId} onTransferRole={setTransferRoleId} onTransferReason={setTransferReason} onTransfer={() => void perform({ action: "transfer_thread", threadId: view.threadId, userId: transferUserId || undefined, roleId: transferRoleId || undefined, reason: transferReason }, () => { setTransferOpen(false); setTransferUserId(""); setTransferRoleId(""); setTransferReason(""); })} onTemplate={setTemplateUse} /> : null}
        {view.name === "auth" ? <AuthView mode={view.mode} username={username} password={password} busy={busy} onUsername={setUsername} onPassword={setPassword} onSubmit={() => void submitAuth()} onMode={(mode) => navigate({ name: "auth", mode })} /> : null}
        {view.name === "admin" ? <ForumAdmin payload={payload} onChanged={refresh} /> : null}
        {view.name === "staff" ? <ForumStaffPanel payload={payload} onChanged={refresh} /> : null}
        {view.name === "messages" && user ? <MessagesView payload={payload} activeId={view.conversationId} busy={busy} onOpen={(conversationId) => navigate({ name: "messages", conversationId })} onAction={(action, after) => void perform(action, after)} /> : null}
        {view.name === "account" && user ? <AccountView payload={payload} tab={view.tab} busy={busy} onTab={(tab) => navigate({ name: "account", tab })} onThread={(threadId) => navigate({ name: "thread", threadId })} onAction={(action) => void perform(action)} /> : null}
        {view.name === "search" ? <SearchView payload={payload} term={searchTerm} status={searchStatus} tag={searchTag} role={searchRole} dateFrom={searchDateFrom} onTerm={setSearchTerm} onStatus={setSearchStatus} onTag={setSearchTag} onRole={setSearchRole} onDateFrom={setSearchDateFrom} onSearch={() => void refresh()} onOpen={(type, resultId) => { if (type === "thread" || type === "post") navigate({ name: "thread", threadId: resultId }); else if (type === "user" && user) navigate({ name: "account", tab: "info" }); }} /> : null}
      </div>
      {!(["admin", "staff", "messages", "account", "search"].includes(view.name)) ? <ForumSidebar user={user} roles={payload.roles} members={payload.stats.members} /> : null}
    </main>

    {templateUse && payload.activeThread && payload.currentUser ? <TemplateVariablesDialog template={templateUse} thread={payload.activeThread} user={payload.currentUser} values={templateVariables} busy={busy} onValue={(key, value) => setTemplateVariables({ ...templateVariables, [key]: value })} onClose={() => { setTemplateUse(null); setTemplateVariables({}); }} onSend={() => void perform({ action: "use_template", templateId: templateUse.id, threadId: payload.activeThread!.id, variables: templateVariables }, () => { setTemplateUse(null); setTemplateVariables({}); })} /> : null}
  </>;
}

function HeaderMenuButton({ label, count, active, onClick, children }: { label: string; count: number; active: boolean; onClick: () => void; children: ReactNode }) { return <button className={active ? "header-icon active" : "header-icon"} onClick={onClick} aria-label={label}>{children}{count ? <span>{count > 99 ? "99+" : count}</span> : null}</button>; }

function Avatar({ user }: { user: ForumUser }) { return user.avatarUrl ? <img className="avatar-image" src={user.avatarUrl} alt="" /> : <span className="avatar-small">{user.username.slice(0, 2).toUpperCase()}</span>; }

function NotificationsDropdown({ payload, onOpen, onRead, onAll }: { payload: ForumPayload; onOpen: (href: string) => void; onRead: () => void; onAll: () => void }) { return <div className="header-dropdown notifications-dropdown"><div className="dropdown-head"><strong>Уведомления</strong><button onClick={onRead}><Check /> Отметить прочитанными</button></div>{payload.notifications.length ? <div className="dropdown-scroll">{payload.notifications.map((item) => <button key={item.id} className={item.read ? "dropdown-item" : "dropdown-item unread"} onClick={() => onOpen(item.href)}><Bell /><span><strong>{item.title}</strong><small>{item.body}</small><time>{formatDate(item.createdAt)}</time></span></button>)}</div> : <div className="empty-state compact">Новых уведомлений нет.</div>}<button className="dropdown-footer" onClick={onAll}>Показать все</button></div>; }

function MessagesDropdown({ payload, onOpen, onAll }: { payload: ForumPayload; onOpen: (id: string) => void; onAll: () => void }) { return <div className="header-dropdown messages-dropdown"><div className="dropdown-head"><strong>Переписки</strong></div>{payload.conversations.length ? <div className="dropdown-scroll">{payload.conversations.slice(0, 8).map((conversation) => <button key={conversation.id} className={conversation.unread ? "dropdown-item unread" : "dropdown-item"} onClick={() => onOpen(conversation.id)}><MessageSquare /><span><strong>{conversation.title || conversation.participants.join(", ")}</strong><small>{conversation.lastMessage}</small><time>{formatDate(conversation.updatedAt)}</time></span></button>)}</div> : <div className="empty-state compact">Диалогов пока нет.</div>}<button className="dropdown-footer" onClick={onAll}>Показать все</button></div>; }

function ProfileDropdown({ user, staff, onNavigate, onLogout }: { user: ForumUser; staff: boolean; onNavigate: (view: View) => void; onLogout: () => void }) {
  const entries: { label: string; tab?: AccountTab; view?: View; icon: ReactNode }[] = [
    { label: "Мой аккаунт", tab: "account", icon: <Users /> }, { label: "Закладки", tab: "bookmarks", icon: <Bookmark /> },
    { label: "Новостная лента", view: { name: "home" }, icon: <Home /> }, { label: "Мои публикации", tab: "publications", icon: <MessageSquare /> },
    { label: "Полученные реакции", tab: "reactions", icon: <Star /> }, { label: "Информация", tab: "info", icon: <MoreHorizontal /> },
    { label: "Безопасность", tab: "security", icon: <Lock /> }, { label: "Конфиденциальность", tab: "privacy", icon: <ShieldCheck /> },
    { label: "Настройки", tab: "settings", icon: <Settings /> }, { label: "Подписки", tab: "subscriptions", icon: <Bell /> },
    { label: "Подписчики", tab: "followers", icon: <Users /> }, { label: "Подписки на пользователей", tab: "following", icon: <UserPlus /> },
    { label: "Игнорирование", tab: "ignoring", icon: <X /> },
  ];
  return <div className="header-dropdown profile-dropdown"><div className="profile-summary"><Avatar user={user} /><div><strong>{user.username}</strong><RoleBadge role={user.role} /><small>{user.postsCount} сообщений · {user.reactionsCount} реакций · {user.points} баллов</small></div></div><div className="profile-menu">{entries.map((entry) => <button key={entry.label} onClick={() => onNavigate(entry.view ?? { name: "account", tab: entry.tab! })}>{entry.icon}{entry.label}</button>)}{staff ? <><button onClick={() => onNavigate({ name: "staff" })}><ShieldCheck /> Модерация</button><button onClick={() => onNavigate({ name: "staff" })}><Save /> Мои шаблоны</button><button onClick={() => onNavigate({ name: "staff" })}><FileSignature /> Моя подпись</button><button onClick={() => onNavigate({ name: "staff" })}><History /> История действий</button></> : null}<button className="logout-item" onClick={onLogout}><LogOut /> Выход</button></div></div>;
}

function HomeView({ payload, navigate }: { payload: ForumPayload; navigate: (view: View) => void }) { return <><div className="announcement-strip"><ShieldCheck /> Перед публикацией обращения прочитайте правила и приложите доказательства.</div><section id="forum-sections" className="space-y-4">{payload.sections.map((section) => <section key={section.id} className="forum-section overflow-hidden"><div className="section-head"><div><h2>{section.title}</h2><p>{section.description}</p></div>{section.isStaffOnly ? <span className="private-pill"><LockKeyhole /> Только состав</span> : null}</div><div className="divide-y divide-white/[0.06]">{section.boards.map((board) => <button key={board.id} className="board-row" onClick={() => navigate({ name: "board", boardId: board.id })}><span className="board-icon" style={{ color: board.accent, borderColor: `${board.accent}50`, background: `${board.accent}0d` }}>{board.icon}</span><span className="min-w-0 text-left"><strong>{board.title}</strong><small>{board.description}</small></span><span className="board-count"><strong>{board.threadCount}</strong><small>тем</small></span><span className="latest-cell">{board.latestThread ? <><strong>{board.latestThread.title}</strong><small>{board.latestThread.authorName} · {formatDate(board.latestThread.updatedAt)}</small></> : <small>Тем пока нет</small>}</span><ChevronRight className="size-4 text-white/15" /></button>)}</div></section>)}</section><RecentThreads threads={payload.recentThreads} onOpen={(threadId) => navigate({ name: "thread", threadId })} /></>; }

function RecentThreads({ threads, onOpen }: { threads: ForumThread[]; onOpen: (id: string) => void }) { return <section className="dark-panel overflow-hidden"><div className="panel-title"><Clock3 /> Последние темы</div>{threads.length ? <div className="divide-y divide-white/[0.06]">{threads.map((thread) => <button key={thread.id} className="recent-row" onClick={() => onOpen(thread.id)}><StatusBadge status={thread.status} definition={thread.statusDefinition} /><span className="min-w-0 flex-1 text-left"><strong>{thread.title}</strong><small>{thread.author.username} · {formatDate(thread.updatedAt)}</small></span><span className="thread-replies"><strong>{thread.replyCount}</strong><small>ответов</small></span><ChevronRight className="size-4 text-white/15" /></button>)}</div> : <div className="empty-state">Новых тем пока нет.</div>}</section>; }

function BoardView({ board, threads, user, payload, title, body, tagIds, formData, busy, onBack, onThread, onTitle, onBody, onTags, onFormData, onCreate, onLogin, onAction }: { board: ForumBoard | null; threads: ForumThread[]; user: ForumUser | null; payload: ForumPayload; title: string; body: string; tagIds: string[]; formData: Record<string, unknown>; busy: boolean; onBack: () => void; onThread: (id: string) => void; onTitle: (value: string) => void; onBody: (value: string) => void; onTags: (values: string[]) => void; onFormData: (value: Record<string, unknown>) => void; onCreate: () => void; onLogin: () => void; onAction: (action: ForumAction) => void }) {
  if (!board) return <div className="empty-state dark-panel">Раздел не найден.</div>;
  const canCreate = Boolean(user && user.role.rank >= board.postingMinRank && !board.archived);
  const subscribed = payload.subscriptions.includes(`board:${board.id}`);
  return <><button className="back-link" onClick={onBack}><ArrowLeft /> Главная форума</button><section className="dark-panel overflow-hidden"><div className="board-hero"><span className="board-icon large" style={{ color: board.accent, borderColor: `${board.accent}55`, background: `${board.accent}0d` }}>{board.icon}</span><div><div className="hero-kicker"><span /> Раздел форума</div><h1>{board.title}</h1><p>{board.description}</p></div>{user ? <Button size="sm" variant="outline" className="admin-icon-button" onClick={() => onAction({ action: "toggle_subscription", targetType: "board", targetId: board.id })}><Bell className={subscribed ? "fill-current" : ""} /> {subscribed ? "Подписка включена" : "Подписаться на раздел"}</Button> : null}</div></section><section className="dark-panel overflow-hidden"><div className="panel-title"><MessageSquare /> Темы раздела</div>{threads.length ? <div className="divide-y divide-white/[0.06]">{threads.map((thread) => <button key={thread.id} className="thread-row" onClick={() => onThread(thread.id)}><StatusBadge status={thread.status} definition={thread.statusDefinition} /><span className="min-w-0 flex-1 text-left"><span className="flex flex-wrap items-center gap-2"><strong>{thread.title}</strong>{thread.tags.map((tag) => <span key={tag.id} className="tag-pill" style={{ color: tag.color, borderColor: `${tag.color}55` }}>{tag.label}</span>)}</span><small>{thread.author.username} · {formatDate(thread.updatedAt)}{thread.assignment ? ` · рассматривает ${thread.assignment.username ?? thread.assignment.roleLabel}` : ""}</small></span><span className="thread-replies"><strong>{thread.replyCount}</strong><small>ответов</small></span><ChevronRight className="size-4 text-white/15" /></button>)}</div> : <div className="empty-state">В этом разделе ещё нет тем.</div>}</section><section className="dark-panel overflow-hidden"><div className="panel-title"><Plus /> Новая тема</div><div className="space-y-3 p-4">{user ? canCreate ? <><Input value={title} onChange={(event) => onTitle(event.target.value)} placeholder="Заголовок темы" maxLength={140} />{board.formSchema.map((field) => <FormField key={field.id} field={field} value={formData[field.id]} onChange={(value) => onFormData({ ...formData, [field.id]: value })} />)}<Textarea value={body} onChange={(event) => onBody(event.target.value)} placeholder="Подробно опишите ситуацию…" rows={8} maxLength={20_000} /><label className="editor-label">Теги<select multiple className="forum-select min-h-24" value={tagIds} onChange={(event) => onTags([...event.target.selectedOptions].map((option) => option.value).slice(0, 5))}>{payload.tags.filter((tag) => tag.enabled).map((tag) => <option key={tag.id} value={tag.id}>{tag.label}</option>)}</select></label><Button disabled={busy} className="bg-red-600 font-bold hover:bg-red-500" onClick={onCreate}><Plus /> Опубликовать тему</Button></> : <p className="text-sm text-white/40">Создание тем доступно с роли ранга {board.postingMinRank}{board.archived ? ". Раздел находится в архиве." : "."}</p> : <button className="text-sm font-bold text-red-400" onClick={onLogin}>Войдите, чтобы создать тему.</button>}</div></section></>;
}

function FormField({ field, value, onChange }: { field: ForumFormField; value: unknown; onChange: (value: unknown) => void }) {
  const label = <span>{field.label}{field.required ? " *" : ""}</span>;
  if (field.type === "textarea") return <label className="editor-label">{label}<Textarea rows={4} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} /></label>;
  if (field.type === "select") return <label className="editor-label">{label}<select className="forum-select" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}><option value="">Выберите</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select></label>;
  if (field.type === "multi-select") return <label className="editor-label">{label}<select multiple className="forum-select min-h-24" value={Array.isArray(value) ? value.map(String) : []} onChange={(event) => onChange([...event.target.selectedOptions].map((option) => option.value))}>{field.options.map((option) => <option key={option}>{option}</option>)}</select></label>;
  if (field.type === "checkbox") return <label className="setting-line"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /> {label}</label>;
  if (field.type === "radio") return <fieldset className="editor-label"><legend>{label}</legend><div className="setting-checks">{field.options.map((option) => <label key={option}><input type="radio" checked={value === option} onChange={() => onChange(option)} /> {option}</label>)}</div></fieldset>;
  return <label className="editor-label">{label}<Input type={field.type === "date" ? "date" : field.type === "url" || field.type === "file" || field.type === "image" ? "url" : "text"} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} placeholder={field.type === "file" || field.type === "image" ? "HTTPS-ссылка на файл" : field.placeholder} /></label>;
}

function ThreadManagementToolbar({ thread, payload, user, onAction }: { thread: ForumThread; payload: ForumPayload; user: ForumUser; onAction: (action: ForumAction) => void }) {
  const canEdit = user.id === thread.author.id ? roleHas(user, "forum.topic.edit_own") : roleHas(user, "forum.topic.edit_any");
  const canDelete = user.id === thread.author.id ? roleHas(user, "forum.topic.delete_own") : roleHas(user, "forum.topic.delete_any");
  if (!canEdit && !canDelete && !roleHas(user, "forum.topic.pin") && !roleHas(user, "forum.topic.move")) return null;
  return <div className="dark-panel thread-management-toolbar">
    <span>Управление темой</span>
    {canEdit ? <Button size="sm" variant="outline" className="admin-icon-button" onClick={() => { const title = window.prompt("Заголовок темы", thread.title); const text = title ? window.prompt("Текст темы", thread.body) : null; if (title && text) onAction({ action: "edit_thread", threadId: thread.id, title, body: text }); }}><Pencil /> Изменить</Button> : null}
    {roleHas(user, "forum.topic.pin") ? <Button size="sm" variant="outline" className="admin-icon-button" onClick={() => onAction({ action: "set_thread_pin", threadId: thread.id, pinned: !thread.pinned })}><Star className={thread.pinned ? "fill-current" : ""} /> {thread.pinned ? "Открепить" : "Закрепить"}</Button> : null}
    {roleHas(user, "forum.topic.move") ? <select className="forum-select w-auto text-xs" value={thread.boardId} onChange={(event) => { if (event.target.value !== thread.boardId) onAction({ action: "move_thread", threadId: thread.id, boardId: event.target.value }); }}><option value={thread.boardId}>Перенести тему…</option>{payload.sections.flatMap((section) => section.boards).filter((board) => board.id !== thread.boardId && !board.archived).map((board) => <option key={board.id} value={board.id}>{board.title}</option>)}</select> : null}
    {canDelete ? <Button size="sm" variant="destructive" onClick={() => { if (window.confirm("Переместить тему в корзину?")) onAction({ action: "delete_thread", threadId: thread.id }); }}><Trash2 /> Удалить</Button> : null}
  </div>;
}

function ThreadView({ thread, posts, payload, user, reply, busy, transferOpen, transferUserId, transferRoleId, transferReason, onBack, onReply, onSend, onLogin, onAction, onTransferOpen, onTransferUser, onTransferRole, onTransferReason, onTransfer, onTemplate }: { thread: ForumThread | null; posts: ForumPost[]; payload: ForumPayload; user: ForumUser | null; reply: string; busy: boolean; transferOpen: boolean; transferUserId: string; transferRoleId: string; transferReason: string; onBack: (boardId: string) => void; onReply: (value: string) => void; onSend: () => void; onLogin: () => void; onAction: (action: ForumAction) => void; onTransferOpen: (value: boolean) => void; onTransferUser: (value: string) => void; onTransferRole: (value: string) => void; onTransferReason: (value: string) => void; onTransfer: () => void; onTemplate: (template: ForumTemplate) => void }) {
  const [revisionsOpen, setRevisionsOpen] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTone, setAiTone] = useState<"neutral" | "strict" | "short">("neutral");
  const [aiGuidance, setAiGuidance] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<ForumAiSuggestion[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  if (!thread) return <div className="empty-state dark-panel">Тема не найдена или недоступна.</div>;
  const threadId = thread.id;
  const canStatus = roleHas(user, "forum.topic.status") && !payload.viewingAsRole;
  const canAssign = roleHas(user, "forum.topic.assign") && !payload.viewingAsRole;
  const canTransfer = roleHas(user, "forum.topic.transfer") && !payload.viewingAsRole;
  const allowed = payload.sections.flatMap((section) => section.boards).find((board) => board.id === thread.boardId)?.allowedStatusIds ?? [];
  const statuses = payload.topicStatuses.filter((status) => status.enabled && (!allowed.length || allowed.includes(status.id)));
  async function generateAiSuggestions() {
    setAiBusy(true); setAiError(null); setAiSuggestions([]);
    try {
      const result = await runForumAction({ action: "ai_suggest_reply", threadId, guidance: aiGuidance, tone: aiTone });
      setAiSuggestions(result.suggestions ?? []);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI-помощник временно недоступен.");
    } finally { setAiBusy(false); }
  }
  const quickTemplates = [...payload.templates].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.sortOrder - b.sortOrder);
  return <>
    <button className="back-link" onClick={() => onBack(thread.boardId)}><ArrowLeft /> К списку тем</button>
    <section className="dark-panel overflow-hidden">
      <div className="thread-control-head"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={thread.status} definition={thread.statusDefinition} />{thread.tags.map((tag) => <span key={tag.id} className="tag-pill" style={{ color: tag.color, borderColor: `${tag.color}55` }}>{tag.label}</span>)}{thread.locked ? <span className="private-pill"><Lock /> Ответы закрыты</span> : null}</div><h1>{thread.title}</h1>{thread.assignment ? <p>Рассматривает: <strong>{thread.assignment.username ?? thread.assignment.roleLabel}</strong>{thread.assignment.reason ? ` · ${thread.assignment.reason}` : ""}</p> : <p>Сотрудник ещё не назначен.</p>}</div><div className="thread-actions">{user ? <><Button size="sm" variant="outline" className="admin-icon-button" onClick={() => onAction({ action: "toggle_bookmark", threadId: thread.id })}><Bookmark className={thread.bookmarked ? "fill-current" : ""} /> {thread.bookmarked ? "В закладках" : "Закладка"}</Button><Button size="sm" variant="outline" className="admin-icon-button" onClick={() => onAction({ action: "toggle_subscription", targetType: "thread", targetId: thread.id })}><Bell className={thread.subscribed ? "fill-current" : ""} /> {thread.subscribed ? "Подписан" : "Подписаться"}</Button></> : null}{canStatus ? <select className="forum-select w-auto text-xs" value={thread.status} onChange={(event) => onAction({ action: "set_thread_status", threadId: thread.id, status: event.target.value })}>{statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select> : null}{roleHas(user, thread.locked ? "forum.topic.reopen" : "forum.topic.close") && !payload.viewingAsRole ? <Button size="sm" variant="outline" className="admin-icon-button" onClick={() => onAction({ action: "set_thread_lock", threadId: thread.id, locked: !thread.locked })}>{thread.locked ? <Unlock /> : <Lock />}{thread.locked ? "Открыть" : "Закрыть"}</Button> : null}</div></div>
      {canAssign ? <div className="moderation-actions">{thread.assignment?.userId === user?.id ? <Button size="sm" variant="outline" className="admin-icon-button" onClick={() => onAction({ action: "release_thread", threadId: thread.id })}><X /> Снять себя</Button> : <Button size="sm" className="bg-amber-600 font-bold hover:bg-amber-500" onClick={() => onAction({ action: "assign_thread", threadId: thread.id })}><ClipboardCheck /> Взять на рассмотрение</Button>}{canTransfer ? <Button size="sm" variant="outline" className="admin-icon-button" onClick={() => onTransferOpen(!transferOpen)}><Send /> Передать</Button> : null}{transferOpen ? <div className="transfer-form"><select className="forum-select" value={transferUserId} onChange={(event) => { onTransferUser(event.target.value); if (event.target.value) onTransferRole(""); }}><option value="">Конкретный сотрудник</option>{payload.staffUsers.filter((member) => member.role.canModerate && member.id !== user?.id).map((member) => <option key={member.id} value={member.id}>{member.username} — {member.role.label}</option>)}</select><select className="forum-select" value={transferRoleId} onChange={(event) => { onTransferRole(event.target.value); if (event.target.value) onTransferUser(""); }}><option value="">Или роль</option>{payload.roles.filter((role) => role.canModerate && role.enabled).map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select><Input value={transferReason} onChange={(event) => onTransferReason(event.target.value)} placeholder="Причина передачи" /><Button size="sm" disabled={!transferReason || (!transferUserId && !transferRoleId)} onClick={onTransfer}><Send /> Передать</Button></div> : null}</div> : null}
    </section>
    <PostCard thread={thread} post={null} user={thread.author} date={thread.createdAt} body={thread.body} />
    {posts.map((post) => <PostCard key={post.id} thread={thread} post={post} user={post.author} date={post.createdAt} body={post.body} onReact={(reactionId) => onAction({ action: "toggle_reaction", postId: post.id, reactionId })} onEdit={() => { const value = window.prompt("Новый текст сообщения", post.body); if (value) onAction({ action: "edit_post", postId: post.id, body: value }); }} onDelete={() => { if (window.confirm("Переместить сообщение в корзину?")) onAction({ action: "delete_post", postId: post.id }); }} revisionsOpen={revisionsOpen === post.id} onRevisions={() => setRevisionsOpen(revisionsOpen === post.id ? null : post.id)} canEdit={Boolean(user && (user.id === post.author.id || roleHas(user, "forum.post.edit_any")))} canDelete={roleHas(user, "forum.post.delete")} />)}
    <section className="dark-panel overflow-hidden"><div className="panel-title"><MessageSquare /> Ответить в теме</div><div className="space-y-3 p-4">{user ? (thread.locked || thread.status === "closed") && !roleHas(user, "forum.topic.reopen") ? <p className="text-sm text-white/40">Тема закрыта для новых ответов.</p> : <>
      {quickTemplates.length ? <div className="template-quick-list"><span>Быстрые шаблоны:</span>{quickTemplates.slice(0, 5).map((template) => <button key={template.id} onClick={() => onTemplate(template)}>{template.favorite ? "★ " : ""}{template.title}</button>)}{quickTemplates.length > 5 ? <select aria-label="Все шаблоны" value="" onChange={(event) => { const selected = quickTemplates.find((item) => item.id === event.target.value); if (selected) onTemplate(selected); }}><option value="">Все шаблоны…</option>{quickTemplates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}</select> : null}</div> : null}
      <Textarea value={reply} onChange={(event) => onReply(event.target.value)} placeholder="Ваш ответ…" rows={7} maxLength={10_000} />
      <div className="reply-actions"><Button disabled={busy || !reply.trim()} className="bg-red-600 font-bold hover:bg-red-500" onClick={onSend}><Send /> Отправить ответ</Button>{canAssign && payload.aiReplyAssistantEnabled ? <Button variant="outline" className="ai-open-button" onClick={() => setAiOpen(true)}><Sparkles /> Спросить у AI</Button> : null}</div>
    </> : <button className="text-sm font-bold text-red-400" onClick={onLogin}>Войдите, чтобы ответить.</button>}</div></section>
    {aiOpen ? <AiReplyAssistant thread={thread} statuses={payload.topicStatuses} tone={aiTone} guidance={aiGuidance} suggestions={aiSuggestions} busy={aiBusy} error={aiError} onTone={setAiTone} onGuidance={setAiGuidance} onGenerate={() => void generateAiSuggestions()} onChoose={(suggestion) => { onReply(suggestion.body); setAiOpen(false); }} onClose={() => setAiOpen(false)} /> : null}
  </>;
}

function AiReplyAssistant({ thread, statuses, tone, guidance, suggestions, busy, error, onTone, onGuidance, onGenerate, onChoose, onClose }: { thread: ForumThread; statuses: ForumPayload["topicStatuses"]; tone: "neutral" | "strict" | "short"; guidance: string; suggestions: ForumAiSuggestion[]; busy: boolean; error: string | null; onTone: (tone: "neutral" | "strict" | "short") => void; onGuidance: (value: string) => void; onGenerate: () => void; onChoose: (suggestion: ForumAiSuggestion) => void; onClose: () => void }) {
  return <div className="editor-backdrop"><div className="dark-panel ai-modal">
    <div className="editor-head"><div><div className="hero-kicker"><span /> По правилам CLOUD WORLD</div><h3><Sparkles /> AI-помощник ответа</h3></div><button onClick={onClose}><X /></button></div>
    <div className="editor-content">
      <div className="ai-safety-note"><ShieldCheck /><span><strong>AI ничего не отправляет и не выдаёт наказание.</strong> Он читает официальные правила и готовит варианты. Итог всегда проверяет сотрудник.</span></div>
      <div className="ai-context-line"><span>Тема</span><strong>{thread.title}</strong></div>
      <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]"><label className="editor-label">Стиль ответа<select className="forum-select" value={tone} onChange={(event) => onTone(event.target.value as "neutral" | "strict" | "short")}><option value="neutral">Нейтральный</option><option value="strict">Строгий</option><option value="short">Краткий</option></select></label><label className="editor-label">Что учесть<Textarea rows={3} maxLength={1_000} value={guidance} onChange={(event) => onGuidance(event.target.value)} placeholder="Например: проверь доказательства, не выдумывай наказание, предложи передачу старшей администрации…" /></label></div>
      {error ? <div className="form-error">{error}</div> : null}
      <Button disabled={busy} className="w-full ai-generate-button" onClick={onGenerate}><Sparkles /> {busy ? "Анализирую правила и тему…" : suggestions.length ? "Получить другие варианты" : "Получить 3 варианта ответа"}</Button>
      {suggestions.length ? <div className="ai-suggestion-grid">{suggestions.map((suggestion, index) => { const status = statuses.find((item) => item.id === suggestion.recommendedStatusId); return <article key={`${suggestion.title}-${index}`} className="ai-suggestion-card"><div className="ai-option-number">Вариант {index + 1}</div><h4>{suggestion.title}</h4><div className="ai-rule-reference"><ShieldCheck /> {suggestion.ruleReference}</div><p className="ai-reply-preview">{suggestion.body}</p><div className="ai-reason"><strong>Почему:</strong> {suggestion.why}</div><div className="ai-recommendations">{status ? <span style={{ color: status.color, borderColor: `${status.color}55` }}>Статус: {status.label}</span> : <span>Статус не менять</span>}{suggestion.closeTopic ? <span>Можно закрыть после проверки</span> : <span>Оставить открытой</span>}</div><Button className="w-full bg-red-600 font-bold hover:bg-red-500" onClick={() => onChoose(suggestion)}><Check /> Подставить в ответ</Button></article>; })}</div> : null}
    </div>
  </div></div>;
}

function PostCard({ thread, post, user, date, body, onReact, onEdit, onDelete, revisionsOpen, onRevisions, canEdit, canDelete }: { thread: ForumThread; post: ForumPost | null; user: ForumUser; date: string; body: string; onReact?: (id: string) => void; onEdit?: () => void; onDelete?: () => void; revisionsOpen?: boolean; onRevisions?: () => void; canEdit?: boolean; canDelete?: boolean }) { const official = Boolean(post && user.role.canModerate && !post.internal); return <article className={official ? "post-card official-post" : post ? "post-card" : "post-card topic-card"}><AuthorRail user={user} /><div className="post-body">{official ? <div className="official-reply-banner"><ShieldCheck /><span><strong>Официальный ответ администрации</strong><small>Решение сотрудника CLOUD WORLD</small></span></div> : null}<div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3"><span className="text-xs text-white/35">{formatDate(date)}{post?.editedAt ? ` · изменено ${formatDate(post.editedAt)}` : ""}{post?.internal ? " · внутренняя заметка" : ""}</span><div className="flex gap-1">{post && canEdit ? <Button size="icon-sm" variant="ghost" onClick={onEdit}><Pencil /></Button> : null}{post && canDelete ? <Button size="icon-sm" variant="ghost" onClick={onDelete}><Trash2 /></Button> : null}</div></div><div className="whitespace-pre-wrap break-words py-4 text-sm leading-7 text-white/72">{body}</div>{Object.keys(thread.formData).length && !post ? <div className="topic-form-data">{Object.entries(thread.formData).map(([key, value]) => <div key={key}><strong>{key}</strong><span>{Array.isArray(value) ? value.join(", ") : String(value)}</span></div>)}</div> : null}{post?.reactions.length ? <div className="reaction-row">{post.reactions.map((reaction) => <button key={reaction.id} className={reaction.selected ? "selected" : ""} onClick={() => onReact?.(reaction.id)}>{reaction.emoji} {reaction.count || ""}</button>)}</div> : null}{post?.signature?.enabled ? <SignatureBlock signature={post.signature} role={user.role.label} /> : null}{post?.revisions.length ? <div className="revision-box"><button onClick={onRevisions}><History /> История изменений ({post.revisions.length})</button>{revisionsOpen ? post.revisions.map((revision) => <div key={revision.id}><small>{revision.editor} · {formatDate(revision.createdAt)}</small><p><del>{revision.oldBody}</del></p><p>{revision.newBody}</p></div>) : null}</div> : null}</div></article>; }

function AuthorRail({ user }: { user: ForumUser }) { return <aside className="author-rail"><Avatar user={user} /><strong>{user.username}</strong>{user.role.showNearPosts ? <RoleBadge role={user.role} /> : null}{user.achievements.length ? <div className="achievement-list">{user.achievements.slice(0, 4).map((achievement) => <span key={achievement.id} title={achievement.description}>{achievement.icon} {achievement.label}</span>)}</div> : null}<small>{user.postsCount} сообщений<br />{user.points} баллов<br />На форуме с {formatDate(user.createdAt, true)}</small></aside>; }

function SignatureBlock({ signature, role }: { signature: ForumSignature; role: string }) { return <div className="signature-card" style={{ borderLeftColor: signature.color }}><strong style={{ color: signature.color }}>{signature.slogan || role}</strong>{signature.text ? <p>{signature.text}</p> : null}{signature.imageUrl ? <img src={signature.imageUrl} alt="Подпись сотрудника" /> : null}{signature.links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}</div>; }

function AuthView({ mode, username, password, busy, onUsername, onPassword, onSubmit, onMode }: { mode: "login" | "register"; username: string; password: string; busy: boolean; onUsername: (value: string) => void; onPassword: (value: string) => void; onSubmit: () => void; onMode: (mode: "login" | "register") => void }) { return <section className="mx-auto max-w-lg"><div className="dark-panel overflow-hidden"><div className="auth-head"><div className="auth-icon">{mode === "login" ? <LogIn /> : <UserPlus />}</div><div><div className="hero-kicker"><span /> CLOUD WORLD ID</div><h1>{mode === "login" ? "Вход на форум" : "Регистрация"}</h1></div></div><div className="space-y-3 border-t border-white/[0.07] p-5"><label className="editor-label">Игровой ник<Input value={username} onChange={(event) => onUsername(event.target.value)} placeholder="Ваш ник" autoComplete="username" maxLength={24} /></label><label className="editor-label">Пароль<Input type="password" value={password} onChange={(event) => onPassword(event.target.value)} placeholder={mode === "login" ? "Введите пароль" : "Минимум 8 символов"} autoComplete={mode === "login" ? "current-password" : "new-password"} maxLength={128} onKeyDown={(event) => { if (event.key === "Enter") onSubmit(); }} /></label><Button disabled={busy} className="h-11 w-full bg-red-600 font-bold uppercase hover:bg-red-500" onClick={onSubmit}>{mode === "login" ? "Войти" : "Создать аккаунт"}</Button><button className="w-full text-center text-xs text-white/45 hover:text-red-400" onClick={() => onMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже зарегистрированы? Войти"}</button></div></div><p className="mt-4 text-center text-xs leading-5 text-white/30"><ShieldCheck className="mr-1 inline size-3.5" /> Пароль хешируется на сервере, сессия защищена HTTP-only cookie и CSRF-токеном.</p></section>; }

function MessagesView({ payload, activeId, busy, onOpen, onAction }: { payload: ForumPayload; activeId?: string; busy: boolean; onOpen: (id: string) => void; onAction: (action: ForumAction, after?: () => void) => void }) {
  const [newOpen, setNewOpen] = useState(false); const [title, setTitle] = useState(""); const [participants, setParticipants] = useState<string[]>([]); const [firstBody, setFirstBody] = useState(""); const [message, setMessage] = useState(""); const [filter, setFilter] = useState("");
  const active = payload.conversations.find((conversation) => conversation.id === activeId);
  return <section className="messages-layout"><aside className="dark-panel messages-sidebar"><div className="panel-title"><Inbox /> Переписки<Button size="sm" className="ml-auto bg-red-600" onClick={() => setNewOpen(true)}><Plus /></Button></div><Input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Поиск диалогов" />{payload.conversations.filter((conversation) => `${conversation.title} ${conversation.participants.join(" ")}`.toLowerCase().includes(filter.toLowerCase())).map((conversation) => <button key={conversation.id} className={conversation.id === activeId ? "conversation-row active" : conversation.unread ? "conversation-row unread" : "conversation-row"} onClick={() => onOpen(conversation.id)}><MessageSquare /><span><strong>{conversation.title || conversation.participants.join(", ")}</strong><small>{conversation.lastMessage}</small></span><time>{formatDate(conversation.updatedAt)}</time></button>)}</aside><div className="dark-panel messages-main">{active ? <><div className="message-head"><div><strong>{active.title || active.participants.join(", ")}</strong><small>{active.participants.join(", ")}</small></div><div><Button size="sm" variant="outline" className="admin-icon-button" onClick={() => onAction({ action: "conversation_state", conversationId: active.id, unread: true })}><Bell /> Непрочитанное</Button><Button size="sm" variant="outline" className="admin-icon-button" onClick={() => onAction({ action: "conversation_state", conversationId: active.id, archived: !active.archived })}>{active.archived ? <ArchiveRestoreIcon /> : <Inbox />} {active.archived ? "Вернуть" : "Архив"}</Button><Button size="sm" variant="destructive" onClick={() => { if (window.confirm("Покинуть диалог?")) onAction({ action: "conversation_state", conversationId: active.id, leave: true }, () => onOpen("")); }}><LogOut /> Покинуть</Button></div></div><div className="message-scroll">{payload.conversationMessages.map((item) => <div key={item.id} className={item.author.id === payload.currentUser?.id ? "message-bubble own" : "message-bubble"}><strong>{item.author.username}</strong><p>{item.body}</p><time>{formatDate(item.createdAt)}</time></div>)}</div><div className="message-compose"><Textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Сообщение" /><Button disabled={busy || !message.trim()} onClick={() => onAction({ action: "send_message", conversationId: active.id, body: message }, () => setMessage(""))}><Send /></Button></div></> : <div className="empty-state">Выберите диалог или создайте новый.</div>}</div>{newOpen ? <div className="editor-backdrop"><div className="dark-panel editor-modal"><div className="editor-head"><h3>Новый диалог</h3><button onClick={() => setNewOpen(false)}><X /></button></div><div className="editor-content"><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Название группового диалога" /><label className="editor-label">Участники<select multiple className="forum-select min-h-40" value={participants} onChange={(event) => setParticipants([...event.target.selectedOptions].map((option) => option.value))}>{payload.staffUsers.filter((member) => member.id !== payload.currentUser?.id).map((member) => <option key={member.id} value={member.id}>{member.username} — {member.role.label}</option>)}</select></label><Textarea rows={5} value={firstBody} onChange={(event) => setFirstBody(event.target.value)} placeholder="Первое сообщение" /><Button disabled={busy || !participants.length || !firstBody.trim()} className="w-full bg-red-600" onClick={() => onAction({ action: "create_conversation", title, participantIds: participants, body: firstBody }, () => { setNewOpen(false); setTitle(""); setParticipants([]); setFirstBody(""); })}><Send /> Создать диалог</Button></div></div></div> : null}</section>;
}

function ArchiveRestoreIcon() { return <RefreshCw />; }

function AccountView({ payload, tab, busy, onTab, onThread, onAction }: { payload: ForumPayload; tab: AccountTab; busy: boolean; onTab: (tab: AccountTab) => void; onThread: (id: string) => void; onAction: (action: ForumAction) => void }) {
  const user = payload.currentUser!; const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl); const [bio, setBio] = useState(user.bio);
  const [securityCurrentPassword, setSecurityCurrentPassword] = useState("");
  const [securityNewPassword, setSecurityNewPassword] = useState("");
  const [securityConfirmPassword, setSecurityConfirmPassword] = useState("");
  const tabs: { id: AccountTab; label: string }[] = [{ id: "account", label: "Аккаунт" }, { id: "notifications", label: "Уведомления" }, { id: "bookmarks", label: "Закладки" }, { id: "publications", label: "Публикации" }, { id: "reactions", label: "Реакции" }, { id: "subscriptions", label: "Подписки" }, { id: "followers", label: "Подписчики" }, { id: "following", label: "Мои подписки" }, { id: "ignoring", label: "Игнорирование" }, { id: "security", label: "Безопасность" }, { id: "privacy", label: "Приватность" }, { id: "settings", label: "Настройки" }, { id: "info", label: "Информация" }];
  const knownThreads = payload.recentThreads.filter((thread) => payload.bookmarks.includes(thread.id));
  return <section className="account-layout"><aside className="dark-panel account-nav"><div className="profile-summary"><Avatar user={user} /><div><strong>{user.username}</strong><RoleBadge role={user.role} /></div></div>{tabs.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => onTab(item.id)}>{item.label}</button>)}</aside><div className="dark-panel account-content">
    {tab === "account" ? <><h2>Мой аккаунт</h2><div className="grid gap-4 sm:grid-cols-3"><div className="profile-stat"><strong>{user.postsCount}</strong><span>сообщений</span></div><div className="profile-stat"><strong>{user.reactionsCount}</strong><span>реакций</span></div><div className="profile-stat"><strong>{user.points}</strong><span>баллов</span></div></div>{user.achievements.length ? <div><h3 className="mb-2 text-sm font-bold uppercase text-white">Достижения</h3><div className="achievement-list account-achievements">{user.achievements.map((achievement) => <span key={achievement.id} title={achievement.description}>{achievement.icon} {achievement.label}</span>)}</div></div> : null}<label className="editor-label">Аватар — HTTPS PNG/JPG/WEBP/GIF<Input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} /></label><label className="editor-label">О себе<Textarea rows={5} maxLength={500} value={bio} onChange={(event) => setBio(event.target.value)} /></label><Button disabled={busy} className="bg-red-600" onClick={() => onAction({ action: "save_profile", avatarUrl, bio })}><Save /> Сохранить профиль</Button></> : null}
    {tab === "notifications" ? <AccountList title="Все уведомления">{payload.notifications.length ? payload.notifications.map((notification) => <div key={notification.id} className={notification.read ? "account-row" : "account-row unread"}><Bell /><span><strong>{notification.title}</strong><small>{notification.body} · {formatDate(notification.createdAt)}</small></span></div>) : <div className="empty-state">Уведомлений пока нет.</div>}</AccountList> : null}
    {tab === "bookmarks" ? <AccountList title="Закладки">{payload.bookmarks.length ? payload.bookmarks.map((threadId) => { const thread = knownThreads.find((item) => item.id === threadId); return <button key={threadId} className="account-row" onClick={() => onThread(threadId)}><Bookmark /><span><strong>{thread?.title ?? `Тема ${threadId}`}</strong><small>{thread?.author.username ?? "Открыть тему"}</small></span></button>; }) : <div className="empty-state">Закладок пока нет.</div>}</AccountList> : null}
    {tab === "publications" ? <AccountList title="Мои публикации">{payload.recentThreads.filter((thread) => thread.author.id === user.id).map((thread) => <button key={thread.id} className="account-row" onClick={() => onThread(thread.id)}><MessageSquare /><span><strong>{thread.title}</strong><small>{formatDate(thread.createdAt)}</small></span></button>)}</AccountList> : null}
    {tab === "reactions" ? <InfoPanel title="Полученные реакции" text={`Ваши публикации получили ${user.reactionsCount} реакций. Репутация не выдаёт административных прав. Текущий рейтинг: ${user.points} баллов.`} /> : null}
    {tab === "subscriptions" ? <AccountList title="Подписки на темы и разделы">{payload.subscriptions.map((subscription) => <div key={subscription} className="account-row"><Bell /><span><strong>{subscription}</strong><small>Уведомления включены</small></span></div>)}</AccountList> : null}
    {tab === "followers" ? <UserList title="Подписчики" users={payload.followers} actionLabel="Заблокировать" onAction={(member) => onAction({ action: "block_user", userId: member.id, blocked: true })} /> : null}
    {tab === "following" ? <UserList title="Мои подписки" users={payload.following} actionLabel="Отписаться" onAction={(member) => onAction({ action: "toggle_follow", userId: member.id })} /> : null}
    {tab === "ignoring" ? <UserList title="Игнорирование" users={payload.blockedUsers} actionLabel="Разблокировать" onAction={(member) => onAction({ action: "block_user", userId: member.id, blocked: false })} /> : null}
    {tab === "security" ? <div><h2>Безопасность</h2><p className="account-info">Сессия хранится в Secure HTTP-only cookie, изменения защищены CSRF-проверкой, пароль — bcrypt-хешем.</p><div className="mt-5 max-w-xl space-y-3"><label className="editor-label">Текущий пароль<Input type="password" value={securityCurrentPassword} onChange={(event) => setSecurityCurrentPassword(event.target.value)} autoComplete="current-password" /></label><label className="editor-label">Новый пароль<Input type="password" value={securityNewPassword} onChange={(event) => setSecurityNewPassword(event.target.value)} autoComplete="new-password" placeholder="Минимум 10 символов" /></label><label className="editor-label">Повторите новый пароль<Input type="password" value={securityConfirmPassword} onChange={(event) => setSecurityConfirmPassword(event.target.value)} autoComplete="new-password" /></label><Button disabled={busy || securityNewPassword.length < 10 || securityNewPassword !== securityConfirmPassword || !securityCurrentPassword} className="bg-red-600" onClick={() => { onAction({ action: "change_password", currentPassword: securityCurrentPassword, newPassword: securityNewPassword }); setSecurityCurrentPassword(""); setSecurityNewPassword(""); setSecurityConfirmPassword(""); }}><LockKeyhole /> Сменить пароль</Button>{securityConfirmPassword && securityNewPassword !== securityConfirmPassword ? <p className="text-xs text-red-400">Новые пароли не совпадают.</p> : null}</div></div> : null}
    {tab === "privacy" ? <InfoPanel title="Конфиденциальность" text="IP не отображается сотрудникам. В журнале безопасности хранится только необратимый хеш IP, доступный владельцу. Личные диалоги доступны только их участникам." /> : null}
    {tab === "settings" ? <InfoPanel title="Настройки" text="Уведомления, подписки, черновики и прочитанные диалоги сохраняются в вашем аккаунте. Черновики дополнительно дублируются на текущем устройстве." /> : null}
    {tab === "info" ? <InfoPanel title="Информация" text={`Ник: ${user.username}. Роль: ${user.role.label}. Дата регистрации: ${formatDate(user.createdAt, true)}. Активных подписчиков: ${payload.followers.length}.`} /> : null}
  </div></section>;
}

function AccountList({ title, children }: { title: string; children: ReactNode }) { return <div><h2>{title}</h2><div className="account-list">{children}</div></div>; }
function InfoPanel({ title, text }: { title: string; text: string }) { return <div><h2>{title}</h2><p className="account-info">{text}</p></div>; }
function UserList({ title, users, actionLabel, onAction }: { title: string; users: ForumUser[]; actionLabel: string; onAction: (user: ForumUser) => void }) { return <AccountList title={title}>{users.length ? users.map((member) => <div key={member.id} className="admin-list-row"><div className="flex items-center gap-3"><Avatar user={member} /><div><strong className="text-sm text-white">{member.username}</strong><RoleBadge role={member.role} /></div></div><Button size="sm" variant="outline" className="admin-icon-button" onClick={() => onAction(member)}>{actionLabel}</Button></div>) : <div className="empty-state">Список пуст.</div>}</AccountList>; }

function SearchView({ payload, term, status, tag, role, dateFrom, onTerm, onStatus, onTag, onRole, onDateFrom, onSearch, onOpen }: { payload: ForumPayload; term: string; status: string; tag: string; role: string; dateFrom: string; onTerm: (value: string) => void; onStatus: (value: string) => void; onTag: (value: string) => void; onRole: (value: string) => void; onDateFrom: (value: string) => void; onSearch: () => void; onOpen: (type: "thread" | "post" | "user", id: string) => void }) { const results = payload.searchResults; return <section className="space-y-5"><div className="dark-panel search-panel"><div><div className="hero-kicker"><span /> Поиск по форуму</div><h1>Продвинутый поиск</h1></div><div className="search-bar"><Input value={term} onChange={(event) => onTerm(event.target.value)} placeholder="Тема, сообщение, пользователь или автор" onKeyDown={(event) => { if (event.key === "Enter") onSearch(); }} /><Button className="bg-red-600" onClick={onSearch}><Search /> Найти</Button></div><div className="search-filters"><select className="forum-select" value={status} onChange={(event) => onStatus(event.target.value)}><option value="">Любой статус</option>{payload.topicStatuses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><select className="forum-select" value={tag} onChange={(event) => onTag(event.target.value)}><option value="">Любой тег</option>{payload.tags.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><select className="forum-select" value={role} onChange={(event) => onRole(event.target.value)}><option value="">Любая роль</option>{payload.roles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><Input type="date" value={dateFrom} onChange={(event) => onDateFrom(event.target.value)} /></div></div><div className="dark-panel overflow-hidden"><div className="panel-title"><FolderSearch /> Результаты</div>{results.length ? <div className="divide-y divide-white/[0.06]">{results.map((result, index) => <button key={`${result.type}-${result.id}-${index}`} className="search-result" onClick={() => onOpen(result.type, result.id)}><span className="private-pill">{result.type}</span><div><strong>{result.title}</strong><p>{result.excerpt}</p><small>{result.meta}</small></div><ChevronRight /></button>)}</div> : <div className="empty-state">Введите минимум два символа и примените фильтры.</div>}</div></section>; }

const templateVariableLabels: Record<string, string> = { moderator: "Сотрудник", role: "Роль сотрудника", player: "Ник игрока", topic_author: "Автор темы", rule: "Пункт правил", punishment: "Наказание", reason: "Причина или комментарий", date: "Дата", time: "Время", topic_id: "ID темы", topic_title: "Название темы", server: "Сервер", evidence: "Какие доказательства нужны", status: "Текущий статус", appeal_link: "Ссылка на апелляцию" };

function TemplateVariablesDialog({ template, thread, user, values, busy, onValue, onClose, onSend }: { template: ForumTemplate; thread: ForumThread; user: ForumUser; values: Record<string, string>; busy: boolean; onValue: (key: string, value: string) => void; onClose: () => void; onSend: () => void }) {
  const now = new Date();
  const automatic: Record<string, string> = { moderator: user.username, role: user.role.label, topic_author: thread.author.username, date: now.toLocaleDateString("ru-RU"), time: now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }), topic_id: thread.id, topic_title: thread.title, server: "CLOUD WORLD", status: thread.statusDefinition?.label ?? thread.status, appeal_link: `/thread/${thread.id}` };
  const fields = template.variables.filter((variable) => !automatic[variable]);
  const preview = template.body.replace(/\{([a-z_]+)\}/g, (_, key: string) => automatic[key] ?? values[key] ?? `{${key}}`);
  return <div className="editor-backdrop"><div className="dark-panel editor-modal template-use-modal"><div className="editor-head"><div><div className="hero-kicker"><span /> Готовый ответ</div><h3>{template.title}</h3></div><button onClick={onClose}><X /></button></div><div className="editor-content"><p className="text-sm text-white/45">Автоматические поля уже заполнены. Укажите только данные для этого решения.</p>{fields.length ? <div className="template-input-grid">{fields.map((field) => <label key={field} className="editor-label">{templateVariableLabels[field] ?? field}<Input value={values[field] ?? ""} onChange={(event) => onValue(field, event.target.value)} placeholder={`Введите: ${templateVariableLabels[field]?.toLowerCase() ?? field}`} /></label>)}</div> : <div className="ai-safety-note"><Check /><span>Шаблон полностью заполнен данными темы.</span></div>}<div><div className="sidebar-label">Предпросмотр ответа</div><div className="template-live-preview">{preview}</div></div>{template.autoStatusId || template.autoClose || template.autoLock || template.transferRoleId ? <div className="template-action-summary"><strong>После отправки:</strong>{template.autoStatusId ? <span>сменить статус</span> : null}{template.autoClose ? <span>закрыть тему</span> : null}{template.autoLock ? <span>запретить ответы</span> : null}{template.transferRoleId ? <span>передать роли</span> : null}</div> : null}<Button disabled={busy || fields.some((field) => !values[field]?.trim())} className="w-full bg-red-600" onClick={onSend}><Send /> Проверил — отправить ответ</Button></div></div></div>;
}

function PasswordChangeDialog({ currentPassword, newPassword, error, busy, onCurrentPassword, onNewPassword, onSave }: { currentPassword: string; newPassword: string; error: string | null; busy: boolean; onCurrentPassword: (value: string) => void; onNewPassword: (value: string) => void; onSave: () => void }) { return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"><div className="dark-panel w-full max-w-md overflow-hidden"><div className="auth-head"><div className="auth-icon"><LockKeyhole /></div><div><div className="hero-kicker"><span /> Защита владельца</div><h1>Смените стандартный пароль</h1></div></div><div className="space-y-3 border-t border-white/[0.07] p-5"><p className="text-xs leading-5 text-white/45">Это обязательное действие перед доступом к управлению.</p>{error ? <div className="form-error">{error}</div> : null}<Input type="password" value={currentPassword} onChange={(event) => onCurrentPassword(event.target.value)} placeholder="Текущий пароль" autoComplete="current-password" /><Input type="password" value={newPassword} onChange={(event) => onNewPassword(event.target.value)} placeholder="Новый пароль — минимум 10 символов" autoComplete="new-password" /><Button disabled={busy} className="w-full bg-red-600 font-bold hover:bg-red-500" onClick={onSave}>Сохранить новый пароль</Button></div></div></div>; }

function DatabaseSetup({ error, onRetry }: { error: string; onRetry: () => void }) { return <main className="flex min-h-screen items-center justify-center bg-[#07090d] p-4"><div className="dark-panel w-full max-w-xl overflow-hidden text-center"><div className="p-8"><div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-400"><Database className="size-7" /></div><h1 className="mt-5 font-heading text-2xl font-black uppercase text-white">Подключите базу данных</h1><p className="mt-3 text-sm leading-6 text-white/50">{error}</p><Button className="mt-5 bg-red-600 font-bold hover:bg-red-500" onClick={onRetry}><RefreshCw /> Проверить снова</Button></div></div></main>; }
function LoadingScreen() { return <main className="flex min-h-screen items-center justify-center bg-[#07090d]"><div className="text-center"><div className="brand-mark mx-auto">CW</div><p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-white/30">Загрузка форума</p></div></main>; }

function formatDate(value: string, short = false) { return new Intl.DateTimeFormat("ru-RU", short ? { day: "2-digit", month: "2-digit", year: "numeric" } : { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
