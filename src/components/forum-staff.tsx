/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { ClipboardCheck, Copy, FileSignature, History, Pencil, Plus, Search, Save, Star, Trash2, X } from "lucide-react";
import { RoleBadge, StatusBadge } from "@/components/role-badge";
import { ForumOperations } from "@/components/forum-operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { runForumAction, type ForumPayload, type ForumSignature, type ForumTemplate } from "@/lib/forum-store";

type StaffTab = "moderation" | "operations" | "templates" | "signature" | "history";

const emptyTemplate: ForumTemplate = {
  id: "",
  scope: "personal",
  ownerId: null,
  roleId: null,
  title: "",
  body: "",
  favorite: false,
  sortOrder: 50,
  autoStatusId: null,
  autoClose: false,
  autoLock: false,
  transferRoleId: null,
  internalNote: "",
  enabled: true,
  variables: [],
};

const emptySignature: ForumSignature = { text: "", color: "#cbd5e1", imageUrl: "", slogan: "", links: [], enabled: true };

export function ForumStaffPanel({ payload, onChanged }: { payload: ForumPayload; onChanged: () => Promise<void> }) {
  const [tab, setTab] = useState<StaffTab>("moderation");
  const [templateDraft, setTemplateDraft] = useState<ForumTemplate | null>(null);
  const [signature, setSignature] = useState<ForumSignature>(payload.signature ?? emptySignature);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateScope, setTemplateScope] = useState<"all" | ForumTemplate["scope"]>("all");
  const user = payload.currentUser;
  if (!user || payload.viewingAsRole || !user.role.permissions.includes("forum.topic.assign")) return null;

  async function perform(task: () => Promise<unknown>, after?: () => void) {
    setBusy(true); setError(null);
    try { await task(); after?.(); await onChanged(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Действие не выполнено."); }
    finally { setBusy(false); }
  }

  const ownThreads = payload.recentThreads.filter((thread) => thread.assignment?.userId === user.id);
  const filteredTemplates = payload.templates.filter((template) => (templateScope === "all" || template.scope === templateScope) && `${template.title} ${template.body}`.toLowerCase().includes(templateSearch.toLowerCase()));

  return <section className="space-y-5">
    <div className="dark-panel overflow-hidden">
      <div className="admin-head"><div><div className="hero-kicker"><span /> Рабочее место</div><h2 className="mt-2 font-heading text-2xl font-black uppercase text-white">Панель сотрудника</h2><p className="mt-1 text-sm text-white/45">Жалобы, шаблоны, подпись и история действий.</p></div><RoleBadge role={user.role} /></div>
      <div className="admin-tabs-scroll">
        <button className={tab === "moderation" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("moderation")}><ClipboardCheck /> Модерация</button>
        <button className={tab === "operations" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("operations")}><ClipboardCheck /> Жалобы и дела</button>
        <button className={tab === "templates" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("templates")}><Save /> Мои шаблоны</button>
        <button className={tab === "signature" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("signature")}><FileSignature /> Моя подпись</button>
        <button className={tab === "history" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("history")}><History /> История</button>
      </div>
    </div>
    {error ? <div className="form-error">{error}</div> : null}

    {tab === "moderation" && payload.moderation ? <>
      <div className="moderation-grid">
        <Metric label="Новые жалобы" value={payload.moderation.newReports} accent="#ef4444" />
        <Metric label="На рассмотрении мной" value={payload.moderation.assignedToMe} accent="#f59e0b" />
        <Metric label="Передано мне" value={payload.moderation.transferredToMe} accent="#a855f7" />
        <Metric label="Рассмотрено сегодня" value={payload.moderation.resolvedToday} accent="#22c55e" />
        <Metric label="За 7 дней" value={payload.moderation.resolvedWeek} accent="#38bdf8" />
        <Metric label="Средний ответ" value={`${payload.moderation.averageResponseMinutes} мин`} accent="#64748b" />
      </div>
      <div className="dark-panel overflow-hidden"><div className="panel-title"><ClipboardCheck /> На рассмотрении мной</div>{ownThreads.length ? <div className="divide-y divide-white/[0.06]">{ownThreads.map((thread) => <div key={thread.id} className="admin-list-row"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={thread.status} definition={thread.statusDefinition} /><strong className="truncate text-sm text-white">{thread.title}</strong></div><p className="mt-1 text-xs text-white/35">Автор: {thread.author.username} · обновлено {formatDate(thread.updatedAt)}</p></div></div>)}</div> : <div className="empty-state">У вас нет тем на рассмотрении.</div>}</div>
    </> : null}

    {tab === "operations" ? <ForumOperations payload={payload} onChanged={onChanged} /> : null}

    {tab === "templates" ? <div className="space-y-4">
      <div className="admin-toolbar"><div><h3 className="font-heading text-lg font-black uppercase text-white">Библиотека ответов</h3><p>Базовые ответы уже настроены в стиле администрации RP-форума. Их можно копировать, менять под себя и применять прямо в теме.</p></div><Button className="bg-red-600 font-bold hover:bg-red-500" onClick={() => setTemplateDraft({ ...emptyTemplate })}><Plus /> Новый шаблон</Button></div>
      <div className="template-library-stats"><div><strong>{payload.templates.length}</strong><span>всего шаблонов</span></div><div><strong>{payload.templates.filter((item) => item.favorite).length}</strong><span>быстрых ответов</span></div><div><strong>{payload.templates.filter((item) => item.scope === "global").length}</strong><span>для всего состава</span></div></div>
      <div className="template-library-filters"><label><Search /><Input value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} placeholder="Найти шаблон или текст ответа" /></label><select className="forum-select" value={templateScope} onChange={(event) => setTemplateScope(event.target.value as "all" | ForumTemplate["scope"])}><option value="all">Все шаблоны</option><option value="global">Глобальные</option><option value="role">Для роли</option><option value="personal">Личные</option></select></div>
      {filteredTemplates.length ? <div className="template-card-grid">{filteredTemplates.map((template) => { const canEdit = template.scope === "personal" ? template.ownerId === user.id : template.scope === "role" ? user.role.permissions.includes("forum.templates.role") : user.role.permissions.includes("forum.templates.global"); return <article key={template.id} className={template.favorite ? "template-card favorite" : "template-card"}><div className="template-card-head"><div><span className="template-scope-pill">{template.scope === "personal" ? "Личный" : template.scope === "role" ? "Для роли" : "Глобальный"}</span><h4>{template.favorite ? <Star className="fill-current" /> : null}{template.title}</h4></div><div className="flex gap-1">{canEdit ? <Button size="icon-sm" variant="outline" className="admin-icon-button" title="Редактировать" onClick={() => setTemplateDraft({ ...template })}><Pencil /></Button> : null}<Button size="icon-sm" variant="outline" className="admin-icon-button" title="Создать личную копию" onClick={() => void perform(() => runForumAction({ action: "duplicate_template", templateId: template.id }))}><Copy /></Button>{canEdit ? <Button size="icon-sm" variant="destructive" title="Удалить" onClick={() => { if (window.confirm(`Удалить шаблон «${template.title}»?`)) void perform(() => runForumAction({ action: "delete_template", templateId: template.id })); }}><Trash2 /></Button> : null}</div></div><p className="template-card-preview">{template.body}</p><div className="template-card-meta"><span>{template.variables.length ? `${template.variables.length} переменных` : "Без переменных"}</span>{template.autoStatusId ? <span>Меняет статус</span> : null}{template.autoClose ? <span>Закрывает тему</span> : null}{template.transferRoleId ? <span>Передаёт дальше</span> : null}</div></article>; })}</div> : <div className="empty-state dark-panel">По этому фильтру шаблонов нет.</div>}
    </div> : null}

    {tab === "signature" ? <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="dark-panel space-y-4 p-5"><div className="signature-gif-notice"><FileSignature /><div><strong>GIF-подписи для сотрудников</strong><span>Вставьте прямую HTTPS-ссылку на GIF — анимация появится под каждым вашим официальным ответом.</span></div></div><label className="editor-label">Текст подписи<Textarea rows={5} maxLength={500} value={signature.text} onChange={(event) => setSignature({ ...signature, text: event.target.value })} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="editor-label">Цвет<Input type="color" value={signature.color} onChange={(event) => setSignature({ ...signature, color: event.target.value })} /></label><label className="editor-label">Короткий слоган<Input maxLength={120} value={signature.slogan} onChange={(event) => setSignature({ ...signature, slogan: event.target.value })} /></label></div><label className="editor-label">Прямая HTTPS-ссылка на PNG/JPG/WEBP/GIF<Input value={signature.imageUrl} onChange={(event) => setSignature({ ...signature, imageUrl: event.target.value })} placeholder="https://.../signature.gif" /></label><label className="setting-line"><input type="checkbox" checked={signature.enabled} onChange={(event) => setSignature({ ...signature, enabled: event.target.checked })} /> Автоматически добавлять после ответа</label><Button disabled={busy} className="w-full bg-red-600 font-bold hover:bg-red-500" onClick={() => void perform(() => runForumAction({ action: "save_signature", signature }))}><Save /> Сохранить подпись</Button></div><div className="dark-panel p-5"><div className="sidebar-label">Предпросмотр</div><SignaturePreview signature={signature} role={user.role.label} /></div></div> : null}

    {tab === "history" ? <div className="dark-panel overflow-hidden"><div className="panel-title"><History /> Мои действия</div><div className="audit-table">{payload.audit.filter((entry) => entry.actorName === user.username).map((entry) => <div className="audit-row" key={entry.id}><div><strong>{entry.action}</strong><span>{entry.objectType}</span></div><code>{entry.objectId}</code><time>{formatDate(entry.createdAt)}</time></div>)}</div></div> : null}

    {templateDraft ? <TemplateEditor template={templateDraft} payload={payload} busy={busy} onChange={setTemplateDraft} onClose={() => setTemplateDraft(null)} onSave={() => void perform(() => runForumAction({ action: "save_template", template: templateDraft }), () => setTemplateDraft(null))} /> : null}
  </section>;
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent: string }) { return <div className="moderation-metric" style={{ borderTopColor: accent }}><strong>{value}</strong><span>{label}</span></div>; }

function SignaturePreview({ signature, role }: { signature: ForumSignature; role: string }) { return <div className="signature-card" style={{ borderLeftColor: signature.color }}><strong style={{ color: signature.color }}>{signature.slogan || role}</strong>{signature.text ? <p>{signature.text}</p> : null}{signature.imageUrl ? <img src={signature.imageUrl} alt="Изображение подписи" /> : null}<small>{role}</small></div>; }

function TemplateEditor({ template, payload, busy, onChange, onClose, onSave }: { template: ForumTemplate; payload: ForumPayload; busy: boolean; onChange: (template: ForumTemplate) => void; onClose: () => void; onSave: () => void }) {
  const canRole = payload.currentUser?.role.permissions.includes("forum.templates.role");
  const canGlobal = payload.currentUser?.role.permissions.includes("forum.templates.global");
  return <div className="editor-backdrop"><div className="dark-panel editor-modal template-editor-modal"><div className="editor-head"><h3>{template.id ? "Редактирование шаблона" : "Новый шаблон"}</h3><button onClick={onClose}><X /></button></div><div className="editor-content"><div className="grid gap-3 sm:grid-cols-2"><label className="editor-label">Область<select className="forum-select" value={template.scope} onChange={(event) => onChange({ ...template, scope: event.target.value as ForumTemplate["scope"] })}><option value="personal">Личный</option>{canRole ? <option value="role">Для роли</option> : null}{canGlobal ? <option value="global">Глобальный</option> : null}</select></label><label className="editor-label">Порядок<Input type="number" value={template.sortOrder} onChange={(event) => onChange({ ...template, sortOrder: Number(event.target.value) })} /></label></div><label className="editor-label">Название шаблона<Input value={template.title} maxLength={100} onChange={(event) => onChange({ ...template, title: event.target.value })} placeholder="Например: Игрок наказан" /></label><label className="editor-label">Текст ответа<Textarea rows={10} maxLength={10_000} value={template.body} onChange={(event) => onChange({ ...template, body: event.target.value })} placeholder="Здравствуйте, уважаемый {topic_author}…" /></label><div><div className="sidebar-label">Вставить переменную</div><div className="template-variables">{["moderator", "role", "player", "topic_author", "rule", "punishment", "reason", "date", "time", "topic_id", "topic_title", "server", "evidence", "status", "appeal_link"].map((variable) => <button key={variable} type="button" title={`Вставить {${variable}}`} onClick={() => onChange({ ...template, body: `${template.body}{${variable}}` })}>{`{${variable}}`}</button>)}</div></div><div><div className="sidebar-label">Живой предпросмотр</div><div className="template-live-preview">{template.body || "Здесь появится будущий ответ сотрудника."}</div></div><div className="grid gap-3 sm:grid-cols-2"><label className="editor-label">Статус после отправки<select className="forum-select" value={template.autoStatusId ?? ""} onChange={(event) => onChange({ ...template, autoStatusId: event.target.value || null })}><option value="">Не менять</option>{payload.topicStatuses.filter((status) => status.enabled).map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label><label className="editor-label">Передать роли<select className="forum-select" value={template.transferRoleId ?? ""} onChange={(event) => onChange({ ...template, transferRoleId: event.target.value || null })}><option value="">Не передавать</option>{payload.roles.filter((role) => role.canModerate).map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select></label></div><label className="editor-label">Внутренняя заметка<Textarea rows={3} value={template.internalNote} onChange={(event) => onChange({ ...template, internalNote: event.target.value })} /></label><div className="setting-checks"><label><input type="checkbox" checked={template.favorite} onChange={(event) => onChange({ ...template, favorite: event.target.checked })} /> Показывать в быстрых ответах</label><label><input type="checkbox" checked={template.autoClose} onChange={(event) => onChange({ ...template, autoClose: event.target.checked })} /> Закрыть тему</label><label><input type="checkbox" checked={template.autoLock} onChange={(event) => onChange({ ...template, autoLock: event.target.checked })} /> Заблокировать ответы</label></div><Button disabled={busy || !template.title.trim() || !template.body.trim()} className="w-full bg-red-600 font-bold hover:bg-red-500" onClick={onSave}><Save /> Сохранить шаблон</Button></div></div></div>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
