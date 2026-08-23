"use client";

import { useState } from "react";
import { Layers3, Pencil, Plus, ShieldCheck, Trash2, UsersRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RoleBadge } from "@/components/role-badge";
import { runForumAction, type ForumBoard, type ForumPayload, type ForumSection } from "@/lib/forum-store";

type SectionDraft = {
  id?: string;
  title: string;
  description: string;
  sortOrder: number;
  isStaffOnly: boolean;
};

type BoardDraft = {
  id?: string;
  sectionId: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
  sortOrder: number;
  postingMinRank: number;
};

const emptySection: SectionDraft = {
  title: "",
  description: "",
  sortOrder: 50,
  isStaffOnly: false,
};

export function ForumAdmin({ payload, onChanged }: { payload: ForumPayload; onChanged: () => Promise<void> }) {
  const user = payload.currentUser;
  const [tab, setTab] = useState<"roles" | "sections">("roles");
  const [sectionDraft, setSectionDraft] = useState<SectionDraft | null>(null);
  const [boardDraft, setBoardDraft] = useState<BoardDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || (!user.role.canManageRoles && !user.role.canManageForum)) return null;

  async function perform(task: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await task();
      await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Действие не выполнено.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSection() {
    if (!sectionDraft) return;
    await perform(async () => {
      await runForumAction({ action: "save_section", ...sectionDraft });
      setSectionDraft(null);
    });
  }

  async function saveBoard() {
    if (!boardDraft) return;
    await perform(async () => {
      await runForumAction({ action: "save_board", ...boardDraft });
      setBoardDraft(null);
    });
  }

  function editSection(section: ForumSection) {
    setSectionDraft({
      id: section.id,
      title: section.title,
      description: section.description,
      sortOrder: section.sortOrder,
      isStaffOnly: section.isStaffOnly,
    });
  }

  function editBoard(board: ForumBoard) {
    setBoardDraft({
      id: board.id,
      sectionId: board.sectionId,
      title: board.title,
      description: board.description,
      icon: board.icon,
      accent: board.accent,
      sortOrder: board.sortOrder,
      postingMinRank: board.postingMinRank,
    });
  }

  return (
    <section className="space-y-5">
      <div className="dark-panel overflow-hidden">
        <div className="admin-head">
          <div>
            <div className="hero-kicker"><span /> Управление проектом</div>
            <h2 className="mt-2 font-heading text-2xl font-black uppercase text-white">Панель администрации</h2>
            <p className="mt-1 text-sm text-white/45">Роли, разделы и права редактируются здесь и сразу сохраняются в базе.</p>
          </div>
          <RoleBadge role={user.role} />
        </div>
        <div className="flex border-t border-white/[0.07]">
          {user.role.canManageRoles ? (
            <button type="button" className={tab === "roles" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("roles")}>
              <UsersRound /> Пользователи и роли
            </button>
          ) : null}
          {user.role.canManageForum ? (
            <button type="button" className={tab === "sections" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("sections")}>
              <Layers3 /> Структура форума
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      {tab === "roles" && user.role.canManageRoles ? (
        <div className="dark-panel overflow-hidden">
          <div className="panel-title"><ShieldCheck /> Иерархия пользователей</div>
          <div className="divide-y divide-white/[0.06]">
            {payload.users.map((member) => (
              <div key={member.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-white">{member.username}</strong>
                    <RoleBadge role={member.role} />
                  </div>
                  <p className="mt-1 text-xs text-white/35">Регистрация: {formatDate(member.createdAt)}</p>
                </div>
                <select
                  className="forum-select min-w-56"
                  value={member.role.id}
                  disabled={busy || member.role.id === "owner" || member.role.rank >= user.role.rank}
                  onChange={(event) => void perform(() => runForumAction({ action: "set_user_role", userId: member.id, roleId: event.target.value }))}
                >
                  {payload.roles.map((role) => (
                    <option key={role.id} value={role.id} disabled={role.id === "owner" || role.rank >= user.role.rank}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "sections" && user.role.canManageForum ? (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between gap-3">
            <p className="max-w-2xl text-sm text-white/45">Меняйте названия, описания, порядок, права публикации и цвет каждого подраздела.</p>
            <Button type="button" className="bg-red-600 font-bold hover:bg-red-500" onClick={() => setSectionDraft({ ...emptySection })}>
              <Plus /> Новый раздел
            </Button>
          </div>

          {payload.sections.map((section) => (
            <div key={section.id} className="dark-panel overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.025] p-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-base font-bold uppercase text-white">{section.title}</h3>
                    {section.isStaffOnly ? <span className="private-pill">Только состав</span> : null}
                  </div>
                  <p className="mt-1 text-xs text-white/35">Порядок: {section.sortOrder} · {section.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" onClick={() => setBoardDraft({ sectionId: section.id, title: "", description: "", icon: "◆", accent: "#ff2d3f", sortOrder: 50, postingMinRank: 0 })}>
                    <Plus /> Подраздел
                  </Button>
                  <Button type="button" size="icon-sm" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" aria-label="Редактировать раздел" onClick={() => editSection(section)}><Pencil /></Button>
                  <Button type="button" size="icon-sm" variant="destructive" aria-label="Удалить раздел" onClick={() => {
                    if (window.confirm(`Удалить раздел «${section.title}» вместе со всеми темами?`)) {
                      void perform(() => runForumAction({ action: "delete_section", id: section.id }));
                    }
                  }}><Trash2 /></Button>
                </div>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {section.boards.map((board) => (
                  <div key={board.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="board-mini-icon" style={{ color: board.accent, borderColor: `${board.accent}55` }}>{board.icon}</span>
                      <div className="min-w-0">
                        <strong className="block truncate text-sm text-white">{board.title}</strong>
                        <span className="block truncate text-xs text-white/35">{board.description}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-white/30">Ранг публикации: {board.postingMinRank}</span>
                      <Button type="button" size="icon-sm" variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" aria-label="Редактировать подраздел" onClick={() => editBoard(board)}><Pencil /></Button>
                      <Button type="button" size="icon-sm" variant="destructive" aria-label="Удалить подраздел" onClick={() => {
                        if (window.confirm(`Удалить подраздел «${board.title}» вместе со всеми темами?`)) {
                          void perform(() => runForumAction({ action: "delete_board", id: board.id }));
                        }
                      }}><Trash2 /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {sectionDraft ? (
        <EditorShell title={sectionDraft.id ? "Редактирование раздела" : "Новый раздел"} onClose={() => setSectionDraft(null)}>
          <Input value={sectionDraft.title} onChange={(event) => setSectionDraft({ ...sectionDraft, title: event.target.value })} placeholder="Название раздела" />
          <Textarea value={sectionDraft.description} onChange={(event) => setSectionDraft({ ...sectionDraft, description: event.target.value })} placeholder="Краткое описание" rows={3} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="editor-label">Порядок<Input type="number" value={sectionDraft.sortOrder} onChange={(event) => setSectionDraft({ ...sectionDraft, sortOrder: Number(event.target.value) })} /></label>
            <label className="flex items-center gap-3 rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white/70"><input type="checkbox" checked={sectionDraft.isStaffOnly} onChange={(event) => setSectionDraft({ ...sectionDraft, isStaffOnly: event.target.checked })} /> Только для состава</label>
          </div>
          <Button type="button" disabled={busy} className="w-full bg-red-600 font-bold hover:bg-red-500" onClick={() => void saveSection()}>Сохранить раздел</Button>
        </EditorShell>
      ) : null}

      {boardDraft ? (
        <EditorShell title={boardDraft.id ? "Редактирование подраздела" : "Новый подраздел"} onClose={() => setBoardDraft(null)}>
          <select className="forum-select" value={boardDraft.sectionId} onChange={(event) => setBoardDraft({ ...boardDraft, sectionId: event.target.value })}>
            {payload.sections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
          </select>
          <Input value={boardDraft.title} onChange={(event) => setBoardDraft({ ...boardDraft, title: event.target.value })} placeholder="Название подраздела" />
          <Textarea value={boardDraft.description} onChange={(event) => setBoardDraft({ ...boardDraft, description: event.target.value })} placeholder="Описание" rows={3} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="editor-label">Значок<Input value={boardDraft.icon} maxLength={4} onChange={(event) => setBoardDraft({ ...boardDraft, icon: event.target.value })} /></label>
            <label className="editor-label">Цвет<Input type="color" value={boardDraft.accent} onChange={(event) => setBoardDraft({ ...boardDraft, accent: event.target.value })} /></label>
            <label className="editor-label">Порядок<Input type="number" value={boardDraft.sortOrder} onChange={(event) => setBoardDraft({ ...boardDraft, sortOrder: Number(event.target.value) })} /></label>
            <label className="editor-label">Мин. ранг для темы<select className="forum-select mt-1" value={boardDraft.postingMinRank} onChange={(event) => setBoardDraft({ ...boardDraft, postingMinRank: Number(event.target.value) })}>
              {payload.roles.map((role) => <option key={role.id} value={role.rank}>{role.label} ({role.rank})</option>)}
            </select></label>
          </div>
          <Button type="button" disabled={busy} className="w-full bg-red-600 font-bold hover:bg-red-500" onClick={() => void saveBoard()}>Сохранить подраздел</Button>
        </EditorShell>
      ) : null}
    </section>
  );
}

function EditorShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="dark-panel w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h3 className="font-heading text-lg font-bold uppercase text-white">{title}</h3>
          <button type="button" className="rounded-md p-2 text-white/50 hover:bg-white/5 hover:text-white" onClick={onClose} aria-label="Закрыть"><X className="size-4" /></button>
        </div>
        <div className="space-y-3 p-4">{children}</div>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}
