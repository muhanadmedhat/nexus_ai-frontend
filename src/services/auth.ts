import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import type { AuthUser, RegisterInput, UserRole } from "@/types/auth";

// Row shape in public.users (snake_case, mirrors the backend migration).
interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  role: UserRole;
  photo_url: string | null;
}

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phoneNumber: row.phone_number,
    role: row.role,
    photoUrl: row.photo_url,
  };
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signUp(input: RegisterInput): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });
  if (error) throw error;

  const authUserId = data.user?.id;
  if (!authUserId) throw new Error("Sign up did not return a user.");

  // public.users.id must equal the Supabase Auth user id.
  const { error: userError } = await supabase.from("users").insert({
    id: authUserId,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone_number: input.phoneNumber,
    role: input.role,
  });
  if (userError) throw userError;

  if (input.role === "freelancer") {
    const { error: profileError } = await supabase
      .from("freelancer_profiles")
      .insert({ user_id: authUserId });
    if (profileError) throw profileError;
  }
}

// Resolves the current user + role. Tries the backend GET /api/me first;
// falls back to reading public.users directly while the endpoint is mocked.
export async function getMe(): Promise<AuthUser | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  try {
    const { data } = await api.get<AuthUser>("/me");
    return data;
  } catch {
    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, email, phone_number, role, photo_url")
      .eq("id", session.user.id)
      .single<UserRow>();
    if (error || !data) return null;
    return toAuthUser(data);
  }
}
