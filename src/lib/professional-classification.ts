export const PROFESSIONAL_ROLE_OPTIONS = [
  { value: "backend", label: "Backend" },
  { value: "frontend", label: "Frontend" },
  { value: "fullstack", label: "Full-stack" },
  { value: "mobile", label: "Mobile" },
  { value: "ui_ux", label: "UI/UX" },
  { value: "qa", label: "QA" },
  { value: "devops", label: "DevOps" },
  { value: "data", label: "Data" },
  { value: "ai_ml", label: "AI/ML" },
  { value: "architect", label: "Architect" },
] as const;

export const SENIORITY_OPTIONS = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
] as const;

export type ProfessionalRole = (typeof PROFESSIONAL_ROLE_OPTIONS)[number]["value"];
export type SeniorityLevel = (typeof SENIORITY_OPTIONS)[number]["value"];

export function professionalRoleLabel(role: string | null | undefined) {
  return PROFESSIONAL_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? null;
}

export function professionalTitle(
  role: string | null | undefined,
  seniority: string | null | undefined,
) {
  const roleLabel = professionalRoleLabel(role);
  if (!roleLabel) return null;
  const seniorityLabel = SENIORITY_OPTIONS.find(
    (option) => option.value === seniority,
  )?.label;
  return [seniorityLabel, roleLabel].filter(Boolean).join(" ");
}
