import { cn } from "@/lib/utils";
import type { ThreadStatus } from "@/lib/forum-data";
import { statusLabels } from "@/lib/forum-data";
import type { RoleDefinition } from "@/lib/forum-roles";

export function RoleBadge({ role, className }: { role: RoleDefinition; className?: string }) {
  return (
    <span
      className={cn("role-badge", className)}
      style={{
        color: role.color,
        borderColor: `${role.color}70`,
        backgroundColor: `${role.color}16`,
      }}
      title={role.description}
    >
      {role.shortLabel}
    </span>
  );
}

export function StatusBadge({ status }: { status: ThreadStatus }) {
  return <span className={cn("status-badge", `status-${status}`)}>{statusLabels[status]}</span>;
}
