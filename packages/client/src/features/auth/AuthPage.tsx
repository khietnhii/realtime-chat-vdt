import { useState, useEffect } from "react";
import { api, setToken } from "../../lib/api";
import { connectSocket } from "../../lib/socket";
import { useStore } from "../../store";

const Mark = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20.5 11.3a8 8 0 0 1-8 8 8.4 8.4 0 0 1-3.5-.8L3.5 19.5l1-4A8 8 0 1 1 20.5 11.3Z" />
    <path d="M7.5 12h2l1.2-2.4 1.8 4.6 1.1-2.2H16.5" />
  </svg>
);

export default function Auth() {
  const setUser = useStore((s) => s.setUser);
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "verify">("login");
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ loginEmail: "", registerEmail: "", loginPassword: "", registerPassword: "", displayName: "", newPassword: "", verifyEmail: "", verifyCode: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyEmail = params.get("verifyEmail");
    const verifyCode = params.get("verifyCode");

    if (verifyEmail && verifyCode) {
      setMode("verify");
      setForm((f) => ({ ...f, verifyEmail, verifyCode }));
      window.history.replaceState({}, document.title, window.location.pathname);

      setBusy(true);
      api.verifyEmail({ email: verifyEmail, code: verifyCode })
        .then((res) => {
          setToken(res.accessToken);
          setUser(res.user);
          connectSocket(res.accessToken);
        })
        .catch((e: any) => {
          setError(e instanceof Error ? e.message : "Xác minh thất bại. Mã có thể đã hết hạn.");
        })
        .finally(() => setBusy(false));
    }
  }, [setUser]);

  const switchMode = (newMode: "login" | "register" | "forgot" | "verify") => {
    setMode(newMode);
    setForgotStep(1);
    setError("");
    setShowPassword(false);
  };

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validatePassword = (pw: string) => {
    if (pw.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự";
    if (!/[A-Z]/.test(pw)) return "Mật khẩu phải chứa ít nhất 1 chữ hoa";
    if (!/[a-z]/.test(pw)) return "Mật khẩu phải chứa ít nhất 1 chữ thường";
    if (!/[0-9]/.test(pw)) return "Mật khẩu phải chứa ít nhất 1 chữ số";
    return "";
  };

  async function submit() {
    setError("");

    if (mode === "register") {
      const trimmedName = form.displayName.trim();
      if (trimmedName.length < 2) return setError("Tên hiển thị phải có ít nhất 2 ký tự");
      if (trimmedName.length > 32) return setError("Tên hiển thị không được vượt quá 32 ký tự");
      if (!form.registerEmail.includes("@")) return setError("Email không đúng định dạng");
      const pwErr = validatePassword(form.registerPassword);
      if (pwErr) return setError(pwErr);
    } else if (mode === "login") {
      if (!form.loginEmail.trim()) return setError("Vui lòng nhập Email");
      if (!form.loginPassword) return setError("Vui lòng nhập Mật khẩu");
    } else if (mode === "forgot") {
      if (forgotStep === 1 && !form.loginEmail.includes("@")) return setError("Email không đúng định dạng");
      if (forgotStep === 2) {
        const pwErr = validatePassword(form.newPassword);
        if (pwErr) return setError(pwErr);
      }
    } else if (mode === "verify") {
      if (form.verifyCode.length !== 6) return setError("Vui lòng nhập đủ 6 chữ số");
    }

    setBusy(true);
    try {
      if (mode === "forgot") {
        if (forgotStep === 1) {
          await api.checkEmail(form.loginEmail);
          setForgotStep(2);
          setError("");
          setBusy(false);
          return;
        } else {
          await api.resetPassword({ email: form.loginEmail, newPassword: form.newPassword });
          switchMode("login");
          setForm((f) => ({ ...f, loginPassword: form.newPassword }));
          setError("Đổi mật khẩu thành công! Vui lòng đăng nhập.");
          setBusy(false);
          return;
        }
      }

      if (mode === "verify") {
        const res = await api.verifyEmail({ email: form.verifyEmail, code: form.verifyCode });
        setToken(res.accessToken);
        setUser(res.user);
        connectSocket(res.accessToken);
        return;
      }

      const res =
        mode === "login"
          ? await api.login({ email: form.loginEmail, password: form.loginPassword })
          : await api.register({
            email: form.registerEmail,
            password: form.registerPassword,
            displayName: form.displayName,
          });

      if (res.requiresVerification && res.email) {
        setForm((f) => ({ ...f, verifyEmail: res.email!, verifyCode: "" }));
        switchMode("verify");
        setError("Vui lòng kiểm tra email để lấy mã xác nhận.");
        return;
      }

      if (res.accessToken && res.user) {
        setToken(res.accessToken);
        setUser(res.user);
        connectSocket(res.accessToken);
      }
    } catch (e: any) {
      if (e.message?.includes("Tài khoản chưa được xác minh") && form.loginEmail) {
        setForm((f) => ({ ...f, verifyEmail: form.loginEmail, verifyCode: "" }));
        switchMode("verify");
        setError("Vui lòng xác minh email trước khi đăng nhập.");
      } else {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    } finally {
      setBusy(false);
    }
  }

  const brand = (
    <div className="brand">
      <div className="brand-mark"><Mark /></div>
      <div className="brand-name">Pulse Chat</div>
    </div>
  );

  return (
    <div className="auth-split">
      <div className="auth-hero">
        {brand}
        <div className="hero-body">
          <h1 className="hero-headline">Kết nối mọi khoảnh khắc, trò chuyện không giới hạn.</h1>
          <p className="hero-sub">
            Trải nghiệm nhắn tin mượt mà, siêu tốc và ổn định. Dù bạn ở đâu, Pulse Chat luôn giữ cho những cuộc trò chuyện của bạn liền mạch và sống động nhất.
          </p>
          <div className="hero-chips">
            <span className="hero-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" /></svg>
              Siêu tốc
            </span>
            <span className="hero-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>
              Không gián đoạn
            </span>
            <span className="hero-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 7-7" /><path d="M17 7h4v4" /></svg>
              Trải nghiệm mượt mà
            </span>
          </div>

          <div className="hero-preview" aria-hidden>
            <div className="hp-row"><span className="hp-av">🐣</span><div className="hp-bubble">Web này mượt thật sự, nhắn cái qua luôn! 🚀</div></div>
            <div className="hp-row mine"><div className="hp-bubble mine">Đúng rồi, giao diện nhìn cũng xịn xò nữa ✨</div></div>
            <div className="hp-row"><span className="hp-av">🐣</span><div className="hp-typing"><i /><i /><i /></div></div>
          </div>
        </div>
        <div className="hero-foot">© 2026 Pulse Chat · Realtime Messaging</div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-mini-brand">{brand}</div>
          <div>
            <h2 className="auth-title">
              {mode === "login" ? "Chào mừng trở lại!" : mode === "forgot" ? "Đổi mật khẩu mới" : mode === "verify" ? "Xác minh Email" : "Tạo tài khoản"}
            </h2>
            <p className="auth-lead">
              {mode === "login"
                ? "Đăng nhập để tiếp tục trò chuyện"
                : mode === "forgot"
                  ? (forgotStep === 1 ? "Nhập email của bạn để tạo mật khẩu mới" : "Thiết lập mật khẩu mới cho tài khoản")
                  : mode === "verify"
                    ? `Vui lòng nhập mã OTP đã được gửi đến ${form.verifyEmail}`
                    : "Chỉ vài bước để bắt đầu"}
            </p>
          </div>

          {mode !== "forgot" && mode !== "verify" && (
            <div className="tabs">
              <button className={mode === "login" ? "tab active" : "tab"} onClick={() => switchMode("login")}>Đăng nhập</button>
              <button className={mode === "register" ? "tab active" : "tab"} onClick={() => switchMode("register")}>Đăng ký</button>
            </div>
          )}

          {mode === "register" && (
            <>
              <input className="field" placeholder="Tên hiển thị (VD: Hoàng Nam)" value={form.displayName} onChange={(e) => update("displayName", e.target.value)} />
              <div className="password-hint" style={{ marginBottom: '0px' }}>Sẽ được hiển thị với mọi người (2-32 ký tự)</div>
              <input className="field" placeholder="Email" value={form.registerEmail} onChange={(e) => update("registerEmail", e.target.value)} />
              <div style={{ position: 'relative' }}>
                <input className="field" type={showPassword ? "text" : "password"} placeholder="Mật khẩu" value={form.registerPassword} onChange={(e) => update("registerPassword", e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} style={{ paddingRight: '40px' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', display: 'flex' }} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              <div className="password-hint">Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số</div>
            </>
          )}
          {mode === "login" && (
            <>
              <input className="field" placeholder="Email" value={form.loginEmail} onChange={(e) => update("loginEmail", e.target.value)} />
              <div style={{ position: 'relative' }}>
                <input className="field" type={showPassword ? "text" : "password"} placeholder="Mật khẩu" value={form.loginPassword} onChange={(e) => update("loginPassword", e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} style={{ paddingRight: '40px' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', display: 'flex' }} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>

              <div className="auth-options" style={{ justifyContent: 'flex-end' }}>
                <button className="text-btn" onClick={() => switchMode("forgot")}>Quên mật khẩu?</button>
              </div>
            </>
          )}
          {mode === "forgot" && forgotStep === 1 && (
            <>
              <input className="field" placeholder="Email đăng ký" value={form.loginEmail} onChange={(e) => update("loginEmail", e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            </>
          )}
          {mode === "forgot" && forgotStep === 2 && (
            <>
              <div style={{ position: 'relative' }}>
                <input className="field" type={showPassword ? "text" : "password"} placeholder="Mật khẩu mới" value={form.newPassword} onChange={(e) => update("newPassword", e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} style={{ paddingRight: '40px' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', display: 'flex' }} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              <div className="password-hint">Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số</div>
            </>
          )}

          {mode === "verify" && (
            <>
              <input className="field" placeholder="Nhập 6 số OTP" value={form.verifyCode} onChange={(e) => update("verifyCode", e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} onKeyDown={(e) => e.key === "Enter" && submit()} style={{ marginBottom: '16px', textAlign: 'center', letterSpacing: '4px', fontSize: '18px' }} />
            </>
          )}

          {error && <div className={error.includes("thành công") ? "success-msg" : "error"} style={{ marginBottom: '16px' }}>{error.replace("thành công: ", "")}</div>}

          <button className="btn btn-primary btn-block" disabled={busy} onClick={submit}>
            {busy ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : mode === "forgot" && forgotStep === 1 ? "Tiếp tục" : mode === "forgot" && forgotStep === 2 ? "Xác nhận đổi" : mode === "verify" ? "Xác minh" : "Tạo tài khoản"}
          </button>

          {mode === "verify" && (
            <div className="auth-options" style={{ justifyContent: 'center', marginTop: '16px' }}>
              <button className="text-btn" onClick={async () => {
                try {
                  setBusy(true);
                  await api.resendVerification(form.verifyEmail);
                  setError("thành công: Đã gửi lại mã OTP vào email của bạn.");
                } catch (e: any) {
                  setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
                } finally {
                  setBusy(false);
                }
              }} disabled={busy}>Gửi lại mã</button>
            </div>
          )}

          {mode === "forgot" && (
            <button className="btn btn-block text-btn" style={{ marginTop: '16px', display: 'block', margin: '16px auto 0' }} onClick={() => switchMode("login")}>
              Quay lại đăng nhập
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
