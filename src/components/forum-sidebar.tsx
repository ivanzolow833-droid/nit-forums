"use client";

import { RoleBadge } from "@/components/role-badge";
import {
  onlineUsers,
  quickLinks,
  site,
  staffRoster,
  getStaffRole,
} from "@/lib/forum-data";

export function ForumSidebar() {
  return (
    <aside id="links" className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <section className="panel p-4">
        <h2 className="font-heading text-base font-bold text-ink">
          Быстрая навигация
        </h2>
        <ul className="mt-3 space-y-2">
          {quickLinks.map((link) => (
            <li key={link.id}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl bg-secondary/80 px-3 py-2.5 transition hover:bg-grass/15"
              >
                <span className="block text-sm font-semibold text-ink">
                  {link.label}
                </span>
                <span className="text-xs text-muted-foreground">{link.hint}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-4">
        <h2 className="font-heading text-base font-bold text-ink">Сервер</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">IP</dt>
            <dd className="font-mono font-semibold text-ink">{site.ip}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Привязка аккаунта</dt>
            <dd>
              <a
                href={site.botUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-grass hover:underline"
              >
                {site.bot}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Донат</dt>
            <dd>
              <a
                href="https://cloudeworld.trademc.org/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-dirt hover:underline"
              >
                cloudeworld.trademc.org
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel p-4">
        <h2 className="font-heading text-base font-bold text-ink">
          Пользователи онлайн
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {onlineUsers.length} сейчас на форуме (демо)
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {onlineUsers.map((user) => (
            <li
              key={user.name}
              className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/70 px-2 py-1 text-xs"
            >
              <span
                className="font-semibold"
                style={{
                  color: user.role ? getStaffRole(user.role).color : "#1c2430",
                }}
              >
                {user.name}
              </span>
              {user.role ? <RoleBadge role={user.role} /> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-4">
        <h2 className="font-heading text-base font-bold text-ink">Состав</h2>
        <ul className="mt-3 space-y-2">
          {staffRoster.map((member) => (
            <li
              key={member.name}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="font-medium">{member.name}</span>
              <RoleBadge role={member.role} />
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
