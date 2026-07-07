import { useRef, useState } from "react";
import { api } from "../lib/api";
import { useStore } from "../store";
import Avatar from "./Avatar";

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const user = useStore((s) => s.user)!;
  const setUser = useStore((s) => s.setUser);

  const [displayName, setDisplayName] = useState(user.displayName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = isEditingName || isChangingPassword;

  async function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Kích thước ảnh tối đa là 5MB");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.uploadAvatar(file);
      setUser(res.user);
      setSuccess("Cập nhật ảnh đại diện thành công!");
    } catch (e: any) {
      setError(e instanceof Error ? e.message : "Tải ảnh thất bại");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleCancel() {
    setIsEditingName(false);
    setIsChangingPassword(false);
    setDisplayName(user.displayName);
    setCurrentPassword("");
    setNewPassword("");
    setError("");
    setSuccess("");
  }

  async function handleSave() {
    setError("");
    setSuccess("");

    if (isEditingName && displayName.trim().length < 2) {
      return setError("Tên hiển thị phải có ít nhất 2 ký tự");
    }

    if (isChangingPassword) {
      if (!currentPassword) return setError("Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu mới");
      if (newPassword.length < 8) return setError("Mật khẩu mới phải có ít nhất 8 ký tự");
    }

    setBusy(true);
    try {
      const data: any = {};
      if (isEditingName && displayName.trim() !== user.displayName) data.displayName = displayName.trim();
      if (isChangingPassword && currentPassword && newPassword) {
        data.currentPassword = currentPassword;
        data.newPassword = newPassword;
      }

      if (Object.keys(data).length === 0) {
        setBusy(false);
        handleCancel();
        return;
      }

      const res = await api.updateProfile(data);
      setUser(res.user);
      setSuccess("Cập nhật thông tin thành công!");
      handleCancel();
    } catch (e: any) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Cài đặt tài khoản</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Đóng</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '16px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{ position: 'relative', cursor: busy ? 'default' : 'pointer' }}
              onClick={busy ? undefined : handleAvatarClick}
              title="Đổi ảnh đại diện"
              className="avatar-upload-wrap"
            >
              <Avatar name={user.displayName} seed={user.id} url={user.avatarUrl} size={72} />
              <div className="avatar-overlay" style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '18px' }}>{user.displayName}</div>
                {!isEditingName && (
                  <button className="icon-btn tooltip-wrap" onClick={() => setIsEditingName(true)} style={{ width: '28px', height: '28px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                    <span className="tooltip tooltip-bottom">Đổi tên hiển thị</span>
                  </button>
                )}
              </div>
              <div className="muted">{user.email}</div>
            </div>
          </div>

          <style>{`
            .avatar-upload-wrap:hover .avatar-overlay {
              opacity: 1 !important;
            }
          `}</style>

          {isEditingName && (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px', color: 'var(--muted)' }}>TÊN HIỂN THỊ MỚI</label>
              <input className="field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Tên hiển thị" autoFocus />
            </div>
          )}

          {!isChangingPassword ? (
            <div>
              <button className="btn btn-ghost" onClick={() => setIsChangingPassword(true)} style={{ padding: '8px 12px', marginLeft: '-12px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                Thay đổi mật khẩu
              </button>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px', color: 'var(--muted)' }}>ĐỔI MẬT KHẨU</label>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input className="field" type={showPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Mật khẩu hiện tại" style={{ paddingRight: '40px' }} autoFocus />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', display: 'flex' }}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input className="field" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mật khẩu mới" style={{ paddingRight: '40px' }} />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', display: 'flex' }}>
                  {showNewPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && <div className="error">{error}</div>}
          {success && <div className="success-msg">{success}</div>}

          {isEditing && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button className="btn btn-ghost" onClick={handleCancel} disabled={busy} style={{ flex: 1 }}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={busy} style={{ flex: 1 }}>
                {busy ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
