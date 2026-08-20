import { API_BASE_URL, api, getApiErrorMessage } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-tokens";

export interface Notification {
  id: string;
  title: string;
  body: string | null;
  type?: string;
  projectId: string | null;
  taskId: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export interface NotificationResponse {
  data: Notification[];
  unreadCount: number;
}

export async function getNotifications(params?: {
  page?: number;
  limit?: number;
}): Promise<NotificationResponse> {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    const { data } = await api.get<{
      status: string;
      data: Notification[];
      unreadCount: number;
    }>(`/notifications${suffix}`);
    return { data: data.data, unreadCount: data.unreadCount };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load notifications"));
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    await api.patch(`/notifications/${id}/read`);
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Failed to mark notification as read"),
    );
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    await api.patch("/notifications/read-all");
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, "Failed to mark all notifications as read"),
    );
  }
}

export function subscribeToNotifications(
  onNotification: (notification: Notification) => void,
) {
  const controller = new AbortController();
  let stopped = false;

  const connect = async () => {
    while (!stopped) {
      try {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/notifications/stream`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
          signal: controller.signal,
        });
        if (!response.ok || !response.body)
          throw new Error("Live stream unavailable");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split(/\r?\n\r?\n/);
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const event = frame
              .split(/\r?\n/)
              .find((line) => line.startsWith("event:"))
              ?.slice(6)
              .trim();
            const rawData = frame
              .split(/\r?\n/)
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim())
              .join("\n");
            if (event !== "notification" || !rawData) continue;
            const notification = JSON.parse(rawData) as Notification;
            onNotification(notification);
            window.dispatchEvent(
              new CustomEvent("nexus:notification", { detail: notification }),
            );
          }
        }
      } catch {
        if (stopped) return;
      }
      if (!stopped)
        await new Promise((resolve) => window.setTimeout(resolve, 3_000));
    }
  };

  void connect();
  return () => {
    stopped = true;
    controller.abort();
  };
}
