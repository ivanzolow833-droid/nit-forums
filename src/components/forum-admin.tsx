/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  FileClock,
  FolderTree,
  Pencil,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  SmilePlus,
  Tags,
  Trash2,
  UserCog,
  UsersRound,
  Webhook,
  X,
} from "lucide-react";
import { RoleBadge, StatusBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PermissionKey } from "@/lib/forum-permissions";
import type { RoleDefinition } from "@/lib/forum-roles";
import {
  runForumAction,
  type ForumBoard,
  type ForumFormField,
  type ForumIntegration,
  type ForumAppearanceSettings,
  type ForumPayload,
  type ReactionTypeDefinition,
  type ForumSection,
  type ForumTag,
  type TopicStatusDefinition,
} from "@/lib/forum-store";

type AdminTab = "users" | "roles" | "statuses" | "structure" | "tags" | "reactions" | "trash" | "audit" | "integrations" | "settings";
type SectionDraft = Omit<ForumSection, "boards" | "id"> & { id?: string };
type BoardDraft = Omit<ForumBoard, "threadCount" | "latestThread" | "id"> & { id?: string };
type DeleteStructureTarget = { type: "section" | "board"; id: string; title: string; sectionId?: string };

const emptyRole: RoleDefinition = {
  id: "",
  label: "",
  shortLabel: "",
  description: "",
  color: "#ff2d3f",
  gradient: "",
  icon: "◆",
  badge: "",
  rank: 10,
  enabled: true,
  showInProfile: true,
  showNearPosts: true,
  showInUsers: true,
  permissions: ["forum.view"],
  canModerate: false,
  canManageForum: false,
  canManageRoles: false,
};

const emptyStatus: TopicStatusDefinition = {
  id: "",
  label: "",
  color: "#60a5fa",
  sortOrder: 50,
  enabled: true,
  system: false,
};

const emptyTag: ForumTag = { id: "", label: "", color: "#a855f7", sortOrder: 50, enabled: true };
const emptyReaction: ReactionTypeDefinition = { id: "", label: "", emoji: "👍", sortOrder: 50, enabled: true };

export function ForumAdmin({ payload, onChanged }: { payload: ForumPayload; onChanged: () => Promise<void> }) {
  const user = payload.currentUser;
  const [tab, setTab] = useState<AdminTab>("users");
  const [roleDraft, setRoleDraft] = useState<RoleDefinition | null>(null);
  const [statusDraft, setStatusDraft] = useState<TopicStatusDefinition | null>(null);
  const [tagDraft, setTagDraft] = useState<ForumTag | null>(null);
  const [reactionDraft, setReactionDraft] = useState<ReactionTypeDefinition | null>(null);
  const [sectionDraft, setSectionDraft] = useState<SectionDraft | null>(null);
  const [boardDraft, setBoardDraft] = useState<BoardDraft | null>(null);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [moveRoleId, setMoveRoleId] = useState("member");
  const [deleteStatusId, setDeleteStatusId] = useState<string | null>(null);
  const [moveStatusId, setMoveStatusId] = useState("open");
  const [deleteStructure, setDeleteStructure] = useState<DeleteStructureTarget | null>(null);
  const [deleteStructureMode, setDeleteStructureMode] = useState<"move" | "trash">("move");
  const [moveThreadsToBoardId, setMoveThreadsToBoardId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retentionDays, setRetentionDays] = useState(payload.forumSettings.trashRetentionDays);
  const [appearance, setAppearance] = useState<ForumAppearanceSettings>(payload.forumSettings.appearance);
  const [viewAsRoleId, setViewAsRoleId] = useState("member");

  const permissionsByCategory = useMemo(() => {
    const result = new Map<string, typeof payload.permissions>();
    for (const permission of payload.permissions) result.set(permission.category, [...(result.get(permission.category) ?? []), permission]);
    return [...result.entries()];
  }, [payload]);

  if (!user || payload.viewingAsRole) return null;

  const canRoles = user.role.permissions.includes("forum.roles.manage") || ["owner", "mrproper"].includes(user.role.id);
  const canSections = user.role.permissions.includes("forum.sections.manage") || ["owner", "mrproper"].includes(user.role.id);
  const canStatuses = user.role.permissions.includes("forum.statuses.manage") || ["owner", "mrproper"].includes(user.role.id);
  const canTags = user.role.permissions.includes("forum.tags.manage") || ["owner", "mrproper"].includes(user.role.id);
  const canReactions = user.role.permissions.includes("forum.reactions.manage") || ["owner", "mrproper"].includes(user.role.id);
  const canTrash = user.role.permissions.includes("forum.trash.manage") || ["owner", "mrproper"].includes(user.role.id);
  const canAudit = user.role.permissions.includes("forum.audit.view") || ["owner", "mrproper"].includes(user.role.id);
  const canIntegrations = user.role.permissions.includes("forum.integrations.manage") || ["owner", "mrproper"].includes(user.role.id);
  const canSettings = user.role.permissions.includes("forum.settings.manage") || ["owner", "mrproper"].includes(user.role.id);
  if (!canRoles && !canSections && !canStatuses && !canTags && !canReactions && !canTrash && !canAudit && !canIntegrations && !canSettings) return null;

  async function perform(task: () => Promise<unknown>, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await task();
      after?.();
      await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Действие не выполнено.");
    } finally {
      setBusy(false);
    }
  }

  function editSection(section: ForumSection) {
    setSectionDraft({ id: section.id, parentId: section.parentId, title: section.title, description: section.description, sortOrder: section.sortOrder, isStaffOnly: section.isStaffOnly, hidden: section.hidden, archived: section.archived });
  }

  function editBoard(board: ForumBoard) {
    setBoardDraft({
      id: board.id, sectionId: board.sectionId, parentId: board.parentId, title: board.title, description: board.description,
      icon: board.icon, accent: board.accent, sortOrder: board.sortOrder, postingMinRank: board.postingMinRank,
      replyMinRank: board.replyMinRank, visibilityMinRank: board.visibilityMinRank, moderatorRoleIds: board.moderatorRoleIds,
      allowedStatusIds: board.allowedStatusIds, formSchema: board.formSchema, reactionsEnabled: board.reactionsEnabled,
      hidden: board.hidden, archived: board.archived,
    });
  }

  async function moveSection(section: ForumSection, direction: -1 | 1) {
    const ordered = [...payload.sections].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((item) => item.id === section.id);
    const other = ordered[index + direction];
    if (!other) return;
    await perform(async () => {
      await runForumAction({ action: "save_section", id: section.id, parentId: section.parentId, title: section.title, description: section.description, sortOrder: other.sortOrder, isStaffOnly: section.isStaffOnly, hidden: section.hidden, archived: section.archived });
      await runForumAction({ action: "save_section", id: other.id, parentId: other.parentId, title: other.title, description: other.description, sortOrder: section.sortOrder, isStaffOnly: other.isStaffOnly, hidden: other.hidden, archived: other.archived });
    });
  }

  function sanction(memberId: string, type: "warn" | "mute" | "ban") {
    const reason = window.prompt(type === "warn" ? "Причина предупреждения" : type === "mute" ? "Причина мута" : "Причина блокировки");
    if (!reason) return;
    const durationHours = type === "warn" ? undefined : Number(window.prompt("Срок в часах", "24") || "24");
    void perform(() => runForumAction({ action: "moderate_user", userId: memberId, type, reason, durationHours }));
  }

  return (
    <section className="space-y-5">
      <div className="dark-panel overflow-hidden">
        <div className="admin-head">
          <div>
            <div className="hero-kicker"><span /> Управление проектом</div>
            <h2 className="mt-2 font-heading text-2xl font-black uppercase text-white">Панель владельца</h2>
            <p className="mt-1 text-sm text-white/45">Роли, права, статусы, формы и структура сохраняются в PostgreSQL.</p>
          </div>
          <RoleBadge role={user.role} />
        </div>
        <div className="admin-tabs-scroll">
          {canRoles ? <AdminTabButton active={tab === "users"} onClick={() => setTab("users")} icon={<UsersRound />}>Пользователи</AdminTabButton> : null}
          {canRoles ? <AdminTabButton active={tab === "roles"} onClick={() => setTab("roles")} icon={<ShieldCheck />}>Роли</AdminTabButton> : null}
          {canStatuses ? <AdminTabButton active={tab === "statuses"} onClick={() => setTab("statuses")} icon={<ClipboardList />}>Статусы</AdminTabButton> : null}
          {canSections ? <AdminTabButton active={tab === "structure"} onClick={() => setTab("structure")} icon={<FolderTree />}>Структура</AdminTabButton> : null}
          {canTags ? <AdminTabButton active={tab === "tags"} onClick={() => setTab("tags")} icon={<Tags />}>Теги</AdminTabButton> : null}
          {canReactions ? <AdminTabButton active={tab === "reactions"} onClick={() => setTab("reactions")} icon={<SmilePlus />}>Реакции</AdminTabButton> : null}
          {canTrash ? <AdminTabButton active={tab === "trash"} onClick={() => setTab("trash")} icon={<Trash2 />}>Корзина</AdminTabButton> : null}
          {canAudit ? <AdminTabButton active={tab === "audit"} onClick={() => setTab("audit")} icon={<FileClock />}>Журнал</AdminTabButton> : null}
          {canIntegrations ? <AdminTabButton active={tab === "integrations"} onClick={() => setTab("integrations")} icon={<Webhook />}>Интеграции</AdminTabButton> : null}
          {canSettings ? <AdminTabButton active={tab === "settings"} onClick={() => setTab("settings")} icon={<Settings />}>Настройки</AdminTabButton> : null}
        </div>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      {tab === "users" && canRoles ? (
        <div className="dark-panel overflow-hidden">
          <div className="panel-title"><UserCog /> Пользователи и роли</div>
          <div className="divide-y divide-white/[0.06]">
            {payload.users.map((member) => (
              <div key={member.id} className="admin-list-row">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-white">{member.username}</strong><RoleBadge role={member.role} /></div>
                  <p className="mt-1 text-xs text-white/35">{member.postsCount} сообщений · {member.points} баллов · регистрация {formatDate(member.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2"><select className="forum-select min-w-56" value={member.role.id} disabled={busy || ["owner", "mrproper"].includes(member.role.id)} onChange={(event) => void perform(() => runForumAction({ action: "set_user_role", userId: member.id, roleId: event.target.value }))}>{payload.roles.filter((role) => role.enabled).map((role) => <option key={role.id} value={role.id} disabled={["owner", "mrproper"].includes(role.id)}>{role.label} ({role.rank})</option>)}</select>{user.role.permissions.includes("forum.user.warn") ? <Button size="sm" variant="outline" className="admin-icon-button" onClick={() => sanction(member.id, "warn")}>Warn</Button> : null}{user.role.permissions.includes("forum.user.mute") ? <Button size="sm" variant="outline" className="admin-icon-button" onClick={() => sanction(member.id, "mute")}>Mute</Button> : null}{user.role.permissions.includes("forum.user.ban") ? <Button size="sm" variant="destructive" onClick={() => sanction(member.id, "ban")}>Ban</Button> : null}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "roles" && canRoles ? (
        <div className="space-y-4">
          <div className="admin-toolbar"><p>Любая роль создаётся без изменения кода. Все права проверяются на сервере.</p><Button className="bg-red-600 font-bold hover:bg-red-500" onClick={() => setRoleDraft({ ...emptyRole })}><Plus /> Новая роль</Button></div>
          <div className="dark-panel overflow-hidden divide-y divide-white/[0.06]">
            {payload.roles.slice().sort((a, b) => b.rank - a.rank).map((role) => (
              <div key={role.id} className="admin-list-row">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="board-mini-icon" style={{ color: role.color, borderColor: `${role.color}55` }}>{role.icon || "◆"}</span>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><RoleBadge role={role} />{!role.enabled ? <span className="private-pill">Отключена</span> : null}</div><p className="mt-1 truncate text-xs text-white/35">ID: {role.id} · приоритет {role.rank} · {role.permissions.length} прав</p></div>
                </div>
                <div className="flex gap-2">
                  <Button size="icon-sm" variant="outline" className="admin-icon-button" aria-label="Редактировать" onClick={() => setRoleDraft({ ...role })}><Pencil /></Button>
                  <Button size="icon-sm" variant="outline" className="admin-icon-button" aria-label="Клонировать" onClick={() => void perform(() => runForumAction({ action: "clone_role", roleId: role.id }))}><Copy /></Button>
                  {!(["member", "owner", "mrproper"].includes(role.id)) ? <Button size="icon-sm" variant="outline" className="admin-icon-button" aria-label={role.enabled ? "Отключить" : "Включить"} onClick={() => void perform(() => runForumAction({ action: "toggle_role", roleId: role.id, enabled: !role.enabled }))}>{role.enabled ? <X /> : <Save />}</Button> : null}
                  {!(["member", "owner", "mrproper"].includes(role.id)) ? <Button size="icon-sm" variant="destructive" aria-label="Удалить" onClick={() => { setDeleteRoleId(role.id); setMoveRoleId("member"); }}><Trash2 /></Button> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "statuses" && canStatuses ? (
        <div className="space-y-4">
          <div className="admin-toolbar"><p>Компактные статусы отображаются в списках и внутри темы.</p><Button className="bg-red-600 font-bold hover:bg-red-500" onClick={() => setStatusDraft({ ...emptyStatus })}><Plus /> Новый статус</Button></div>
          <div className="dark-panel overflow-hidden divide-y divide-white/[0.06]">
            {payload.topicStatuses.map((status) => (
              <div key={status.id} className="admin-list-row"><div className="flex items-center gap-3"><StatusBadge status={status.id} definition={status} /><span className="text-xs text-white/35">ID: {status.id} · порядок {status.sortOrder}{!status.enabled ? " · отключён" : ""}</span></div><div className="flex gap-2"><Button size="icon-sm" variant="outline" className="admin-icon-button" onClick={() => setStatusDraft({ ...status })}><Pencil /></Button>{status.id !== "open" ? <Button size="icon-sm" variant="destructive" onClick={() => { setDeleteStatusId(status.id); setMoveStatusId("open"); }}><Trash2 /></Button> : null}</div></div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "structure" && canSections ? (
        <div className="space-y-4">
          <div className="admin-toolbar"><p>Категории и разделы удаляются мягко и попадают в корзину.</p><Button className="bg-red-600 font-bold hover:bg-red-500" onClick={() => setSectionDraft({ title: "", description: "", parentId: null, sortOrder: 50, isStaffOnly: false, hidden: false, archived: false })}><Plus /> Категория</Button></div>
          {payload.sections.map((section) => (
            <div key={section.id} className="dark-panel overflow-hidden">
              <div className="admin-section-head">
                <div><div className="flex flex-wrap items-center gap-2"><h3>{section.title}</h3>{section.isStaffOnly ? <span className="private-pill">Только состав</span> : null}{section.hidden ? <span className="private-pill">Скрыта</span> : null}{section.archived ? <span className="private-pill">Архив</span> : null}</div><p>{section.description}</p></div>
                <div className="flex gap-2"><Button size="icon-sm" variant="outline" className="admin-icon-button" onClick={() => void moveSection(section, -1)}><ChevronUp /></Button><Button size="icon-sm" variant="outline" className="admin-icon-button" onClick={() => void moveSection(section, 1)}><ChevronDown /></Button><Button size="sm" variant="outline" className="admin-icon-button" onClick={() => setBoardDraft({ sectionId: section.id, parentId: null, title: "", description: "", icon: "◆", accent: "#ff2d3f", sortOrder: 50, postingMinRank: 0, replyMinRank: 0, visibilityMinRank: 0, moderatorRoleIds: [], allowedStatusIds: [], formSchema: [], reactionsEnabled: true, hidden: false, archived: false })}><Plus /> Раздел</Button><Button size="icon-sm" variant="outline" className="admin-icon-button" onClick={() => editSection(section)}><Pencil /></Button><Button size="icon-sm" variant="destructive" onClick={() => { setDeleteStructure({ type: "section", id: section.id, title: section.title }); setDeleteStructureMode(payload.sections.some((item) => item.id !== section.id && item.boards.some((board) => !board.archived)) ? "move" : "trash"); setMoveThreadsToBoardId(""); }}><Trash2 /></Button></div>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {section.boards.map((board) => (
                  <div key={board.id} className="admin-list-row"><div className="flex min-w-0 items-center gap-3"><span className="board-mini-icon" style={{ color: board.accent, borderColor: `${board.accent}55` }}>{board.icon}</span><div className="min-w-0"><strong className="block truncate text-sm text-white">{board.title}</strong><span className="block truncate text-xs text-white/35">{board.description} · форма: {board.formSchema.length} полей</span></div></div><div className="flex gap-2">{board.hidden ? <span className="private-pill">Скрыт</span> : null}{board.archived ? <span className="private-pill">Архив</span> : null}<Button size="icon-sm" variant="outline" className="admin-icon-button" onClick={() => editBoard(board)}><Pencil /></Button><Button size="icon-sm" variant="destructive" onClick={() => { setDeleteStructure({ type: "board", id: board.id, title: board.title, sectionId: section.id }); setDeleteStructureMode(payload.sections.flatMap((item) => item.boards).some((item) => item.id !== board.id && !item.archived) ? "move" : "trash"); setMoveThreadsToBoardId(""); }}><Trash2 /></Button></div></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "tags" && canTags ? (
        <div className="space-y-4"><div className="admin-toolbar"><p>Теги помогают фильтровать и находить темы.</p><Button className="bg-red-600 font-bold hover:bg-red-500" onClick={() => setTagDraft({ ...emptyTag })}><Plus /> Новый тег</Button></div><div className="dark-panel overflow-hidden divide-y divide-white/[0.06]">{payload.tags.map((tag) => <div key={tag.id} className="admin-list-row"><span className="tag-pill" style={{ color: tag.color, borderColor: `${tag.color}55`, backgroundColor: `${tag.color}18` }}>{tag.label}</span><div className="flex gap-2"><Button size="icon-sm" variant="outline" className="admin-icon-button" onClick={() => setTagDraft({ ...tag })}><Pencil /></Button><Button size="icon-sm" variant="destructive" onClick={() => { if (window.confirm(`Удалить тег «${tag.label}»?`)) void perform(() => runForumAction({ action: "delete_tag", tagId: tag.id })); }}><Trash2 /></Button></div></div>)}</div></div>
      ) : null}

      {tab === "reactions" && canReactions ? (
        <div className="space-y-4"><div className="admin-toolbar"><p>Реакции отображаются под сообщениями во всех разделах, где они включены.</p><Button className="bg-red-600 font-bold hover:bg-red-500" onClick={() => setReactionDraft({ ...emptyReaction })}><Plus /> Новая реакция</Button></div><div className="dark-panel overflow-hidden divide-y divide-white/[0.06]">{payload.reactionTypes.map((reaction) => <div key={reaction.id} className="admin-list-row"><div className="flex items-center gap-3"><span className="text-xl">{reaction.emoji}</span><div><strong className="text-sm text-white">{reaction.label}</strong><p className="text-xs text-white/35">ID: {reaction.id} · порядок {reaction.sortOrder}{reaction.enabled ? "" : " · отключена"}</p></div></div><div className="flex gap-2"><Button size="icon-sm" variant="outline" className="admin-icon-button" onClick={() => setReactionDraft({ ...reaction })}><Pencil /></Button><Button size="icon-sm" variant="destructive" onClick={() => { if (window.confirm(`Удалить реакцию «${reaction.label}» и связанные отметки?`)) void perform(() => runForumAction({ action: "delete_reaction_type", reactionId: reaction.id })); }}><Trash2 /></Button></div></div>)}</div></div>
      ) : null}

      {tab === "trash" && canTrash ? (
        <div className="dark-panel overflow-hidden"><div className="panel-title"><Trash2 /> Корзина и soft-delete</div>{payload.trash.length ? <div className="divide-y divide-white/[0.06]">{payload.trash.map((item) => <div key={item.id} className="admin-list-row"><div><strong className="text-sm text-white">{item.title}</strong><p className="mt-1 text-xs text-white/35">{item.itemType} · удалено {formatDate(item.deletedAt)} · автоочистка {formatDate(item.purgeAfter)}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" className="admin-icon-button" onClick={() => void perform(() => runForumAction({ action: "restore_trash", id: item.id }))}><ArchiveRestore /> Восстановить</Button><Button size="sm" variant="destructive" onClick={() => { if (window.confirm("Удалить объект окончательно? Это действие необратимо.")) void perform(() => runForumAction({ action: "purge_trash", id: item.id })); }}><Trash2 /> Удалить навсегда</Button></div></div>)}</div> : <div className="empty-state">Корзина пуста.</div>}</div>
      ) : null}

      {tab === "audit" && canAudit ? (
        <div className="dark-panel overflow-hidden"><div className="panel-title"><FileClock /> Журнал действий</div><div className="audit-table">{payload.audit.map((entry) => <details key={entry.id} className="audit-details"><summary className="audit-row"><div><strong>{entry.actorName}</strong><span>{entry.action}</span></div><code>{entry.objectType}:{entry.objectId}</code><time>{formatDateTime(entry.createdAt)}</time></summary><div className="audit-values"><div><strong>Было</strong><pre>{JSON.stringify(entry.oldValue, null, 2)}</pre></div><div><strong>Стало</strong><pre>{JSON.stringify(entry.newValue, null, 2)}</pre></div>{entry.ipHash ? <small>Хеш IP: {entry.ipHash}</small> : null}</div></details>)}</div></div>
      ) : null}

      {tab === "integrations" && canIntegrations ? (
        <div className="space-y-4"><div className="admin-toolbar"><p>Webhook-архитектура для Discord, Telegram, Minecraft и LuckPerms. Токены не хранятся в базе: указывается только имя переменной окружения Vercel.</p></div><div className="space-y-3">{payload.integrations.map((integration) => <IntegrationEditor key={integration.id} integration={integration} busy={busy} onSave={(value) => void perform(() => runForumAction({ action: "save_integration", integration: value }))} />)}</div></div>
      ) : null}

      {tab === "settings" && canSettings ? (
        <div className="space-y-4">
          <div className="dark-panel owner-appearance-panel">
            <div className="owner-appearance-heading"><div><h3>Внешний вид форума</h3><p>Название, базовые картинки, тексты, сервер и видимые блоки меняются без редактирования кода.</p></div><span className="private-pill">Только владелец</span></div>
            <div className="owner-appearance-preview" style={{ backgroundImage: appearance.heroImageUrl ? `linear-gradient(90deg,rgba(8,10,14,.95),rgba(8,10,14,.42)),url("${appearance.heroImageUrl}")` : undefined, borderColor: appearance.accentColor }}><div>{appearance.logoImageUrl ? <img src={appearance.logoImageUrl} alt="Логотип" /> : <span style={{ background: appearance.accentColor }}>CW</span>}<small>{appearance.forumSubtitle}</small><strong>{appearance.heroTitle}</strong><p>{appearance.heroSubtitle}</p></div></div>
            <div className="owner-appearance-fields">
              <label className="editor-label">Название форума<Input maxLength={40} value={appearance.forumName} onChange={(event) => setAppearance({ ...appearance, forumName: event.target.value })} /></label>
              <label className="editor-label">Подпись форума<Input maxLength={120} value={appearance.forumSubtitle} onChange={(event) => setAppearance({ ...appearance, forumSubtitle: event.target.value })} /></label>
              <label className="editor-label owner-wide">Объявление<Input maxLength={300} value={appearance.announcement} onChange={(event) => setAppearance({ ...appearance, announcement: event.target.value })} /></label>
              <label className="editor-label">Заголовок баннера<Input maxLength={90} value={appearance.heroTitle} onChange={(event) => setAppearance({ ...appearance, heroTitle: event.target.value })} /></label>
              <label className="editor-label">Подзаголовок баннера<Textarea rows={3} maxLength={300} value={appearance.heroSubtitle} onChange={(event) => setAppearance({ ...appearance, heroSubtitle: event.target.value })} /></label>
              <label className="editor-label">Картинка баннера<Input value={appearance.heroImageUrl} onChange={(event) => setAppearance({ ...appearance, heroImageUrl: event.target.value })} placeholder="/images/hero.jpg или https://..." /></label>
              <label className="editor-label">Логотип<Input value={appearance.logoImageUrl} onChange={(event) => setAppearance({ ...appearance, logoImageUrl: event.target.value })} placeholder="https://.../logo.png" /></label>
              <label className="editor-label">Название сервера<Input maxLength={60} value={appearance.serverName} onChange={(event) => setAppearance({ ...appearance, serverName: event.target.value })} /></label>
              <label className="editor-label">IP сервера<Input maxLength={120} value={appearance.serverIp} onChange={(event) => setAppearance({ ...appearance, serverIp: event.target.value })} /></label>
              <label className="editor-label">Основной цвет<Input type="color" value={appearance.accentColor} onChange={(event) => setAppearance({ ...appearance, accentColor: event.target.value })} /></label>
            </div>
            <div className="setting-checks"><label><input type="checkbox" checked={appearance.showHero} onChange={(event) => setAppearance({ ...appearance, showHero: event.target.checked })} /> Показывать большой баннер</label><label><input type="checkbox" checked={appearance.showRightSidebar} onChange={(event) => setAppearance({ ...appearance, showRightSidebar: event.target.checked })} /> Показывать правую колонку</label></div>
            <Button disabled={busy} className="bg-red-600" onClick={() => void perform(() => runForumAction({ action: "save_forum_settings", trashRetentionDays: retentionDays, appearance }))}><Save /> Сохранить оформление и настройки</Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2"><div className="dark-panel space-y-4 p-5"><div><h3 className="font-heading text-base font-bold uppercase text-white">Корзина</h3><p className="mt-1 text-xs text-white/35">Удалённые темы, сообщения и разделы очищаются автоматически.</p></div><label className="editor-label">Хранить удалённое, дней<Input type="number" min={1} max={3650} value={retentionDays} onChange={(event) => setRetentionDays(Number(event.target.value))} /></label><p className="text-xs text-white/35">Срок сохраняется вместе с оформлением кнопкой выше.</p></div><div className="dark-panel space-y-4 p-5"><div><h3 className="font-heading text-base font-bold uppercase text-white">Просмотреть форум как роль</h3><p className="mt-1 text-xs text-white/35">Настоящие права владельца не меняются. Все изменения временно блокируются.</p></div><select className="forum-select" value={viewAsRoleId} onChange={(event) => setViewAsRoleId(event.target.value)}>{payload.roles.filter((role) => role.enabled && !["owner", "mrproper"].includes(role.id)).map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select><Button className="bg-amber-600 hover:bg-amber-500" onClick={() => void perform(() => runForumAction({ action: "set_view_as_role", roleId: viewAsRoleId }), () => window.location.reload())}><UsersRound /> Просмотреть форум как…</Button></div></div>
        </div>
      ) : null}

      {roleDraft ? <RoleEditor role={roleDraft} permissionsByCategory={permissionsByCategory} busy={busy} onChange={setRoleDraft} onClose={() => setRoleDraft(null)} onSave={() => void perform(() => runForumAction({ action: "save_role", role: roleDraft }), () => setRoleDraft(null))} /> : null}
      {statusDraft ? <StatusEditor status={statusDraft} busy={busy} onChange={setStatusDraft} onClose={() => setStatusDraft(null)} onSave={() => void perform(() => runForumAction({ action: "save_status", status: statusDraft }), () => setStatusDraft(null))} /> : null}
      {tagDraft ? <TagEditor tag={tagDraft} busy={busy} onChange={setTagDraft} onClose={() => setTagDraft(null)} onSave={() => void perform(() => runForumAction({ action: "save_tag", tag: tagDraft }), () => setTagDraft(null))} /> : null}
      {reactionDraft ? <ReactionEditor reaction={reactionDraft} busy={busy} onChange={setReactionDraft} onClose={() => setReactionDraft(null)} onSave={() => void perform(() => runForumAction({ action: "save_reaction_type", reaction: reactionDraft }), () => setReactionDraft(null))} /> : null}
      {sectionDraft ? <SectionEditor draft={sectionDraft} sections={payload.sections} busy={busy} onChange={setSectionDraft} onClose={() => setSectionDraft(null)} onSave={() => void perform(() => runForumAction({ action: "save_section", ...sectionDraft }), () => setSectionDraft(null))} /> : null}
      {boardDraft ? <BoardEditor draft={boardDraft} payload={payload} busy={busy} onChange={setBoardDraft} onClose={() => setBoardDraft(null)} onSave={() => void perform(() => runForumAction({ action: "save_board", ...boardDraft }), () => setBoardDraft(null))} /> : null}

      {deleteRoleId ? <ConfirmMoveModal title="Удаление роли" description="Куда перенести участников этой роли?" value={moveRoleId} options={payload.roles.filter((role) => role.id !== deleteRoleId && role.enabled)} onValue={setMoveRoleId} onClose={() => setDeleteRoleId(null)} onConfirm={() => void perform(() => runForumAction({ action: "delete_role", roleId: deleteRoleId, moveToRoleId: moveRoleId }), () => setDeleteRoleId(null))} /> : null}
      {deleteStatusId ? <ConfirmMoveModal title="Удаление статуса" description="Какой статус назначить существующим темам?" value={moveStatusId} options={payload.topicStatuses.filter((status) => status.id !== deleteStatusId && status.enabled).map((status) => ({ id: status.id, label: status.label }))} onValue={setMoveStatusId} onClose={() => setDeleteStatusId(null)} onConfirm={() => void perform(() => runForumAction({ action: "delete_status", statusId: deleteStatusId, moveToStatusId: moveStatusId }), () => setDeleteStatusId(null))} /> : null}
      {deleteStructure ? <DeleteStructureModal target={deleteStructure} mode={deleteStructureMode} moveToBoardId={moveThreadsToBoardId} boards={payload.sections.flatMap((section) => section.boards).filter((board) => board.id !== deleteStructure.id && (deleteStructure.type !== "section" || board.sectionId !== deleteStructure.id) && !board.archived)} busy={busy} onMode={setDeleteStructureMode} onBoard={setMoveThreadsToBoardId} onClose={() => setDeleteStructure(null)} onConfirm={() => void perform(() => runForumAction(deleteStructure.type === "section" ? { action: "delete_section", id: deleteStructure.id, mode: deleteStructureMode, moveToBoardId: moveThreadsToBoardId || undefined } : { action: "delete_board", id: deleteStructure.id, mode: deleteStructureMode, moveToBoardId: moveThreadsToBoardId || undefined }), () => setDeleteStructure(null))} /> : null}
    </section>
  );
}

function AdminTabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return <button type="button" className={active ? "admin-tab active" : "admin-tab"} onClick={onClick}>{icon}{children}</button>;
}

function EditorShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="editor-backdrop"><div className="dark-panel editor-modal"><div className="editor-head"><h3>{title}</h3><button onClick={onClose} aria-label="Закрыть"><X /></button></div><div className="editor-content">{children}</div></div></div>;
}

function RoleEditor({ role, permissionsByCategory, busy, onChange, onClose, onSave }: { role: RoleDefinition; permissionsByCategory: [string, ForumPayload["permissions"]][]; busy: boolean; onChange: (role: RoleDefinition) => void; onClose: () => void; onSave: () => void }) {
  function toggle(permission: PermissionKey) { onChange({ ...role, permissions: role.permissions.includes(permission) ? role.permissions.filter((key) => key !== permission) : [...role.permissions, permission] }); }
  return <EditorShell title={role.id ? `Роль: ${role.label || role.id}` : "Новая роль"} onClose={onClose}><div className="grid gap-3 sm:grid-cols-2"><label className="editor-label">Внутренний ID<Input value={role.id} disabled={Boolean(role.id)} onChange={(event) => onChange({ ...role, id: event.target.value.toLowerCase() })} placeholder="new_role" /></label><label className="editor-label">Название<Input value={role.label} onChange={(event) => onChange({ ...role, label: event.target.value })} /></label><label className="editor-label">Короткое название<Input value={role.shortLabel} onChange={(event) => onChange({ ...role, shortLabel: event.target.value })} /></label><label className="editor-label">Badge<Input value={role.badge} maxLength={32} onChange={(event) => onChange({ ...role, badge: event.target.value })} placeholder="STAFF" /></label><label className="editor-label">Приоритет<Input type="number" value={role.rank} onChange={(event) => onChange({ ...role, rank: Number(event.target.value) })} /></label><label className="editor-label">HEX<Input type="color" value={role.color} onChange={(event) => onChange({ ...role, color: event.target.value })} /></label><label className="editor-label">Иконка<Input value={role.icon} maxLength={8} onChange={(event) => onChange({ ...role, icon: event.target.value })} /></label><label className="editor-label sm:col-span-2">Градиент<Input value={role.gradient} onChange={(event) => onChange({ ...role, gradient: event.target.value })} placeholder="linear-gradient(90deg,#ff2d3f,#ff7a18)" /></label><label className="editor-label sm:col-span-2">Описание<Textarea value={role.description} rows={3} onChange={(event) => onChange({ ...role, description: event.target.value })} /></label></div><div className="setting-checks"><label><input type="checkbox" checked={role.enabled} onChange={(event) => onChange({ ...role, enabled: event.target.checked })} /> Активна</label><label><input type="checkbox" checked={role.showInProfile} onChange={(event) => onChange({ ...role, showInProfile: event.target.checked })} /> В профиле</label><label><input type="checkbox" checked={role.showNearPosts} onChange={(event) => onChange({ ...role, showNearPosts: event.target.checked })} /> Возле сообщений</label><label><input type="checkbox" checked={role.showInUsers} onChange={(event) => onChange({ ...role, showInUsers: event.target.checked })} /> В списке</label></div><div className="permission-grid">{permissionsByCategory.map(([category, permissions]) => <fieldset key={category}><legend>{category}</legend>{permissions.map((permission) => <label key={permission.key}><input type="checkbox" checked={role.permissions.includes(permission.key)} onChange={() => toggle(permission.key)} /> {permission.label}</label>)}</fieldset>)}</div><Button disabled={busy} className="w-full bg-red-600 font-bold hover:bg-red-500" onClick={onSave}><Save /> Сохранить роль</Button></EditorShell>;
}

function StatusEditor({ status, busy, onChange, onClose, onSave }: { status: TopicStatusDefinition; busy: boolean; onChange: (status: TopicStatusDefinition) => void; onClose: () => void; onSave: () => void }) {
  return <EditorShell title={status.id ? "Редактирование статуса" : "Новый статус"} onClose={onClose}><label className="editor-label">ID<Input value={status.id} disabled={Boolean(status.id)} onChange={(event) => onChange({ ...status, id: event.target.value.toLowerCase() })} placeholder="custom_status" /></label><label className="editor-label">Название<Input value={status.label} onChange={(event) => onChange({ ...status, label: event.target.value })} /></label><div className="grid grid-cols-2 gap-3"><label className="editor-label">Цвет<Input type="color" value={status.color} onChange={(event) => onChange({ ...status, color: event.target.value })} /></label><label className="editor-label">Порядок<Input type="number" value={status.sortOrder} onChange={(event) => onChange({ ...status, sortOrder: Number(event.target.value) })} /></label></div><label className="setting-line"><input type="checkbox" checked={status.enabled} onChange={(event) => onChange({ ...status, enabled: event.target.checked })} /> Статус доступен сотрудникам</label><Button disabled={busy} className="w-full bg-red-600 font-bold hover:bg-red-500" onClick={onSave}><Save /> Сохранить</Button></EditorShell>;
}

function TagEditor({ tag, busy, onChange, onClose, onSave }: { tag: ForumTag; busy: boolean; onChange: (tag: ForumTag) => void; onClose: () => void; onSave: () => void }) {
  return <EditorShell title={tag.id ? "Редактирование тега" : "Новый тег"} onClose={onClose}><label className="editor-label">ID<Input value={tag.id} disabled={Boolean(tag.id)} onChange={(event) => onChange({ ...tag, id: event.target.value.toLowerCase() })} /></label><label className="editor-label">Название<Input value={tag.label} onChange={(event) => onChange({ ...tag, label: event.target.value })} /></label><div className="grid grid-cols-2 gap-3"><label className="editor-label">Цвет<Input type="color" value={tag.color} onChange={(event) => onChange({ ...tag, color: event.target.value })} /></label><label className="editor-label">Порядок<Input type="number" value={tag.sortOrder} onChange={(event) => onChange({ ...tag, sortOrder: Number(event.target.value) })} /></label></div><Button disabled={busy} className="w-full bg-red-600 font-bold hover:bg-red-500" onClick={onSave}><Save /> Сохранить</Button></EditorShell>;
}

function ReactionEditor({ reaction, busy, onChange, onClose, onSave }: { reaction: ReactionTypeDefinition; busy: boolean; onChange: (reaction: ReactionTypeDefinition) => void; onClose: () => void; onSave: () => void }) {
  return <EditorShell title={reaction.id ? "Редактирование реакции" : "Новая реакция"} onClose={onClose}><label className="editor-label">ID<Input value={reaction.id} disabled={Boolean(reaction.id)} onChange={(event) => onChange({ ...reaction, id: event.target.value.toLowerCase() })} placeholder="custom_reaction" /></label><label className="editor-label">Название<Input value={reaction.label} onChange={(event) => onChange({ ...reaction, label: event.target.value })} /></label><div className="grid grid-cols-2 gap-3"><label className="editor-label">Emoji<Input value={reaction.emoji} maxLength={12} onChange={(event) => onChange({ ...reaction, emoji: event.target.value })} /></label><label className="editor-label">Порядок<Input type="number" value={reaction.sortOrder} onChange={(event) => onChange({ ...reaction, sortOrder: Number(event.target.value) })} /></label></div><label className="setting-line"><input type="checkbox" checked={reaction.enabled} onChange={(event) => onChange({ ...reaction, enabled: event.target.checked })} /> Реакция активна</label><Button disabled={busy} className="w-full bg-red-600 font-bold hover:bg-red-500" onClick={onSave}><Save /> Сохранить</Button></EditorShell>;
}

function SectionEditor({ draft, sections, busy, onChange, onClose, onSave }: { draft: SectionDraft; sections: ForumSection[]; busy: boolean; onChange: (draft: SectionDraft) => void; onClose: () => void; onSave: () => void }) {
  return <EditorShell title={draft.id ? "Редактирование категории" : "Новая категория"} onClose={onClose}><Input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder="Название категории" /><Textarea value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} placeholder="Описание" rows={3} /><div className="grid gap-3 sm:grid-cols-2"><label className="editor-label">Родитель<select className="forum-select" value={draft.parentId ?? ""} onChange={(event) => onChange({ ...draft, parentId: event.target.value || null })}><option value="">Нет</option>{sections.filter((section) => section.id !== draft.id).map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</select></label><label className="editor-label">Порядок<Input type="number" value={draft.sortOrder} onChange={(event) => onChange({ ...draft, sortOrder: Number(event.target.value) })} /></label></div><div className="setting-checks"><label><input type="checkbox" checked={draft.isStaffOnly} onChange={(event) => onChange({ ...draft, isStaffOnly: event.target.checked })} /> Только состав</label><label><input type="checkbox" checked={draft.hidden} onChange={(event) => onChange({ ...draft, hidden: event.target.checked })} /> Скрыта</label><label><input type="checkbox" checked={draft.archived} onChange={(event) => onChange({ ...draft, archived: event.target.checked })} /> Архив</label></div><Button disabled={busy} className="w-full bg-red-600 font-bold hover:bg-red-500" onClick={onSave}><Save /> Сохранить категорию</Button></EditorShell>;
}

function BoardEditor({ draft, payload, busy, onChange, onClose, onSave }: { draft: BoardDraft; payload: ForumPayload; busy: boolean; onChange: (draft: BoardDraft) => void; onClose: () => void; onSave: () => void }) {
  function updateField(index: number, patch: Partial<ForumFormField>) { onChange({ ...draft, formSchema: draft.formSchema.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...patch } : field) }); }
  return <EditorShell title={draft.id ? "Настройка раздела" : "Новый раздел"} onClose={onClose}><select className="forum-select" value={draft.sectionId} onChange={(event) => onChange({ ...draft, sectionId: event.target.value })}>{payload.sections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</select><Input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder="Название" /><Textarea value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} placeholder="Описание" rows={3} /><div className="grid gap-3 sm:grid-cols-3"><label className="editor-label">Иконка<Input value={draft.icon} onChange={(event) => onChange({ ...draft, icon: event.target.value })} /></label><label className="editor-label">Цвет<Input type="color" value={draft.accent} onChange={(event) => onChange({ ...draft, accent: event.target.value })} /></label><label className="editor-label">Порядок<Input type="number" value={draft.sortOrder} onChange={(event) => onChange({ ...draft, sortOrder: Number(event.target.value) })} /></label><RoleRankSelect label="Кто видит" value={draft.visibilityMinRank} roles={payload.roles} onChange={(value) => onChange({ ...draft, visibilityMinRank: value })} /><RoleRankSelect label="Кто создаёт темы" value={draft.postingMinRank} roles={payload.roles} onChange={(value) => onChange({ ...draft, postingMinRank: value })} /><RoleRankSelect label="Кто отвечает" value={draft.replyMinRank} roles={payload.roles} onChange={(value) => onChange({ ...draft, replyMinRank: value })} /></div><label className="editor-label">Роли-модераторы<select multiple className="forum-select min-h-28" value={draft.moderatorRoleIds} onChange={(event) => onChange({ ...draft, moderatorRoleIds: [...event.target.selectedOptions].map((option) => option.value) })}>{payload.roles.filter((role) => role.canModerate).map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select></label><label className="editor-label">Разрешённые статусы<select multiple className="forum-select min-h-28" value={draft.allowedStatusIds} onChange={(event) => onChange({ ...draft, allowedStatusIds: [...event.target.selectedOptions].map((option) => option.value) })}>{payload.topicStatuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label><div className="form-builder"><div className="flex items-center justify-between"><h4>Форма создания темы</h4><Button size="sm" variant="outline" className="admin-icon-button" onClick={() => onChange({ ...draft, formSchema: [...draft.formSchema, { id: `field_${draft.formSchema.length + 1}`, label: "Новое поле", type: "text", required: false, options: [] }] })}><Plus /> Поле</Button></div>{draft.formSchema.map((field, index) => <div key={`${field.id}-${index}`} className="form-field-editor"><Input value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} /><select className="forum-select" value={field.type} onChange={(event) => updateField(index, { type: event.target.value as ForumFormField["type"] })}>{["text", "textarea", "select", "multi-select", "checkbox", "radio", "date", "file", "image", "url"].map((type) => <option key={type} value={type}>{type}</option>)}</select><Input value={field.options.join(", ")} disabled={!(["select", "multi-select", "radio"].includes(field.type))} onChange={(event) => updateField(index, { options: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} placeholder="Варианты через запятую" /><label className="setting-line"><input type="checkbox" checked={field.required} onChange={(event) => updateField(index, { required: event.target.checked })} /> Обязательно</label><Button size="icon-sm" variant="destructive" onClick={() => onChange({ ...draft, formSchema: draft.formSchema.filter((_, fieldIndex) => fieldIndex !== index) })}><Trash2 /></Button></div>)}</div><div className="setting-checks"><label><input type="checkbox" checked={draft.reactionsEnabled} onChange={(event) => onChange({ ...draft, reactionsEnabled: event.target.checked })} /> Реакции</label><label><input type="checkbox" checked={draft.hidden} onChange={(event) => onChange({ ...draft, hidden: event.target.checked })} /> Скрыт</label><label><input type="checkbox" checked={draft.archived} onChange={(event) => onChange({ ...draft, archived: event.target.checked })} /> Архив</label></div><Button disabled={busy} className="w-full bg-red-600 font-bold hover:bg-red-500" onClick={onSave}><Save /> Сохранить раздел</Button></EditorShell>;
}

function RoleRankSelect({ label, value, roles, onChange }: { label: string; value: number; roles: RoleDefinition[]; onChange: (value: number) => void }) { return <label className="editor-label">{label}<select className="forum-select" value={value} onChange={(event) => onChange(Number(event.target.value))}>{roles.map((role) => <option key={role.id} value={role.rank}>{role.label}</option>)}</select></label>; }

function ConfirmMoveModal({ title, description, value, options, onValue, onClose, onConfirm }: { title: string; description: string; value: string; options: { id: string; label: string }[]; onValue: (value: string) => void; onClose: () => void; onConfirm: () => void }) { return <EditorShell title={title} onClose={onClose}><p className="text-sm text-white/55">{description}</p><select className="forum-select" value={value} onChange={(event) => onValue(event.target.value)}>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><Button variant="destructive" className="w-full" onClick={onConfirm}><Trash2 /> Подтвердить удаление</Button></EditorShell>; }

function DeleteStructureModal({ target, mode, moveToBoardId, boards, busy, onMode, onBoard, onClose, onConfirm }: { target: DeleteStructureTarget; mode: "move" | "trash"; moveToBoardId: string; boards: ForumBoard[]; busy: boolean; onMode: (mode: "move" | "trash") => void; onBoard: (id: string) => void; onClose: () => void; onConfirm: () => void }) { return <EditorShell title={`Удаление: ${target.title}`} onClose={onClose}><p className="text-sm text-white/55">Объект попадёт в корзину. Выберите, что сделать с находящимися внутри темами.</p><div className="setting-checks"><label><input type="radio" checked={mode === "move"} disabled={!boards.length} onChange={() => onMode("move")} /> Перенести темы</label><label><input type="radio" checked={mode === "trash"} onChange={() => onMode("trash")} /> Переместить темы в корзину</label></div>{mode === "move" ? <label className="editor-label">Новый раздел<select className="forum-select" value={moveToBoardId} onChange={(event) => onBoard(event.target.value)}><option value="">Выберите раздел</option>{boards.map((board) => <option key={board.id} value={board.id}>{board.title}</option>)}</select></label> : <p className="text-xs text-amber-300/70">Темы можно будет восстановить вместе с разделом до срока автоочистки.</p>}<Button disabled={busy || (mode === "move" && !moveToBoardId)} variant="destructive" className="w-full" onClick={onConfirm}><Trash2 /> Подтвердить</Button></EditorShell>; }

function IntegrationEditor({ integration, busy, onSave }: { integration: ForumIntegration; busy: boolean; onSave: (value: ForumIntegration) => void }) { const [draft, setDraft] = useState(integration); const events = ["new_report", "topic_transfer", "punishment", "status_changed"]; return <div className="dark-panel p-4"><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Webhook className="size-4 text-red-400" /><strong className="text-sm uppercase text-white">{draft.provider}</strong>{draft.enabled ? <span className="private-pill">Включено</span> : null}</div><p className="mt-1 text-xs text-white/35">Отправка событий через HTTPS webhook</p></div><label className="setting-line"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} /> Активна</label></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="editor-label">Webhook URL<Input value={draft.webhookUrl} onChange={(event) => setDraft({ ...draft, webhookUrl: event.target.value })} placeholder="https://..." /></label><label className="editor-label">Переменная секрета<Input value={draft.secretEnvKey} onChange={(event) => setDraft({ ...draft, secretEnvKey: event.target.value.toUpperCase() })} placeholder="CLOUDWORLD_WEBHOOK_SECRET" /></label></div><div className="setting-checks mt-3">{events.map((eventName) => <label key={eventName}><input type="checkbox" checked={draft.eventTypes.includes(eventName)} onChange={() => setDraft({ ...draft, eventTypes: draft.eventTypes.includes(eventName) ? draft.eventTypes.filter((value) => value !== eventName) : [...draft.eventTypes, eventName] })} /> {eventName}</label>)}</div><Button disabled={busy} size="sm" className="mt-3 bg-red-600" onClick={() => onSave(draft)}><Save /> Сохранить интеграцию</Button></div>; }

function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
