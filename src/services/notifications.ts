import { api, getApiErrorMessage } from "@/lib/api";

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
