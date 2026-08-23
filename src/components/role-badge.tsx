import { cn } from "@/lib/utils";
import type { ThreadStatus } from "@/lib/forum-data";
import { statusLabels } from "@/lib/forum-data";
import type { TopicStatusDefinition } from "@/lib/forum-store";
import type { RoleDefinition } from "@/lib/forum-roles";

export function RoleBadge({ role, className }: { role: RoleDefinition; className?: string }) {
  return (
    <span
      className={cn("role-badge", className)}
      style={{
        color: role.color,
        borderColor: `${role.color}70`,
        background: role.gradient || `${role.color}16`,
      }}
      title={role.description}
    >
      {role.icon ? <span aria-hidden="true">{role.icon}</span> : null}
      {role.shortLabel}
      {role.badge ? <small>{role.badge}</small> : null}
    </span>
  );
}

export function StatusBadge({ status, definition }: { status: ThreadStatus; definition?: TopicStatusDefinition }) {
  return (
    <span
      className="status-badge"
      style={{ color: definition?.color, backgroundColor: definition ? `${definition.color}1f` : undefined, borderColor: definition ? `${definition.color}45` : undefined }}
    >
      {definition?.label ?? statusLabels[status] ?? status}
    </span>
  );
}
