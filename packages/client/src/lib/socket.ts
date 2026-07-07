import { io, type Socket } from "socket.io-client";
import { useStore } from "../store";
import type { Message } from "../types";

const SERVER_URL = import.meta.env.PROD ? "" : (import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000");
const ACK_TIMEOUT = 6000;

interface OutboxItem {
  conversationId: string;
  content: string;
  clientMsgId: string;
  type?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "SYSTEM";
}

let socket: Socket | null = null;
const outbox = new Map<string, OutboxItem>();

export function connectSocket(token: string) {
  if (socket) socket.disconnect();

  socket = io(SERVER_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });

  const store = useStore.getState;

  socket.on("connect", () => {
    store().setConnected(true);
    for (const c of store().conversations) {
      socket!.emit("conversation:join", { conversationId: c.id });
    }
    flushOutbox();
  });

  socket.on("disconnect", () => {
    store().setConnected(false);
  });

  socket.on("message:new", (msg: Message) => {
    store().upsertMessage(msg);
    store().bumpConversation(msg.conversationId, msg);
    if (store().activeId === msg.conversationId) {
      markRead(msg.conversationId, msg.id);
    }
  });

  socket.on("message:update", (msg: Message) => {
    store().updateMessage(msg.conversationId, msg);
  });

  socket.on("message:read", ({ conversationId, userId, lastReadMessageId }) => {
    store().setRead(conversationId, userId, lastReadMessageId);
  });

  socket.on("typing", ({ conversationId, userId, isTyping }) => {
    store().setTyping(conversationId, userId, isTyping);
  });

  socket.on("presence", ({ userId, online }) => {
    store().setPresence(userId, online);
  });

  socket.on("conversation:new", ({ conversationId }) => {
    import("./api").then(({ api }) => {
      api.conversations().then(({ conversations }) => store().setConversations(conversations));
    });
  });

  socket.on("conversation:update", ({ conversationId, name, avatarUrl }) => {
    store().updateConversationInfo(conversationId, name, avatarUrl);
  });

  socket.on("conversation:member_joined", ({ conversationId, members }) => {
    store().addConversationMembers(conversationId, members);
  });

  socket.on("conversation:member_left", ({ conversationId, userId }) => {
    store().removeConversationMember(conversationId, userId);
  });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  outbox.clear();
}

export function joinConversation(conversationId: string) {
  socket?.emit("conversation:join", { conversationId });
}

export function sendMessage(conversationId: string, content: string, type: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "SYSTEM" = "TEXT") {
  const store = useStore.getState();
  const clientMsgId = crypto.randomUUID();
  const optimistic: Message = {
    id: clientMsgId,
    conversationId,
    senderId: store.user!.id,
    content,
    type,
    clientMsgId,
    createdAt: new Date().toISOString(),
    status: "sending",
  };
  store.upsertMessage(optimistic);
  store.bumpConversation(conversationId, optimistic);

  const item: OutboxItem = { conversationId, content, clientMsgId, type };
  outbox.set(clientMsgId, item);
  emitWithAck(item);
}

function emitWithAck(item: OutboxItem) {
  if (!socket || !socket.connected) return;
  socket
    .timeout(ACK_TIMEOUT)
    .emit("message:send", item, (err: unknown, res: any) => {
      const store = useStore.getState();
      if (err || !res?.ok) {
        store.setSendStatus(item.conversationId, item.clientMsgId, "failed");
        return;
      }
      outbox.delete(item.clientMsgId);
      store.setSendStatus(
        item.conversationId,
        item.clientMsgId,
        "sent",
        res.message.id
      );
    });
}

function flushOutbox() {
  for (const item of outbox.values()) {
    const store = useStore.getState();
    store.setSendStatus(item.conversationId, item.clientMsgId, "sending");
    emitWithAck(item);
  }
}

export function retryMessage(clientMsgId: string) {
  const item = outbox.get(clientMsgId);
  if (item) {
    useStore.getState().setSendStatus(item.conversationId, clientMsgId, "sending");
    emitWithAck(item);
  }
}

export function markRead(conversationId: string, lastReadMessageId: string) {
  socket?.emit("message:read", { conversationId, lastReadMessageId });
}

let typingTimer: ReturnType<typeof setTimeout> | null = null;
export function sendTyping(conversationId: string) {
  socket?.emit("typing", { conversationId, isTyping: true });
  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket?.emit("typing", { conversationId, isTyping: false });
  }, 1500);
}

export function editMessage(conversationId: string, messageId: string, content: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!socket?.connected) return resolve(false);
    socket.emit("message:edit", { conversationId, messageId, content }, (res: any) => {
      if (res?.ok) {
        useStore.getState().updateMessage(conversationId, res.message);
        resolve(true);
      } else {
        alert("Lỗi sửa tin: " + res?.error);
        resolve(false);
      }
    });
  });
}

export function deleteMessage(conversationId: string, messageId: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!socket?.connected) return resolve(false);
    socket.emit("message:delete", { conversationId, messageId }, (res: any) => {
      if (res?.ok) {
        useStore.getState().updateMessage(conversationId, res.message);
        resolve(true);
      } else {
        alert("Lỗi thu hồi tin: " + res?.error);
        resolve(false);
      }
    });
  });
}
