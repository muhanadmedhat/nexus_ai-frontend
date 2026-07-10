import { api } from "@/lib/api";
import type { Notification } from "@/types/project";

// Contract: GET /api/notifications (not built yet — static placeholder for Sprint 2).
const placeholder: Notification[] = [
  {
    id: "n1",
    title: "Welcome to Nexus AI",
    body: "Create your first project to get started.",
    isRead: false,
    createdAt: "2026-07-09T09:00:00.000Z",
  },
  {
    id: "n2",
    title: "Requirements agent is ready",
    body: "Open a project and start the requirements chat.",
    isRead: true,
    createdAt: "2026-07-08T14:30:00.000Z",
  },
];

export async function listNotifications(): Promise<Notification[]> {
  try {
    const { data } = await api.get<Notification[]>("/notifications");
    return data;
  } catch {
    return [...placeholder];
  }
}
