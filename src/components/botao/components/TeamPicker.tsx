import { TEAMS, type Team } from "../data/teams";

export function TeamPicker({
  value,
  onChange,
  label,
  exclude,
}: {
  value: string;
  onChange: (id: string) => void;
  label: string;
  exclude?: string | undefined;
}) {
  const list = TEAMS.filter((t) => t.id !== exclude);
  return (
    <div>
      <p className="mb-2 font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">{label}</p>
      <div className="team-grid">
        {list.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`team-card ${value === t.id ? "team-card-active" : ""}`}
          >
            <span className="team-dot" style={{ background: t.primary, borderColor: t.secondary }} />
            <span className="min-w-0">
              <span className="block truncate font-display text-sm">{t.short}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{t.city}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function TeamBadge({ team, size = "md" }: { team: Team; size?: "sm" | "md" }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={`shrink-0 rounded-full border-2 ${size === "sm" ? "size-4" : "size-6"}`}
        style={{ background: team.primary, borderColor: team.secondary }}
      />
      <span className="truncate">{team.short}</span>
    </span>
  );
}
