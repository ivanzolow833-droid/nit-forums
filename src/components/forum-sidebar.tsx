"use client";

import { ExternalLink, Server, Shield, UsersRound } from "lucide-react";
import { RoleBadge } from "@/components/role-badge";
import { quickLinks } from "@/lib/forum-data";
import type { ForumAppearanceSettings, ForumUser } from "@/lib/forum-store";
import type { RoleDefinition } from "@/lib/forum-roles";

export function ForumSidebar({
  user,
  roles,
  members,
  appearance,
}: {
  user: ForumUser | null;
  roles: RoleDefinition[];
  members: number;
  appearance: ForumAppearanceSettings;
}) {
  return (
    <aside className="forum-context-sidebar space-y-4 lg:sticky lg:top-24 lg:self-start">
      <section className="dark-panel overflow-hidden">
        <div className="panel-title"><Server /> {appearance.serverName}</div>
        <div className="space-y-4 p-4">
          <div>
            <div className="sidebar-label">Адрес сервера</div>
            <div className="mt-1 font-mono text-base font-bold text-white">{appearance.serverIp}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="sidebar-stat"><strong>{members}</strong><span>участников</span></div>
            <div className="sidebar-stat"><strong>{roles.length}</strong><span>уровней ролей</span></div>
          </div>
          {user ? (
            <div className="rounded-lg border border-white/10 bg-black/25 p-3">
              <div className="sidebar-label">Ваш аккаунт</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="font-bold text-white">{user.username}</span>
                <RoleBadge role={user.role} />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="dark-panel overflow-hidden">
        <div className="panel-title"><ExternalLink /> Полезные ссылки</div>
        <nav className="divide-y divide-white/[0.06]">
          {quickLinks.map((link) => (
            <a key={link.id} href={link.href} target="_blank" rel="noreferrer" className="sidebar-link">
              <span><strong>{link.label}</strong><small>{link.hint}</small></span>
              <ExternalLink className="size-3.5" />
            </a>
          ))}
        </nav>
      </section>

      <section className="dark-panel overflow-hidden">
        <div className="panel-title"><Shield /> Иерархия проекта</div>
        <div className="space-y-2 p-4">
          {roles.filter((role) => role.rank >= 20).reverse().map((role) => (
            <div key={role.id} className="flex items-center justify-between gap-3 border-b border-white/[0.05] pb-2 last:border-0 last:pb-0">
              <span className="truncate text-xs text-white/55">{role.label}</span>
              <RoleBadge role={role} />
            </div>
          ))}
        </div>
      </section>

      <section className="dark-panel flex items-start gap-3 p-4 text-xs leading-5 text-white/45">
        <UsersRound className="mt-0.5 size-4 shrink-0 text-red-400" />
        Роли, темы и ответы хранятся в общей базе данных и доступны на всех устройствах.
      </section>
    </aside>
  );
}
