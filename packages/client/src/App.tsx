import { useEffect, useState } from "react";
import { useStore } from "./store";
import { api, getToken, clearToken } from "./lib/api";
import { connectSocket, disconnectSocket } from "./lib/socket";
import Auth from "./features/auth/AuthPage";
import Chat from "./features/chat/ChatPage";

export default function App() {
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user }) => {
        setUser(user);
        connectSocket(token);
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
    return () => disconnectSocket();
  }, [setUser]);

  if (loading) return <div className="centered muted">Đang tải…</div>;
  return user ? <Chat /> : <Auth />;
}
