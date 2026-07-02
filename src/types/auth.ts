export type UserRole = "customer" | "freelancer" | "admin";

// Public role options — admin is created manually by the team, never here.
export const PUBLIC_ROLES: Exclude<UserRole, "admin">[] = ["customer", "freelancer"];

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  photoUrl: string | null;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: Exclude<UserRole, "admin">;
}

export const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  customer: "/dashboard/customer",
  freelancer: "/dashboard/freelancer",
  admin: "/dashboard/admin",
};
