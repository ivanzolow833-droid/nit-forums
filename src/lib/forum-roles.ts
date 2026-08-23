export type RoleDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  rank: number;
  canModerate: boolean;
  canManageForum: boolean;
  canManageRoles: boolean;
};

export const roleDefinitions: RoleDefinition[] = [
  { id: "member", label: "Игрок", shortLabel: "Игрок", description: "Обычный участник форума CloudWorld.", color: "#8b95a7", rank: 0, canModerate: false, canManageForum: false, canManageRoles: false },
  { id: "helper", label: "Помощник", shortLabel: "Хелпер", description: "Помогает игрокам и передаёт сложные обращения модерации.", color: "#35c46a", rank: 10, canModerate: false, canManageForum: false, canManageRoles: false },
  { id: "junior_moderator", label: "Младший модератор", shortLabel: "Мл. модератор", description: "Проверяет темы и помогает поддерживать порядок.", color: "#32a7ff", rank: 20, canModerate: true, canManageForum: false, canManageRoles: false },
  { id: "moderator", label: "Модератор", shortLabel: "Модератор", description: "Разбирает жалобы, закрывает и помечает темы.", color: "#257de8", rank: 30, canModerate: true, canManageForum: false, canManageRoles: false },
  { id: "senior_moderator", label: "Старший модератор", shortLabel: "Ст. модератор", description: "Координирует модераторов и сложные разбирательства.", color: "#6057e8", rank: 40, canModerate: true, canManageForum: false, canManageRoles: false },
  { id: "curator", label: "Куратор", shortLabel: "Куратор", description: "Отвечает за отдельное направление или состав проекта.", color: "#a855f7", rank: 50, canModerate: true, canManageForum: false, canManageRoles: false },
  { id: "junior_admin", label: "Младший администратор", shortLabel: "Мл. админ", description: "Управляет разделами и младшим составом администрации.", color: "#f59e0b", rank: 60, canModerate: true, canManageForum: true, canManageRoles: true },
  { id: "admin", label: "Администратор", shortLabel: "Админ", description: "Управляет форумом, составом и игровыми обращениями.", color: "#f97316", rank: 70, canModerate: true, canManageForum: true, canManageRoles: true },
  { id: "senior_admin", label: "Старший администратор", shortLabel: "Ст. админ", description: "Контролирует администраторов и ключевые разделы проекта.", color: "#ef4444", rank: 80, canModerate: true, canManageForum: true, canManageRoles: true },
  { id: "chief_admin", label: "Главный администратор", shortLabel: "Гл. админ", description: "Руководит всей администрацией CloudWorld.", color: "#e11d48", rank: 90, canModerate: true, canManageForum: true, canManageRoles: true },
  { id: "deputy_owner", label: "Заместитель владельца", shortLabel: "Зам. владельца", description: "Управляет проектом от имени владельца.", color: "#d946ef", rank: 95, canModerate: true, canManageForum: true, canManageRoles: true },
  { id: "owner", label: "Владелец", shortLabel: "Владелец", description: "Максимальная роль и полный доступ к форуму CloudWorld.", color: "#ff2d3f", rank: 100, canModerate: true, canManageForum: true, canManageRoles: true },
];

export function getRoleDefinition(roleId: string) {
  return roleDefinitions.find((role) => role.id === roleId) ?? roleDefinitions[0];
}
