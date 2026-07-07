import { create } from "zustand";
import type { Conversation, Message, SendStatus, User } from "../types";

interface State {
  user: User | null;
  connected: boolean;
  conversations: Conversation[];
  activeId: string | null;
  messagesByConv: Record<string, Message[]>;
  presence: Record<string, boolean>;
  typingByConv: Record<string, Record<string, boolean>>;
  readByConv: Record<string, Record<string, string>>;

  setUser: (u: User | null) => void;
  setConnected: (v: boolean) => void;
  setConversations: (c: Conversation[]) => void;
  setActive: (id: string | null) => void;
  setMessages: (convId: string, msgs: Message[]) => void;
  prependMessages: (convId: string, msgs: Message[]) => void;
  upsertMessage: (msg: Message) => void;
  updateMessage: (convId: string, msg: Message) => void;
  setSendStatus: (convId: string, clientMsgId: string, status: SendStatus, serverId?: string) => void;
  setPresence: (userId: string, online: boolean) => void;
  setTyping: (convId: string, userId: string, isTyping: boolean) => void;
  setRead: (convId: string, userId: string, lastReadMessageId: string) => void;
  bumpConversation: (convId: string, last: Message) => void;
  updateConversationInfo: (convId: string, name?: string | null, avatarUrl?: string | null) => void;
  addConversationMembers: (convId: string, members: any[]) => void;
  removeConversationMember: (convId: string, userId: string) => void;
}

export const useStore = create<State>((set) => ({
  user: null,
  connected: false,
  conversations: [],
  activeId: null,
  messagesByConv: {},
  presence: {},
  typingByConv: {},
  readByConv: {},

  setUser: (user) => set({ user }),
  setConnected: (connected) => set({ connected }),
  setConversations: (conversations) => set((s) => {
    const nextRead: Record<string, Record<string, string>> = { ...s.readByConv };
    for (const c of conversations) {
      if (!nextRead[c.id]) nextRead[c.id] = {};
      for (const m of c.members) {
        if (m.lastReadMessageId) {
          nextRead[c.id][m.id] = m.lastReadMessageId;
        }
      }
    }
    return { conversations, readByConv: nextRead };
  }),
  setActive: (activeId) => set({ activeId }),

  setMessages: (convId, msgs) =>
    set((s) => ({ messagesByConv: { ...s.messagesByConv, [convId]: msgs } })),

  prependMessages: (convId, msgs) =>
    set((s) => ({
      messagesByConv: {
        ...s.messagesByConv,
        [convId]: [...msgs, ...(s.messagesByConv[convId] ?? [])],
      },
    })),

  upsertMessage: (msg) =>
    set((s) => {
      const list = s.messagesByConv[msg.conversationId] ?? [];
      const idx = list.findIndex(
        (m) => m.clientMsgId === msg.clientMsgId || m.id === msg.id
      );
      const next = [...list];
      if (idx >= 0) next[idx] = { ...next[idx], ...msg };
      else next.push(msg);
      return { messagesByConv: { ...s.messagesByConv, [msg.conversationId]: next } };
    }),

  updateMessage: (convId, updatedMsg) => {
    set((s) => {
      const msgs = s.messagesByConv[convId];
      if (!msgs) return s;
      const idx = msgs.findIndex((m) => m.id === updatedMsg.id);
      if (idx === -1) return s;
      const newMsgs = [...msgs];
      newMsgs[idx] = updatedMsg;

      const newConvs = s.conversations.map((c) => {
        if (c.id === convId && c.lastMessage && c.lastMessage.id === updatedMsg.id) {
          return {
            ...c,
            lastMessage: {
              ...c.lastMessage,
              content: updatedMsg.content,
              deletedAt: updatedMsg.deletedAt,
              type: updatedMsg.type,
            },
          };
        }
        return c;
      });

      return {
        messagesByConv: { ...s.messagesByConv, [convId]: newMsgs },
        conversations: newConvs
      };
    });
  },

  setSendStatus: (convId, clientMsgId, status, serverId) =>
    set((s) => {
      const list = s.messagesByConv[convId] ?? [];
      const next = list.map((m) =>
        m.clientMsgId === clientMsgId
          ? { ...m, status, ...(serverId ? { id: serverId } : {}) }
          : m
      );
      let newConvs = s.conversations;
      if (serverId) {
        newConvs = s.conversations.map((c) => {
          if (c.id === convId && c.lastMessage && c.lastMessage.id === clientMsgId) {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                id: serverId,
              },
            };
          }
          return c;
        });
      }

      return {
        messagesByConv: { ...s.messagesByConv, [convId]: next },
        conversations: newConvs
      };
    }),

  setPresence: (userId, online) =>
    set((s) => ({ presence: { ...s.presence, [userId]: online } })),

  setTyping: (convId, userId, isTyping) =>
    set((s) => ({
      typingByConv: {
        ...s.typingByConv,
        [convId]: { ...(s.typingByConv[convId] ?? {}), [userId]: isTyping },
      },
    })),

  setRead: (convId, userId, lastReadMessageId) =>
    set((s) => ({
      readByConv: {
        ...s.readByConv,
        [convId]: { ...(s.readByConv[convId] ?? {}), [userId]: lastReadMessageId },
      },
    })),

  bumpConversation: (convId, last) =>
    set((s) => {
      const convs = s.conversations.map((c) =>
        c.id === convId
          ? {
            ...c,
            lastMessage: {
              id: last.id,
              content: last.content,
              senderId: last.senderId,
              createdAt: last.createdAt,
              type: last.type,
              deletedAt: last.deletedAt,
            },
            unread:
              s.activeId === convId || last.senderId === s.user?.id
                ? c.unread
                : c.unread + 1,
          }
          : c
      );
      convs.sort((a, b) => {
        const ta = a.lastMessage ? Date.parse(a.lastMessage.createdAt) : 0;
        const tb = b.lastMessage ? Date.parse(b.lastMessage.createdAt) : 0;
        return tb - ta;
      });
      return { conversations: convs };
    }),

  updateConversationInfo: (convId, name, avatarUrl) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId
          ? { ...c, ...(name != null ? { name } : {}), ...(avatarUrl !== undefined ? { avatarUrl } : {}) }
          : c
      ),
    })),

  addConversationMembers: (convId, members) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId
          ? { ...c, members: [...c.members, ...members.filter((m) => !c.members.some((cm) => cm.id === m.id))] }
          : c
      ),
    })),

  removeConversationMember: (convId, userId) =>
    set((s) => {
      if (userId === s.user?.id) {
        return {
          conversations: s.conversations.filter((c) => c.id !== convId),
          activeId: s.activeId === convId ? null : s.activeId,
        };
      }
      return {
        conversations: s.conversations.map((c) =>
          c.id === convId
            ? { ...c, members: c.members.filter((m) => m.id !== userId) }
            : c
        ),
      };
    }),
}));
