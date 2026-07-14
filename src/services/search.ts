import { api } from "@/lib/api";

export interface SearchResult {
  type: "project" | "task" | "freelancer" | "user";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

interface SearchResponse {
  status: string;
  data: SearchResult[];
}

export async function search(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  try {
    const response = await api.get<SearchResponse>(
      `/search?q=${encodeURIComponent(query)}`
    );
    // The backend returns { status: 'success', data: [...] }
    return response.data.data || [];
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Search API unavailable; returning no results.", error);
    }
    return [];
  }
}
