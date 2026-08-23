/* eslint-disable @next/next/no-img-element */
"use client";

import {
  Bell,
  BookOpenText,
  CheckCheck,
  Flag,
  Handshake,
  Home,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
  Users,
  Wrench,
  X,
} from "lucide-react";
import type { ForumAppearanceSettings, ForumUser, MinecraftServerStatus } from "@/lib/forum-store";

export type ForumNavigationTarget =
  | "home"
  | "forums"
  | "users"
  | "guides"
  | "rules"
  | "complaints"
  | "support"
  | "collaboration"
  | "community"
  | "search"
  | "subscriptions"
  | "account"
  | "staff"
  | "admin";

export function ForumNavigation({ user, appearance, serverStatus, active, collapsed, mobileOpen, onToggle, onCloseMobile, onNavigate, onMarkRead }: { user: ForumUser | null; appearance: ForumAppearanceSettings; serverStatus: MinecraftServerStatus; active: ForumNavigationTarget; collapsed: boolean; mobileOpen: boolean; onToggle: () => void; onCloseMobile: () => void; onNavigate: (target: ForumNavigationTarget) => void; onMarkRead: () => void }) {
  const canStaff = Boolean(user?.role.canModerate);
  const canAdmin = Boolean(user?.role.canManageForum || user?.role.canManageRoles || ["owner", "mrproper"].includes(user?.role.id ?? ""));
  const primary = [
    ["home", "Главная", Home],
    ["forums", "Форумы", MessageSquareText],
    ["users", "Пользователи", Users],
    ["guides", "База знаний", BookOpenText],
    ["rules", "Правила проекта", ScrollText],
    ["complaints", "Жалобы", Flag],
    ["support", "Технический раздел", Wrench],
    ["community", "Центр сообщества", Sparkles],
  ] as const;

  function navigate(target: ForumNavigationTarget) {
    onNavigate(target);
    onCloseMobile();
  }

  return <>
    <button className="mobile-nav-trigger" onClick={onToggle} aria-label="Открыть навигацию"><Menu /></button>
    {mobileOpen ? <button className="navigation-scrim" onClick={onCloseMobile} aria-label="Закрыть навигацию" /> : null}
    <aside className={`forum-navigation ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="navigation-brand"><span className="navigation-logo">{appearance.logoImageUrl ? <img src={appearance.logoImageUrl} alt="" /> : appearance.forumName.slice(0, 2).toUpperCase()}</span><span className="navigation-brand-copy"><strong>{appearance.forumName}</strong><small>{appearance.forumSubtitle}</small></span><button className="navigation-mobile-close" onClick={onCloseMobile} aria-label="Закрыть"><X /></button></div>
      <button className="navigation-collapse" onClick={onToggle} title={collapsed ? "Развернуть меню" : "Свернуть меню"}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}<span>{collapsed ? "Развернуть" : "Свернуть меню"}</span></button>
      <nav className="navigation-links">
        {primary.map(([id, label, Icon]) => <button key={id} className={active === id ? "active" : ""} onClick={() => navigate(id)} title={collapsed ? label : undefined}><Icon /><span>{label}</span></button>)}
        <a href="https://discord.gg/xHMdWm5Qs" target="_blank" rel="noreferrer" title={collapsed ? "Discord" : undefined}><MessageSquareText /><span>Discord</span></a>
        <button className={active === "collaboration" ? "active" : ""} onClick={() => navigate("collaboration")} title={collapsed ? "Сотрудничество" : undefined}><Handshake /><span>Сотрудничество</span></button>
      </nav>
      <div className="navigation-divider"><span>Раздел навигации</span></div>
      <nav className="navigation-links secondary">
        <button className={active === "search" ? "active" : ""} onClick={() => navigate("search")} title={collapsed ? "Найти темы" : undefined}><Search /><span>Найти темы</span></button>
        <button className={active === "subscriptions" ? "active" : ""} onClick={() => user ? navigate("subscriptions") : navigate("account")} title={collapsed ? "Отслеживаемое" : undefined}><Bell /><span>Отслеживаемое</span></button>
        <button onClick={onMarkRead} title={collapsed ? "Прочитать всё" : undefined}><CheckCheck /><span>Прочитать всё</span></button>
        {user ? <button className={active === "account" ? "active" : ""} onClick={() => navigate("account")} title={collapsed ? "Настройки профиля" : undefined}><UserRoundCog /><span>Профиль и настройки</span></button> : null}
        {canStaff ? <button className={active === "staff" ? "active staff" : "staff"} onClick={() => navigate("staff")} title={collapsed ? "Панель сотрудника" : undefined}><ShieldCheck /><span>Панель сотрудника</span></button> : null}
        {canAdmin ? <button className={active === "admin" ? "active admin" : "admin"} onClick={() => navigate("admin")} title={collapsed ? "Панель владельца" : undefined}><Settings /><span>Панель владельца</span></button> : null}
      </nav>
      {!collapsed ? <div className={serverStatus.online ? "navigation-server server-online" : "navigation-server server-offline"}><span className="online-dot" /><div><strong>{appearance.serverName}</strong><small>{serverStatus.online ? `${serverStatus.playersOnline} / ${serverStatus.playersMax} игроков онлайн` : "Сервер не ответил"}</small><small>{appearance.serverIp}</small></div></div> : null}
    </aside>
  </>;
}
