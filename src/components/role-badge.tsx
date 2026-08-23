import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { ThreadStatus } from "@/lib/forum-data";
import { statusLabels } from "@/lib/forum-data";
import type { TopicStatusDefinition } from "@/lib/forum-store";
import type { RoleDefinition } from "@/lib/forum-roles";

export function RoleBadge({ role, className, prominent = false }: { role: RoleDefinition; className?: string; prominent?: boolean }) {
  const style = {
    "--role-color": role.color,
    "--role-gradient": role.gradient || `linear-gradient(135deg,${role.color},color-mix(in srgb,${role.color} 35%,#05070a))`,
  } as CSSProperties;
  return (
    <span
      className={cn("role-badge", prominent && "role-badge-prominent", className)}
      style={style}
      data-role={role.id}
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
