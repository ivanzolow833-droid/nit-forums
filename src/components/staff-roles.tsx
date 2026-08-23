import { RoleBadge } from "@/components/role-badge";
import { staffRoles, staffRoster, getStaffRole } from "@/lib/forum-data";

export function StaffRoles() {
  return (
    <section id="roles" className="panel scroll-mt-24 p-5 sm:p-7">
      <h2 className="font-heading text-2xl font-extrabold text-ink sm:text-3xl">
        Роли администрации
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
        Только служебная линейка CloudWorld: от хелпера до главного админа. Без
        «VIP-ролей» на форуме — донат отдельно в магазине.
      </p>

      <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {staffRoles.map((role) => (
          <li key={role.id} className="rounded-2xl border border-border bg-secondary/40 p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">#{role.rank}</span>
              <RoleBadge role={role.id} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              {role.description}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-8 border-t border-border pt-6">
        <h3 className="font-heading text-xl font-bold text-ink">Состав сейчас</h3>
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {staffRoster.map((member) => {
            const role = getStaffRole(member.role);
            return (
              <li
                key={member.name}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <span className="font-semibold" style={{ color: role.color }}>
                  {member.name}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    ранг {role.rank}
                  </span>
                  <RoleBadge role={member.role} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
