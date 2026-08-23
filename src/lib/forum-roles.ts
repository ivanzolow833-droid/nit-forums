import { defaultRolePermissions } from "@/lib/forum-permissions";

export type RoleDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  gradient: string;
  icon: string;
  badge: string;
  rank: number;
  enabled: boolean;
  showInProfile: boolean;
  showNearPosts: boolean;
  showInUsers: boolean;
  permissions: string[];
  canModerate: boolean;
  canManageForum: boolean;
  canManageRoles: boolean;
};

type SeedRole = Omit<RoleDefinition, "permissions" | "canModerate" | "canManageForum" | "canManageRoles">;

const seedRoles: SeedRole[] = [
  { id: "member", label: "Игрок", shortLabel: "Игрок", description: "Обычный участник форума CLOUD WORLD.", color: "#8b95a7", gradient: "", icon: "●", badge: "", rank: 0, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "helper", label: "Helper", shortLabel: "Helper", description: "Помогает игрокам и обрабатывает обращения первой линии.", color: "#35c46a", gradient: "", icon: "H", badge: "", rank: 10, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "sthelper", label: "Старший Helper", shortLabel: "Ст. Helper", description: "Координирует Helper-состав.", color: "#20b968", gradient: "", icon: "SH", badge: "", rank: 15, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "glhelper", label: "Главный Helper", shortLabel: "Гл. Helper", description: "Руководит Helper-составом.", color: "#0ea968", gradient: "linear-gradient(90deg,#22c55e,#14b8a6)", icon: "GH", badge: "", rank: 20, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "moder", label: "Модератор", shortLabel: "Модератор", description: "Рассматривает жалобы и следит за порядком.", color: "#32a7ff", gradient: "", icon: "M", badge: "", rank: 30, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "stmoder", label: "Старший модератор", shortLabel: "Ст. модер", description: "Координирует модераторов и сложные разбирательства.", color: "#5b7cfa", gradient: "", icon: "SM", badge: "", rank: 40, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "glmoder", label: "Главный модератор", shortLabel: "Гл. модер", description: "Руководит модерацией проекта.", color: "#7c5cff", gradient: "linear-gradient(90deg,#3b82f6,#8b5cf6)", icon: "GM", badge: "", rank: 50, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "mediaadmin", label: "Медиа-администратор", shortLabel: "Media Admin", description: "Администратор медиа-направления.", color: "#ec4899", gradient: "", icon: "MA", badge: "", rank: 54, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "curatormedia", label: "Куратор Media", shortLabel: "Куратор Media", description: "Курирует медиа-команду CLOUD WORLD.", color: "#d946ef", gradient: "", icon: "CM", badge: "", rank: 55, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "piarmanager", label: "PR-менеджер", shortLabel: "PR", description: "Отвечает за продвижение проекта.", color: "#f472b6", gradient: "", icon: "PR", badge: "", rank: 56, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "coder", label: "Разработчик", shortLabel: "Разработчик", description: "Разрабатывает технические системы проекта.", color: "#22d3ee", gradient: "linear-gradient(90deg,#06b6d4,#6366f1)", icon: "</>", badge: "", rank: 60, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "admin", label: "Администратор", shortLabel: "Админ", description: "Управляет форумом и игровыми обращениями.", color: "#f97316", gradient: "", icon: "A", badge: "", rank: 70, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "gladmin", label: "Главный администратор", shortLabel: "Гл. админ", description: "Руководит администрацией CLOUD WORLD.", color: "#ef4444", gradient: "linear-gradient(90deg,#f97316,#ef4444)", icon: "GA", badge: "", rank: 80, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "specadmin", label: "Специальный администратор", shortLabel: "Спец. админ", description: "Старшая администрация с расширенными полномочиями.", color: "#e11d48", gradient: "linear-gradient(90deg,#ef4444,#db2777)", icon: "SA", badge: "", rank: 85, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "tex", label: "Технический администратор", shortLabel: "Тех. админ", description: "Отвечает за техническую инфраструктуру проекта.", color: "#a855f7", gradient: "", icon: "TA", badge: "", rank: 88, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "gltex", label: "Главный технический администратор", shortLabel: "Гл. тех", description: "Руководит техническим направлением CLOUD WORLD.", color: "#8b5cf6", gradient: "linear-gradient(90deg,#8b5cf6,#ec4899)", icon: "GT", badge: "", rank: 92, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "owner", label: "Владелец", shortLabel: "Владелец", description: "Владелец проекта с полным доступом.", color: "#ff2d3f", gradient: "linear-gradient(90deg,#ff2d3f,#ff7a18)", icon: "◆", badge: "CLOUD WORLD", rank: 99, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
  { id: "mrproper", label: "Владелец", shortLabel: "mrproper", description: "Защищённая роль владельца проекта.", color: "#ff334c", gradient: "linear-gradient(90deg,#ff243f,#f59e0b)", icon: "★", badge: "OWNER", rank: 100, enabled: true, showInProfile: true, showNearPosts: true, showInUsers: true },
];

export const roleDefinitions: RoleDefinition[] = seedRoles.map((role) => {
  const permissions = defaultRolePermissions[role.id] ?? defaultRolePermissions.member;
  return {
    ...role,
    permissions,
    canModerate: permissions.includes("forum.topic.status"),
    canManageForum: permissions.includes("forum.sections.manage"),
    canManageRoles: permissions.includes("forum.roles.manage"),
  };
});

export function getRoleDefinition(roleId: string) {
  return roleDefinitions.find((role) => role.id === roleId) ?? roleDefinitions[0];
}
