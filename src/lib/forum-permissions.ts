export const permissionDefinitions = [
  ["forum.view", "Просмотр форума", "Форум"],
  ["forum.topic.create", "Создание тем", "Темы"],
  ["forum.topic.reply", "Ответы в темах", "Темы"],
  ["forum.topic.edit_own", "Редактирование своих тем", "Темы"],
  ["forum.topic.delete_own", "Удаление своих тем", "Темы"],
  ["forum.topic.edit_any", "Редактирование любых тем", "Модерация"],
  ["forum.topic.delete_any", "Удаление любых тем", "Модерация"],
  ["forum.topic.close", "Закрытие тем", "Модерация"],
  ["forum.topic.reopen", "Открытие закрытых тем", "Модерация"],
  ["forum.topic.pin", "Закрепление тем", "Модерация"],
  ["forum.topic.move", "Перемещение тем", "Модерация"],
  ["forum.topic.status", "Изменение статусов", "Модерация"],
  ["forum.topic.assign", "Взятие тем на рассмотрение", "Модерация"],
  ["forum.topic.transfer", "Передача тем", "Модерация"],
  ["forum.post.hide", "Скрытие сообщений", "Модерация"],
  ["forum.post.delete", "Удаление сообщений", "Модерация"],
  ["forum.post.edit_any", "Редактирование сообщений", "Модерация"],
  ["forum.post.revisions", "Просмотр истории правок", "Модерация"],
  ["forum.user.warn", "Предупреждения пользователям", "Пользователи"],
  ["forum.user.mute", "Блокировка сообщений", "Пользователи"],
  ["forum.user.ban", "Блокировка аккаунтов", "Пользователи"],
  ["forum.private_content.view", "Просмотр конфиденциальных сообщений", "Безопасность"],
  ["forum.reports.manage", "Рассмотрение жалоб на контент", "Модерация"],
  ["forum.cases.manage", "Управление делами и SLA", "Модерация"],
  ["forum.polls.manage", "Управление опросами", "Сообщество"],
  ["forum.knowledge.manage", "Публикация базы знаний", "Сообщество"],
  ["forum.events.manage", "Управление мероприятиями", "Сообщество"],
  ["forum.market.manage", "Модерация торговой площадки", "Сообщество"],
  ["forum.antispam.manage", "Управление антиспамом", "Безопасность"],
  ["forum.thread.merge", "Объединение и разделение тем", "Модерация"],
  ["forum.evidence.manage", "Проверка доказательств", "Модерация"],
  ["forum.templates.personal", "Личные шаблоны", "Шаблоны"],
  ["forum.templates.role", "Шаблоны роли", "Шаблоны"],
  ["forum.templates.global", "Глобальные шаблоны", "Шаблоны"],
  ["forum.audit.view", "Просмотр журнала действий", "Управление"],
  ["forum.sections.manage", "Управление структурой", "Управление"],
  ["forum.roles.manage", "Управление ролями", "Управление"],
  ["forum.statuses.manage", "Управление статусами", "Управление"],
  ["forum.tags.manage", "Управление тегами", "Управление"],
  ["forum.reactions.manage", "Управление реакциями", "Управление"],
  ["forum.forms.manage", "Управление формами", "Управление"],
  ["forum.trash.manage", "Управление корзиной", "Управление"],
  ["forum.settings.manage", "Настройки форума", "Управление"],
  ["forum.integrations.manage", "Настройки интеграций", "Управление"],
  ["forum.view_as_role", "Просмотр форума как роль", "Управление"],
] as const;

export type PermissionKey = (typeof permissionDefinitions)[number][0];

const memberPermissions: PermissionKey[] = [
  "forum.view",
  "forum.topic.create",
  "forum.topic.reply",
  "forum.topic.edit_own",
  "forum.topic.delete_own",
];

const templatePermissions: PermissionKey[] = ["forum.templates.personal"];

const moderationPermissions: PermissionKey[] = [
  "forum.topic.edit_any",
  "forum.topic.close",
  "forum.topic.reopen",
  "forum.topic.pin",
  "forum.topic.move",
  "forum.topic.status",
  "forum.topic.assign",
  "forum.topic.transfer",
  "forum.post.hide",
  "forum.post.delete",
  "forum.post.edit_any",
  "forum.post.revisions",
  "forum.user.warn",
  "forum.audit.view",
  "forum.reports.manage",
  "forum.cases.manage",
  "forum.evidence.manage",
];

const administrationPermissions: PermissionKey[] = [
  "forum.topic.delete_any",
  "forum.user.mute",
  "forum.user.ban",
  "forum.templates.role",
  "forum.sections.manage",
  "forum.statuses.manage",
  "forum.tags.manage",
  "forum.reactions.manage",
  "forum.forms.manage",
  "forum.trash.manage",
  "forum.private_content.view",
  "forum.polls.manage",
  "forum.knowledge.manage",
  "forum.events.manage",
  "forum.market.manage",
  "forum.antispam.manage",
  "forum.thread.merge",
];

const seniorAdministrationPermissions: PermissionKey[] = [
  "forum.templates.global",
  "forum.roles.manage",
  "forum.settings.manage",
  "forum.integrations.manage",
  "forum.view_as_role",
];

function unique(...sets: PermissionKey[][]) {
  return [...new Set(sets.flat())];
}

export const defaultRolePermissions: Record<string, PermissionKey[]> = {
  member: memberPermissions,
  helper: unique(memberPermissions, templatePermissions),
  sthelper: unique(memberPermissions, templatePermissions, moderationPermissions.slice(0, 8)),
  glhelper: unique(memberPermissions, templatePermissions, moderationPermissions),
  moder: unique(memberPermissions, templatePermissions, moderationPermissions),
  stmoder: unique(memberPermissions, templatePermissions, moderationPermissions),
  glmoder: unique(memberPermissions, templatePermissions, moderationPermissions, administrationPermissions.slice(0, 4)),
  mediaadmin: unique(memberPermissions, templatePermissions, moderationPermissions),
  curatormedia: unique(memberPermissions, templatePermissions, moderationPermissions),
  piarmanager: unique(memberPermissions, templatePermissions, moderationPermissions),
  coder: unique(memberPermissions, templatePermissions, moderationPermissions, administrationPermissions),
  admin: unique(memberPermissions, templatePermissions, moderationPermissions, administrationPermissions),
  gladmin: unique(memberPermissions, templatePermissions, moderationPermissions, administrationPermissions, seniorAdministrationPermissions.slice(0, 2)),
  specadmin: unique(memberPermissions, templatePermissions, moderationPermissions, administrationPermissions, seniorAdministrationPermissions),
  tex: unique(memberPermissions, templatePermissions, moderationPermissions, administrationPermissions, seniorAdministrationPermissions),
  gltex: unique(memberPermissions, templatePermissions, moderationPermissions, administrationPermissions, seniorAdministrationPermissions),
  owner: permissionDefinitions.map(([key]) => key),
  mrproper: permissionDefinitions.map(([key]) => key),
};

Object.assign(defaultRolePermissions, {
  junior_moderator: defaultRolePermissions.moder,
  moderator: defaultRolePermissions.moder,
  senior_moderator: defaultRolePermissions.stmoder,
  curator: defaultRolePermissions.glmoder,
  junior_admin: defaultRolePermissions.admin,
  senior_admin: defaultRolePermissions.gladmin,
  chief_admin: defaultRolePermissions.gladmin,
  deputy_owner: defaultRolePermissions.specadmin,
});

export function hasPermission(permissions: string[], permission: PermissionKey) {
  return permissions.includes(permission);
}
