import type { Conversation, Message, User } from "../types";

const TOKEN_KEY = "chat_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

export const setToken = (t: string) => {
  localStorage.setItem(TOKEN_KEY, t);
  sessionStorage.removeItem(TOKEN_KEY);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
};

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Lỗi ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (data: { email: string; password: string; displayName: string }) =>
    req<{ accessToken?: string; user?: User; requiresVerification?: boolean; email?: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    req<{ accessToken?: string; user?: User; requiresVerification?: boolean; email?: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifyEmail: (data: { email: string; code: string }) =>
    req<{ accessToken: string; user: User }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resendVerification: (email: string) =>
    req<{ success: boolean }>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  checkEmail: (email: string) =>
    req<{ exists: boolean }>("/auth/check-email", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (data: { email: string; newPassword: string }) =>
    req<{ success: boolean }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => req<{ user: User }>("/auth/me"),

  updateProfile: (data: { displayName?: string; currentPassword?: string; newPassword?: string }) =>
    req<{ user: User }>("/auth/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const token = getToken();
    return fetch("/api/auth/avatar", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra");
      return data as { user: User };
    });
  },
  uploadAttachment: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getToken();
    return fetch("/api/upload", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra");
      return data as { url: string; name: string; size: number; type: "IMAGE" | "FILE" };
    });
  },

  searchUsers: (search: string) =>
    req<{ users: User[] }>(`/auth/users?search=${encodeURIComponent(search)}`),

  conversations: () => req<{ conversations: Conversation[] }>("/conversations"),

  createDirect: (userId: string) =>
    req<{ conversation: { id: string } }>("/conversations/direct", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  createGroup: (name: string, memberIds: string[]) =>
    req<{ conversation: { id: string } }>("/conversations/group", {
      method: "POST",
      body: JSON.stringify({ name, memberIds }),
    }),

  updateGroupInfo: (id: string, data: { name?: string; avatarUrl?: string }) =>
    req(`/conversations/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  addGroupMembers: (id: string, memberIds: string[]) =>
    req(`/conversations/${id}/members`, { method: "POST", body: JSON.stringify({ memberIds }) }),

  removeGroupMember: (id: string, userId: string) =>
    req(`/conversations/${id}/members/${userId}`, { method: "DELETE" }),

  messages: (conversationId: string, before?: string) =>
    req<{ messages: Message[]; nextBefore: string | null }>(
      `/conversations/${conversationId}/messages?limit=50${before ? `&before=${encodeURIComponent(before)}` : ""}`
    ),

  catchMeUp: (conversationId: string, options?: { mode?: string, startTime?: string, endTime?: string }) => {
    let url = `/conversations/${conversationId}/catch-me-up`;
    if (options && options.mode === "custom" && options.startTime) {
      url += `?mode=custom&startTime=${encodeURIComponent(options.startTime)}`;
      if (options.endTime) {
        url += `&endTime=${encodeURIComponent(options.endTime)}`;
      }
    }
    return req<{ summary: string }>(url);
  },
};
