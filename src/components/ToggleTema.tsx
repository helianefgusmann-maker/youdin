import { Moon, Sun } from "lucide-react";
import { useTema } from "@/lib/useTema";

export function ToggleTema() {
  const { tema, alternar } = useTema();

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={tema === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-[var(--surface)] text-muted-foreground transition hover:border-primary hover:text-primary"
    >
      {tema === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
