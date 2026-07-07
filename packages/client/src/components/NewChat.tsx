import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useStore } from "../store";
import { joinConversation } from "../lib/socket";
import Avatar from "./Avatar";
import type { User } from "../types";

export default function NewChat({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"DIRECT" | "GROUP">("DIRECT");
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);

  const setActive = useStore((s) => s.setActive);
  const setConversations = useStore((s) => s.setConversations);
  const me = useStore((s) => s.user)!;

  useEffect(() => {
    if (!q.trim()) {
      setUsers([]);
      return;
    }
    const t = setTimeout(() => {
      api.searchUsers(q).then(({ users }) => {
        setUsers(users.filter(u => u.id !== me.id));
      }).catch(() => setUsers([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q, me.id]);

  async function startDirectChat(userId: string) {
    setLoading(true);
    try {
      const { conversation } = await api.createDirect(userId);
      const { conversations } = await api.conversations();
      setConversations(conversations);
      joinConversation(conversation.id);
      setActive(conversation.id);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function startGroupChat() {
    if (!groupName.trim() || selectedUsers.length < 2) return;
    setLoading(true);
    try {
      const { conversation } = await api.createGroup(groupName.trim(), selectedUsers.map(u => u.id));
      const { conversations } = await api.conversations();
      setConversations(conversations);
      joinConversation(conversation.id);
      setActive(conversation.id);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const toggleUser = (user: User) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Bắt đầu trò chuyện</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Đóng</button>
        </div>

        <div className="tabs" style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            className={`btn btn-sm ${mode === 'DIRECT' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setMode('DIRECT'); setSelectedUsers([]); setGroupName(''); }}
            style={{ flex: 1, borderRadius: '8px' }}
          >
            Trò chuyện 1-1
          </button>
          <button
            className={`btn btn-sm ${mode === 'GROUP' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('GROUP')}
            style={{ flex: 1, borderRadius: '8px' }}
          >
            Tạo nhóm mới
          </button>
        </div>

        {mode === 'GROUP' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              className="field"
              placeholder="Tên nhóm (bắt buộc)…"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            {selectedUsers.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedUsers.map((u) => (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'var(--surface-2)', padding: '4px 8px 4px 4px',
                    borderRadius: '20px', fontSize: '13px', fontWeight: 500
                  }}>
                    <Avatar name={u.displayName} seed={u.id} size={20} />
                    {u.displayName}
                    <button onClick={() => toggleUser(u)} style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', padding: 2, color: 'var(--muted)'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <input
          className="field"
          placeholder={mode === 'DIRECT' ? "Tìm theo tên hoặc email…" : "Thêm người vào nhóm…"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus={mode === 'DIRECT'}
        />

        {q.trim() !== "" && (
          <div className="user-list">
            {users.map((u) => {
              const isSelected = selectedUsers.some((su) => su.id === u.id);
              return (
                <button
                  key={u.id}
                  className="user-row"
                  onClick={() => mode === 'DIRECT' ? startDirectChat(u.id) : toggleUser(u)}
                  style={{ background: isSelected ? 'var(--surface-2)' : 'transparent' }}
                  disabled={loading}
                >
                  <Avatar name={u.displayName} seed={u.id} size={38} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 500 }}>{u.displayName}</div>
                    <div className="muted small">{u.email}</div>
                  </div>
                  {mode === 'GROUP' && isSelected && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  )}
                </button>
              );
            })}
            {users.length === 0 && <div className="empty small">Không tìm thấy người dùng</div>}
          </div>
        )}

        {mode === 'GROUP' && (
          <button
            className="btn btn-primary"
            disabled={!groupName.trim() || selectedUsers.length < 2 || loading}
            onClick={startGroupChat}
            style={{ marginTop: 'auto', padding: '12px', fontSize: '15px' }}
          >
            {loading ? "Đang tạo..." : selectedUsers.length < 2 ? `Cần chọn ít nhất 2 thành viên` : `Tạo nhóm (${selectedUsers.length} thành viên)`}
          </button>
        )}
      </div>
    </div>
  );
}
