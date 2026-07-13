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
    // In development, fallback to mock data for testing UI
    if (process.env.NODE_ENV === 'development') {
      console.warn('Search API unavailable, using mock data.', error);
      return mockSearch(query);
    }
    // In production, just return empty results
    return [];
  }
}

// --- MOCK (development only, remove when backend is ready) ---
function mockSearch(query: string): SearchResult[] {
  const lower = query.toLowerCase();
  const results: SearchResult[] = [];

  // Mock projects
  if ("project".includes(lower) || "ecommerce".includes(lower)) {
    results.push({
      type: "project",
      id: "1",
      title: "E-commerce Website",
      subtitle: "React + Node.js",
      href: "/projects/1",
    });
  }
  if ("blog".includes(lower) || "content".includes(lower)) {
    results.push({
      type: "project",
      id: "2",
      title: "Blog Platform",
      subtitle: "Next.js + Tailwind",
      href: "/projects/2",
    });
  }

  // Mock freelancers
  if ("freelancer".includes(lower) || "dev".includes(lower) || "ahmed".includes(lower)) {
    results.push({
      type: "freelancer",
      id: "2",
      title: "Ahmed Ali",
      subtitle: "Full Stack Developer",
      href: "/dashboard/admin/freelancers/2",
    });
  }
  if ("sara".includes(lower) || "designer".includes(lower)) {
    results.push({
      type: "freelancer",
      id: "3",
      title: "Sara Hassan",
      subtitle: "UI/UX Designer",
      href: "/dashboard/admin/freelancers/3",
    });
  }

  // Mock users (admin only)
  if ("admin".includes(lower) || "user".includes(lower)) {
    results.push({
      type: "user",
      id: "4",
      title: "Admin User",
      subtitle: "admin@example.com",
      href: "/dashboard/admin/users/4",
    });
  }

  return results;
}