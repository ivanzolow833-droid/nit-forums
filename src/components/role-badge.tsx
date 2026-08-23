import { getStaffRole, type StaffRoleId } from "@/lib/forum-data";
import { cn } from "@/lib/utils";

export function RoleBadge({
  role,
  className,
}: {
  role: StaffRoleId;
  className?: string;
}) {
  const meta = getStaffRole(role);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white",
        className,
      )}
      style={{ backgroundColor: meta.color }}
    >
      {meta.label}
    </span>
  );
}

export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "new" | "important" | "review" | "rejected" | "resolved";
}) {
  const tones = {
    new: "bg-orange-500 text-white",
    important: "bg-red-600 text-white",
    review: "bg-amber-400 text-ink",
    rejected: "bg-rose-600 text-white",
    resolved: "bg-emerald-600 text-white",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tones[tone],
      )}
    >
      {label}
    </span>
  );
}
