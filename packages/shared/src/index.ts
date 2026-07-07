export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "SYSTEM";
  clientMsgId: string;
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
}

export interface ConversationMemberLite {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  lastReadMessageId?: string | null;
}

export interface ConversationDTO {
  id: string;
  type: "DIRECT" | "GROUP";
  name: string;
  avatarUrl?: string | null;
  members: ConversationMemberLite[];
  lastMessage: { id: string; content: string; senderId: string; createdAt: string; type?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "SYSTEM"; deletedAt?: string | null } | null;
  lastReadMessageId: string | null;
  unread: number;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  clientMsgId: string;
  type?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
}
export interface ReadPayload {
  conversationId: string;
  lastReadMessageId: string;
}
export interface TypingPayload {
  conversationId: string;
  isTyping: boolean;
}
export interface JoinPayload {
  conversationId: string;
}

export type SendAck =
  | { ok: true; message: MessageDTO }
  | { ok: false; error: string };

export interface ServerToClientEvents {
  "message:new": (msg: MessageDTO) => void;
  "message:update": (msg: MessageDTO) => void;
  "message:read": (p: { conversationId: string; userId: string; lastReadMessageId: string }) => void;
  typing: (p: { conversationId: string; userId: string; isTyping: boolean }) => void;
  presence: (p: { userId: string; online: boolean }) => void;
  "conversation:new": (p: { conversationId: string }) => void;
  "conversation:update": (p: { conversationId: string; name?: string | null; avatarUrl?: string | null }) => void;
  "conversation:member_joined": (p: { conversationId: string; members: ConversationMemberLite[] }) => void;
  "conversation:member_left": (p: { conversationId: string; userId: string }) => void;
}

export interface ClientToServerEvents {
  "message:send": (p: SendMessagePayload, ack: (res: SendAck) => void) => void;
  "message:edit": (p: { conversationId: string; messageId: string; content: string }, ack: (res: { ok: boolean; error?: string; message?: MessageDTO }) => void) => void;
  "message:delete": (p: { conversationId: string; messageId: string }, ack: (res: { ok: boolean; error?: string; message?: MessageDTO }) => void) => void;
  "message:read": (p: ReadPayload) => void;
  typing: (p: TypingPayload) => void;
  "conversation:join": (p: JoinPayload) => void;
}

export interface SocketData {
  userId: string;
}

export const convRoom = (conversationId: string) => `conv:${conversationId}`;
export const userRoom = (userId: string) => `user:${userId}`;
