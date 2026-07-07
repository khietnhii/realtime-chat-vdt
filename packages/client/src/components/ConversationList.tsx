import { useStore } from "../store";
import { api } from "../lib/api";
import { joinConversation, markRead } from "../lib/socket";
import { relativeTime } from "../lib/format";
import Avatar from "./Avatar";
import type { Conversation } from "../types";

export default function ConversationList({
  conversations,
  activeId,
}: {
  conversations: Conversation[];
  activeId: string | null;
}) {
  const me = useStore((s) => s.user)!;
  const presence = useStore((s) => s.presence);
  const setActive = useStore((s) => s.setActive);
  const setMessages = useStore((s) => s.setMessages);
  const setConversations = useStore((s) => s.setConversations);

  async function open(conv: Conversation) {
    setActive(conv.id);
    joinConversation(conv.id);
    const { messages } = await api.messages(conv.id);
    setMessages(conv.id, messages);
    const last = messages[messages.length - 1];
    if (last) markRead(conv.id, last.id);
    setConversations(
      useStore.getState().conversations.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c))
    );
  }

  if (conversations.length === 0) {
    return <div className="empty small">Chưa có cuộc trò chuyện nào.<br />Bấm “Cuộc trò chuyện mới” để bắt đầu.</div>;
  }

  return (
    <div className="conv-list">
      {conversations.map((c) => {
        const other = c.type === "DIRECT" ? c.members.find((m) => m.id !== me.id) : null;
        const online = c.type === "DIRECT"
          ? (other ? presence[other.id] : false)
          : c.members.some(m => m.id !== me.id && presence[m.id]);
        
        return (
          <button key={c.id} className={c.id === activeId ? "conv active" : "conv"} onClick={() => open(c)}>
            <Avatar name={c.name} seed={other?.id ?? c.id} url={c.type === "GROUP" ? c.avatarUrl : (other?.avatarUrl ?? null)} size={44} online={online} />
            <div className="conv-body">
              <div className="conv-top">
                <span className="conv-name">{c.name}</span>
                {c.lastMessage && <span className="conv-time">{relativeTime(c.lastMessage.createdAt)}</span>}
              </div>
              <div className="conv-last">
                <span className="conv-preview">
                  {c.lastMessage
                    ? c.lastMessage.deletedAt
                      ? "Tin nhắn đã bị thu hồi"
                      : `${c.lastMessage.senderId === me.id ? "Bạn: " : ""}${
                          c.lastMessage.type === "IMAGE" ? "Đã gửi một ảnh" :
                          c.lastMessage.type === "VIDEO" ? "Đã gửi một video" :
                          c.lastMessage.type === "AUDIO" ? "Đã gửi một tin nhắn thoại" :
                          c.lastMessage.type === "FILE" ? "Đã gửi một tệp đính kèm" :
                          c.lastMessage.content
                        }`
                    : "Chưa có tin nhắn"}
                </span>
                {c.unread > 0 && <span className="badge">{c.unread}</span>}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
