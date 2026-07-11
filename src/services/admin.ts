import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";

interface ApiDataResponse<T> {
  status: string;
  data: T;
}

export interface AdminStats {
  totalUsers: number;
  totalProjects: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  try {
    const { data } = await api.get<ApiDataResponse<AdminStats>>(API_ENDPOINTS.admin.stats);
    return data.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load admin stats"));
  }
}
