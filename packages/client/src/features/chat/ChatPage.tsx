import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../store";
import { api, clearToken } from "../../lib/api";
import { disconnectSocket, joinConversation } from "../../lib/socket";
import Avatar from "../../components/Avatar";
import ConversationList from "../../components/ConversationList";
import MessagePanel from "../../components/MessagePanel";
import NewChat from "../../components/NewChat";
import SettingsModal from "../../components/SettingsModal";

export default function Chat() {
  const user = useStore((s) => s.user)!;
  const conversations = useStore((s) => s.conversations);
  const activeId = useStore((s) => s.activeId);
  const setActive = useStore((s) => s.setActive);
  const setConversations = useStore((s) => s.setConversations);
  const setUser = useStore((s) => s.setUser);
  const [showNew, setShowNew] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.conversations().then(({ conversations }) => {
      setConversations(conversations);
      for (const c of conversations) joinConversation(c.id);
    });
  }, [setConversations]);

  const filtered = useMemo(
    () => conversations.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase())),
    [conversations, query]
  );

  function logout() {
    clearToken();
    disconnectSocket();
    setActive(null);
    setConversations([]);
    setUser(null);
  }

  return (
    <div className="app" data-view={activeId ? "panel" : "list"}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-top-left">
            <div className="me-avatar tooltip-wrap" aria-label="Tài khoản của bạn" onClick={() => setShowSettings(true)} style={{ cursor: "pointer" }}>
              <Avatar name={user.displayName} seed={user.id} url={user.avatarUrl} size={38} />
              <div className="online-indicator"></div>
              <span className="tooltip tooltip-bottom">Cài đặt tài khoản</span>
            </div>
            <h2 className="sidebar-title">Đoạn chat</h2>
          </div>
          <div className="sidebar-top-right">
            <button className="icon-btn tooltip-wrap" onClick={() => setShowNew(true)} aria-label="Cuộc trò chuyện mới">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              <span className="tooltip tooltip-bottom">Cuộc trò chuyện mới</span>
            </button>
            <button className="icon-btn tooltip-wrap" onClick={logout} aria-label="Đăng xuất">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              <span className="tooltip tooltip-bottom">Đăng xuất</span>
            </button>
          </div>
        </div>

        <div className="search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input className="field" placeholder="Tìm cuộc trò chuyện" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        <div className="section-label">Trò chuyện</div>
        <ConversationList conversations={filtered} activeId={activeId} />

        <div className="sidebar-footer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20.5 11.3a8 8 0 0 1-8 8 8.4 8.4 0 0 1-3.5-.8L3.5 19.5l1-4A8 8 0 1 1 20.5 11.3Z" />
            <path d="M7.5 12h2l1.2-2.4 1.8 4.6 1.1-2.2H16.5" />
          </svg>
          <span>Pulse Chat</span>
        </div>
      </aside>

      <main className="main">
        {activeId ? (
          <MessagePanel key={activeId} conversationId={activeId} />
        ) : (
          <div className="placeholder">
            <div className="glyph">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ee0033" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.5 11.3a8 8 0 0 1-8 8 8.4 8.4 0 0 1-3.5-.8L3.5 19.5l1-4A8 8 0 1 1 20.5 11.3Z" />
                <path d="M7.5 12h2l1.2-2.4 1.8 4.6 1.1-2.2H16.5" />
              </svg>
            </div>
            <div>Chọn một cuộc trò chuyện để bắt đầu</div>
          </div>
        )}
      </main>

      {showNew && <NewChat onClose={() => setShowNew(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
