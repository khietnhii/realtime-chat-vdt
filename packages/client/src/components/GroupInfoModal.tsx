import { useState, useRef, useEffect } from "react";
import type { Conversation, ConversationMemberLite, User } from "../types";
import Avatar from "./Avatar";
import { api } from "../lib/api";
import { useStore } from "../store";

interface GroupInfoModalProps {
  conversation: Conversation;
  onClose: () => void;
  onlinePresence: Record<string, boolean>;
}

export default function GroupInfoModal({ conversation, onClose, onlinePresence }: GroupInfoModalProps) {
  const me = useStore((s) => s.user)!;
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(conversation.name || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [memberToRemove, setMemberToRemove] = useState<ConversationMemberLite | null>(null);

  useEffect(() => {
    if (!showAdd) {
      setSearch("");
      setResults([]);
    }
  }, [showAdd]);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      api.searchUsers(search).then((res) => setResults(res.users));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleUpdateName = async () => {
    if (newName.trim() && newName !== conversation.name) {
      try {
        await api.updateGroupInfo(conversation.id, { name: newName.trim() });
      } catch (err) {
        alert("Lỗi đổi tên: " + err);
      }
    }
    setEditingName(false);
  };

  const handleCancelEdit = () => {
    setNewName(conversation.name || "");
    setEditingName(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.uploadAttachment(file);
      await api.updateGroupInfo(conversation.id, { avatarUrl: url });
    } catch (err: any) {
      alert("Lỗi upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await api.addGroupMembers(conversation.id, [userId]);
      setShowAdd(false);
    } catch (err: any) {
      alert("Lỗi thêm thành viên: " + err.message);
    }
  };

  const handleRemoveMember = (member: ConversationMemberLite) => {
    setMemberToRemove(member);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await api.removeGroupMember(conversation.id, memberToRemove.id);
      setMemberToRemove(null);
    } catch (err: any) {
      alert("Lỗi xóa thành viên: " + err.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{showAdd ? "Thêm thành viên" : "Thông tin nhóm"}</h3>
          <button className="btn btn-ghost btn-sm" onClick={showAdd ? () => setShowAdd(false) : onClose}>
            {showAdd ? "Quay lại" : "Đóng"}
          </button>
        </div>

        {!showAdd ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                className="avatar-upload-wrap"
                style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px', cursor: 'pointer', opacity: uploading ? 0.5 : 1, position: 'relative', width: 80, height: 80, margin: '0 auto 4px' }}
                onClick={() => fileInputRef.current?.click()}
                title="Đổi ảnh đại diện nhóm"
              >
                <Avatar name={conversation.name} seed={conversation.id} url={conversation.avatarUrl} size={80} />
                <div className="avatar-upload-overlay">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                </div>
              </div>
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />

              {editingName ? (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                  <input
                    className="field"
                    style={{ width: '200px', height: '32px' }}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateName();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    autoFocus
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleUpdateName}>Lưu</button>
                  <button className="btn btn-ghost btn-sm" onClick={handleCancelEdit}>Hủy</button>
                </div>
              ) : (
                <h2 style={{ margin: '0 0 4px', fontSize: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  {conversation.name}
                  <button className="action-icon-btn" style={{ width: 24, height: 24 }} onClick={() => setEditingName(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                  </button>
                </h2>
              )}
              <div className="muted small">{conversation.members.length} thành viên</div>
            </div>

            <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 14px' }}>
              <span>Thành viên</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(true)}>+ Thêm</button>
            </div>
            <div className="user-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {[...conversation.members].sort((a, b) => a.id === me.id ? -1 : b.id === me.id ? 1 : 0).map((m: ConversationMemberLite) => (
                <div key={m.id} className="user-row" style={{ cursor: 'default' }}>
                  <div style={{ position: 'relative' }}>
                    <Avatar name={m.displayName} seed={m.id} url={m.avatarUrl} size={38} />
                    {(m.id === me.id || onlinePresence[m.id]) && <div className="online-indicator" style={{ width: 10, height: 10, right: 0, bottom: 0, border: '2px solid var(--surface)' }}></div>}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 500 }}>{m.displayName} {m.id === me.id && "(Bạn)"}</div>
                    <div className="muted small">{m.email}</div>
                  </div>
                  {m.id !== me.id ? (
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleRemoveMember(m)}>Xóa</button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleRemoveMember(m)}>Rời nhóm</button>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              className="field"
              placeholder="Tìm theo email hoặc tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="user-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {results.filter(u => !conversation.members.some(m => m.id === u.id)).map(u => (
                <div key={u.id} className="user-row" onClick={() => handleAddMember(u.id)}>
                  <Avatar name={u.displayName} seed={u.id} url={u.avatarUrl} size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{u.displayName}</div>
                    <div className="small muted">{u.email}</div>
                  </div>
                </div>
              ))}
              {search && results.length === 0 && <div className="muted centered">Không tìm thấy người dùng</div>}
            </div>
          </div>
        )}
      </div>

      {memberToRemove && (
        <div className="modal-backdrop" onClick={() => setMemberToRemove(null)} style={{ zIndex: 1100, background: 'rgba(0,0,0,0.6)' }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, textAlign: 'center' }}>
            <h3 style={{ marginTop: 0 }}>Xác nhận</h3>
            <p>
              {memberToRemove.id === me.id
                ? "Bạn có chắc chắn muốn rời khỏi nhóm này?"
                : <>Bạn có chắc muốn xóa <b>{memberToRemove.displayName}</b> khỏi nhóm?</>}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <button className="btn btn-ghost" onClick={() => setMemberToRemove(null)}>Hủy</button>
              <button className="btn btn-primary" style={{ background: 'var(--red)' }} onClick={confirmRemoveMember}>
                {memberToRemove.id === me.id ? "Rời nhóm" : "Xóa thành viên"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
