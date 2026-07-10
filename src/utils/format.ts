import type { Project } from "@/types/project";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatBudget(p: Pick<Project, "budgetMin" | "budgetMax" | "currency">): string {
  if (p.budgetMin == null && p.budgetMax == null) return "—";
  const fmt = (n: number) => n.toLocaleString();
  if (p.budgetMin != null && p.budgetMax != null) {
    return `${fmt(p.budgetMin)}–${fmt(p.budgetMax)} ${p.currency}`;
  }
  return `${fmt((p.budgetMin ?? p.budgetMax)!)} ${p.currency}`;
}
