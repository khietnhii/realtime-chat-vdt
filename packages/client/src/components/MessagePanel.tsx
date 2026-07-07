import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "../store";
import { sendMessage, sendTyping, markRead, retryMessage, editMessage, deleteMessage } from "../lib/socket";
import { api } from "../lib/api";
import { timeHM, dateLabel, sameDay } from "../lib/format";
import Avatar from "./Avatar";
import StatusTicks from "./StatusTicks";
import type { Message, ConversationMemberLite } from "../types";
import EmojiPicker from "emoji-picker-react";
import GroupInfoModal from "./GroupInfoModal";

const forceDownload = async (e: React.MouseEvent, url: string, filename: string) => {
  e.preventDefault();
  e.stopPropagation();
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
  } catch (err) {
    console.error("Failed to download file", err);
    window.open(url, "_blank");
  }
};

function FileAttachment({ fileData, mine }: { fileData: any, mine: boolean }) {
  const [downloaded, setDownloaded] = useState(false);
  return (
    <a
      href={fileData.url}
      onClick={(e) => {
        setDownloaded(true);
        forceDownload(e, fileData.url, fileData.name);
      }}
      title="Tải tệp về"
      style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'inherit', textDecoration: 'none' }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 8,
        background: mine ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, wordBreak: 'break-all', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{fileData.name}</div>
        <div style={{ fontSize: '13px', opacity: 0.8 }}>{(fileData.size / 1024).toFixed(1)} KB</div>
      </div>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: downloaded
          ? (mine ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)')
          : (mine ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: mine ? '#ffffff' : 'inherit',
        marginLeft: 8, flexShrink: 0
      }}>
        {downloaded ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        )}
      </div>
    </a>
  );
}

function ImageAttachment({ url }: { url: string }) {
  const [hover, setHover] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  return (
    <>
      <div
        style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
        onClick={() => setLightbox(true)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <img src={url} alt="Attachment" style={{ maxWidth: '280px', maxHeight: '280px', borderRadius: '16px', objectFit: 'cover', display: 'block', border: '1px solid rgba(0,0,0,0.1)' }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: hover ? 'rgba(0,0,0,0.1)' : 'transparent', transition: 'background 0.2s',
          borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.5)', color: 'white', padding: '10px', borderRadius: '50%',
            opacity: hover ? 1 : 0, transition: 'opacity 0.2s', transform: hover ? 'scale(1)' : 'scale(0.8)'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
          </div>
        </div>
        <a
          href={url}
          onClick={(e) => forceDownload(e, url, url.split('/').pop() || 'image')}
          title="Tải ảnh về"
          style={{
            position: 'absolute', bottom: '10px', right: '10px',
            background: 'rgba(0,0,0,0.5)', color: 'white', width: 34, height: 34,
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: hover ? 1 : 0, transition: 'opacity 0.2s', textDecoration: 'none'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        </a>
      </div>

      {lightbox && createPortal(
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 999999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img src={url} alt="Expanded" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', cursor: 'default' }} onClick={(e) => e.stopPropagation()} />
          <button
            onClick={() => setLightbox(false)}
            style={{
              position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.5)', border: 'none',
              color: 'white', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

function VideoAttachment({ url }: { url: string }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)', maxWidth: '280px', backgroundColor: '#000' }}>
      <video src={url} controls style={{ display: 'block', width: '100%', maxHeight: '280px', objectFit: 'contain' }} />
    </div>
  );
}

function AudioAttachment({ url, mine }: { url: string, mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pos * duration;
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 16px', borderRadius: '22px',
      background: mine ? '#e63946' : '#f4f5f7',
      color: mine ? '#fff' : 'var(--ink)',
      width: '260px',
      boxShadow: mine ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
      borderBottomRightRadius: mine ? '6px' : '22px',
      borderBottomLeftRadius: !mine ? '6px' : '22px'
    }}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        onClick={togglePlay}
        style={{
          width: 36, height: 36, borderRadius: '50%', border: 'none',
          background: mine ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
          color: mine ? '#fff' : 'var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
        }}
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><polygon points="5 3 19 12 5 21 5 3" /></svg>
        )}
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div onClick={handleSeek} style={{ height: '24px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <div style={{ width: '100%', height: '4px', background: mine ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', borderRadius: '2px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress}%`, background: mine ? '#fff' : 'var(--ink)', borderRadius: '2px' }} />
            <div style={{ position: 'absolute', left: `${progress}%`, top: '50%', transform: 'translate(-50%, -50%)', width: '10px', height: '10px', borderRadius: '50%', background: mine ? '#fff' : 'var(--ink)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', zIndex: 2 }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, opacity: 0.8, marginTop: '-6px' }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

export default function MessagePanel({ conversationId }: { conversationId: string }) {
  const me = useStore((s) => s.user)!;
  const conv = useStore((s) => s.conversations.find((c) => c.id === conversationId));
  const messages = useStore((s) => s.messagesByConv[conversationId]) ?? [];
  const presence = useStore((s) => s.presence);
  const typingMap = useStore((s) => s.typingByConv[conversationId]) ?? {};
  const readMap = useStore((s) => s.readByConv[conversationId]) ?? {};
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // States for Edit / Delete Message
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  // Catch Me Up
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryMode, setSummaryMode] = useState<"recent50" | "3h" | "24h" | "custom">("recent50");
  const [summaryStartTime, setSummaryStartTime] = useState<string>("");
  const [summaryEndTime, setSummaryEndTime] = useState<string>("");

  const setActive = useStore((s) => s.setActive);
  const [text, setText] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(messages.length >= 50);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(-1);
  const [mentionFocusIndex, setMentionFocusIndex] = useState<number>(0);
  const [floatingDate, setFloatingDate] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const waveformHistoryRef = useRef<number[]>([]);
  const lastDrawTimeRef = useRef<number>(0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        if (!(event.target as Element).closest('.emoji-btn')) {
          setShowEmoji(false);
        }
      }
    }
    if (showEmoji) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmoji]);
  const isGroup = conv?.type === "GROUP";

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null || !isGroup || !conv) return [];
    const all = [{ id: "all", displayName: "all", email: "Mọi người", avatarUrl: null, lastReadMessageId: null }, ...conv.members.filter(m => m.id !== me.id)];
    return all.filter(m => m.displayName.toLowerCase().includes(mentionQuery));
  }, [mentionQuery, conv, isGroup, me.id]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    sendTyping(conversationId);

    if (!isGroup) return;

    const cursor = e.target.selectionStart || 0;
    const lastAt = val.lastIndexOf('@', cursor - 1);
    if (lastAt !== -1) {
      const charBeforeAt = lastAt === 0 ? ' ' : val[lastAt - 1];
      if (charBeforeAt === ' ' || charBeforeAt === '\n') {
        const query = val.slice(lastAt + 1, cursor);
        if (!query.includes('\n')) {
          setMentionQuery(query.toLowerCase());
          setMentionIndex(lastAt);
          setMentionFocusIndex(0);
          return;
        }
      }
    }
    setMentionQuery(null);
    setMentionIndex(-1);
  };

  const insertMention = (displayName: string) => {
    if (mentionIndex !== -1) {
      const before = text.slice(0, mentionIndex);
      const after = text.slice(mentionIndex + (mentionQuery?.length || 0) + 1);
      const newText = `${before}@${displayName} ${after}`;
      setText(newText);
      setMentionQuery(null);
      setMentionIndex(-1);
      inputRef.current?.focus();
    }
  };

  const other = conv && !isGroup ? conv.members.find((m) => m.id !== me.id) : null;
  const typingUsers = Object.entries(typingMap).filter(([uid, t]) => t && uid !== me.id).map(([uid]) => uid);
  const someoneTyping = typingUsers.length > 0;
  const memberName = (id: string) => conv?.members.find((m) => m.id === id)?.displayName ?? "Ai đó";

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior });
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
        }
      }, 100);
    }
  };

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottomRef.current = dist < 120;
    setShowScrollDown(dist > 280);

    const rows = el.querySelectorAll('.row');
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as HTMLElement;
      if (row.offsetTop + row.offsetHeight > el.scrollTop + 20) {
        const date = row.getAttribute('data-date');
        if (date) setFloatingDate(date);
        break;
      }
    }

    if (el.scrollTop < 50 && !loadingMore && hasMore) {
      loadMoreMessages();
    }

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setFloatingDate(null);
    }, 1000);
  }

  async function loadMoreMessages() {
    if (!messages.length) return;
    try {
      setLoadingMore(true);
      const oldest = messages[0].createdAt;
      const res = await api.messages(conversationId, oldest);
      if (res.messages.length > 0) {
        useStore.getState().prependMessages(conversationId, res.messages);
        setHasMore(res.nextBefore !== null);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    scrollToBottom();
    setHasMore(messages.length >= 50);
  }, [conversationId]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (nearBottomRef.current || last?.senderId === me.id) scrollToBottom();
  }, [messages.length, someoneTyping, me.id]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.senderId !== me.id) markRead(conversationId, last.id);
  }, [conversationId, messages, me.id]);

  const maxReadIndex = useMemo(() => {
    const readIds = new Set(Object.entries(readMap).filter(([uid]) => uid !== me.id).map(([, mid]) => mid));
    let maxIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (readIds.has(messages[i].id)) {
        maxIdx = i;
        break;
      }
    }
    return maxIdx;
  }, [readMap, me.id, messages]);

  function submit() {
    const content = text.trim();
    if (!content) return;
    sendMessage(conversationId, content, "TEXT");
    setText("");
    setShowEmoji(false);
  }

  async function saveEditMessage() {
    if (!editingMessageId) return;
    const content = editContent.trim();
    if (content) {
      await editMessage(conversationId, editingMessageId, content);
    }
    setEditingMessageId(null);
    setEditContent("");
  }

  function handleDeleteMessage(messageId: string) {
    setMessageToDelete(messageId);
  }

  async function confirmDeleteMessage() {
    if (messageToDelete) {
      await deleteMessage(conversationId, messageToDelete);
      setMessageToDelete(null);
    }
  }

  function openCatchMeUp() {
    setShowSummaryModal(true);
    setSummary(null);
    setLoadingSummary(false);
    setSummaryMode("recent50");
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const toLocalISO = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setSummaryStartTime(toLocalISO(yesterday));
    setSummaryEndTime(toLocalISO(now));
  }

  async function submitCatchMeUp() {
    setLoadingSummary(true);
    setSummary(null);
    try {
      let params: { mode?: string, startTime?: string, endTime?: string } = {};

      if (summaryMode === "3h") {
        params.mode = "custom";
        const d = new Date();
        d.setHours(d.getHours() - 3);
        params.startTime = d.toISOString();
      } else if (summaryMode === "24h") {
        params.mode = "custom";
        const d = new Date();
        d.setHours(d.getHours() - 24);
        params.startTime = d.toISOString();
      } else if (summaryMode === "custom") {
        params.mode = "custom";
        if (summaryStartTime) params.startTime = new Date(summaryStartTime).toISOString();
        if (summaryEndTime) params.endTime = new Date(summaryEndTime).toISOString();
      } else {
        params.mode = "recent50";
      }

      const res = await api.catchMeUp(conversationId, params);
      setSummary(res.summary);
    } catch (err: any) {
      setSummary(err.message || "Đã xảy ra lỗi khi gọi AI.");
    } finally {
      setLoadingSummary(false);
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await api.uploadAttachment(file);
      const content = res.type === "IMAGE" ? res.url : JSON.stringify({ url: res.url, name: res.name, size: res.size });
      sendMessage(conversationId, content, res.type);
      scrollToBottom();
    } catch (err: any) {
      alert("Lỗi tải lên: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      isCancelledRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioCtxRef.current) {
          audioCtxRef.current.close();
          audioCtxRef.current = null;
        }

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());

        if (!isCancelledRef.current) {
          try {
            setUploading(true);
            const file = new File([audioBlob], "voice.webm", { type: "audio/webm" });
            const res = await api.uploadAttachment(file);
            sendMessage(conversationId, res.url, "AUDIO");
            scrollToBottom();
          } catch (err: any) {
            alert("Lỗi tải âm thanh: " + err.message);
          } finally {
            setUploading(false);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      waveformHistoryRef.current = [];
      lastDrawTimeRef.current = performance.now();

      const draw = (time: number) => {
        if (!isCancelledRef.current && mediaRecorder.state === 'recording') {
          animationFrameRef.current = requestAnimationFrame(draw);

          if (time - lastDrawTimeRef.current > 60) {
            analyser.getByteFrequencyData(dataArray);
            let maxVal = 0;
            for (let i = 0; i < bufferLength / 2; i++) {
              if (dataArray[i] > maxVal) maxVal = dataArray[i];
            }
            waveformHistoryRef.current.push(maxVal);
            lastDrawTimeRef.current = time;

            const canvas = canvasRef.current;
            if (canvas) {
              const barWidth = 1;
              const barGap = 1;
              const maxBars = Math.floor(canvas.width / (barWidth + barGap));
              if (waveformHistoryRef.current.length > maxBars) {
                waveformHistoryRef.current.shift();
              }
            }
          }

          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              const barWidth = 1;
              const barGap = 1;

              ctx.lineCap = 'round';
              ctx.lineWidth = barWidth;
              ctx.strokeStyle = '#e6004b';

              let x = barWidth / 2;
              for (let i = 0; i < waveformHistoryRef.current.length; i++) {
                const value = waveformHistoryRef.current[i];
                const normalizedValue = Math.max(0, value - 5);
                const barHeight = Math.max(1, (normalizedValue / 250) * canvas.height * 0.9);
                const drawHeight = Math.min(canvas.height, barHeight);
                const y = (canvas.height - drawHeight) / 2;

                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + drawHeight);
                ctx.stroke();

                x += (barWidth + barGap);
              }
            }
          }
        }
      };
      animationFrameRef.current = requestAnimationFrame(draw);

    } catch (err) {
      alert("Không thể truy cập micro. Vui lòng cấp quyền trong trình duyệt.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isCancelledRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const isGroupOnline = isGroup && conv?.members.some(m => m.id !== me.id && presence[m.id]);

  return (
    <div className="panel">
      <header className="panel-head">
        <button className="btn btn-ghost btn-sm back-btn" onClick={() => setActive(null)} aria-label="Quay lại">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <Avatar name={conv?.name ?? "?"} seed={other?.id ?? conversationId} url={conv?.type === "GROUP" ? conv.avatarUrl : (other?.avatarUrl ?? null)} size={40} online={isGroup ? isGroupOnline : (other ? presence[other.id] : undefined)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {conv?.name}
            {isGroup && (
              <button
                className="icon-btn"
                style={{
                  width: 24,
                  height: 24,
                  background: 'var(--surface-2)',
                  color: 'var(--muted)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                onClick={() => setShowGroupInfo(true)}
                aria-label="Thông tin nhóm"
              >
                <svg style={{ display: 'block', margin: 'auto' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </button>
            )}
          </div>
          <div className={someoneTyping ? "panel-sub typing" : "panel-sub"}>
            {someoneTyping
              ? isGroup ? `${memberName(typingUsers[0])} đang soạn tin…` : "đang soạn tin…"
              : other
                ? (
                  <>
                    {other.email} •{" "}
                    <span style={{
                      color: presence[other.id] ? "#00c853" : "inherit",
                      fontWeight: presence[other.id] ? 600 : "normal"
                    }}>
                      {presence[other.id] ? "Đang hoạt động" : "Ngoại tuyến"}
                    </span>
                  </>
                )
                : (
                  <>
                    <span>
                      {conv?.members.length} thành viên
                    </span> •{" "}
                    <span style={{
                      color: isGroupOnline ? "#00c853" : "inherit",
                      fontWeight: isGroupOnline ? 600 : "normal"
                    }}>
                      {isGroupOnline ? "Đang hoạt động" : "Ngoại tuyến"}
                    </span>
                  </>
                )}
          </div>
        </div>
        {conv && (
          <button
            className="btn-ai-summary tooltip-wrap"
            onClick={openCatchMeUp}
          >
            <span style={{ fontSize: '16px' }}>✨</span> Catch Me Up
            <span className="tooltip tooltip-bottom align-right" style={{ width: '232px', whiteSpace: 'normal', lineHeight: '1.4', fontWeight: 'normal' }}>
              Trợ lý AI sẽ giúp bạn tóm tắt nội dung cuộc trò chuyện theo mốc thời gian tùy chọn cực kỳ nhanh chóng!
            </span>
          </button>
        )}
      </header>
      <div className="messages-wrap" style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {floatingDate && (
          <div className="floating-date">
            {floatingDate}
          </div>
        )}
        <div className="messages" ref={scrollRef} onScroll={onScroll}>
          {loadingMore && <div style={{ textAlign: 'center', padding: '10px', color: 'var(--muted)' }}>Đang tải thêm...</div>}
          {messages.map((m: Message, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const mine = m.senderId === me.id;

            const timeDiffPrev = prev ? new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() : 0;
            const timeDiffNext = next ? new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime() : 0;
            const breakGroupPrev = timeDiffPrev > 3600000;
            const breakGroupNext = timeDiffNext > 3600000;

            const showDivider = !prev || !sameDay(prev.createdAt, m.createdAt);
            const isFirst = showDivider || breakGroupPrev || prev.senderId !== m.senderId;
            const isLast = !next || next.senderId !== m.senderId || !sameDay(m.createdAt, next.createdAt) || breakGroupNext;
            const seen = mine && (i <= maxReadIndex);

            return (
              <div key={m.clientMsgId || m.id}>
                {showDivider && <div className="divider">{dateLabel(m.createdAt)}</div>}
                {!showDivider && breakGroupPrev && <div className="divider">{timeHM(m.createdAt)} {dateLabel(m.createdAt)}</div>}
                {m.type === "SYSTEM" ? (
                  <div className="system-message">
                    {m.content}
                  </div>
                ) : (
                  <div data-date={dateLabel(m.createdAt)} className={`row ${mine ? "mine" : "recv"} ${isFirst ? "first" : ""} ${isLast ? "last" : ""}`}>
                    {!mine && (
                      <div className="gutter">
                        {isLast && <Avatar name={memberName(m.senderId)} seed={m.senderId} url={conv?.members.find(u => u.id === m.senderId)?.avatarUrl ?? null} size={30} />}
                      </div>
                    )}
                    <div className="stack">
                      {isFirst && !mine && isGroup && <div className="sender">{memberName(m.senderId)}</div>}

                      <div className="msg-body tooltip-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: mine ? 'row-reverse' : 'row', position: 'relative' }}>
                        {m.deletedAt ? (
                          <div className="bubble tooltip-wrap msg-deleted" style={{ fontStyle: 'italic', color: 'var(--muted)', background: mine ? 'rgba(0,0,0,0.05)' : 'var(--surface-2)' }}>
                            Tin nhắn đã bị thu hồi
                          </div>
                        ) : editingMessageId === m.id ? (
                          <div className="bubble tooltip-wrap inline-edit-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '240px', background: 'var(--surface)', border: '1px solid var(--surface-2)' }}>
                            <input
                              autoFocus
                              className="input"
                              style={{ width: '100%', border: 'none', background: 'var(--surface-2)', padding: '8px 12px', borderRadius: '8px' }}
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditMessage();
                                else if (e.key === 'Escape') { setEditingMessageId(null); setEditContent(""); }
                              }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button className="btn btn-ghost btn-sm" style={{ padding: '0 8px', height: '28px', fontSize: '13px' }} onClick={() => { setEditingMessageId(null); setEditContent(""); }}>Huỷ</button>
                              <button className="btn btn-primary btn-sm" style={{ padding: '0 12px', height: '28px', fontSize: '13px', borderRadius: '14px' }} onClick={saveEditMessage}>Lưu</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className={(m.type === "IMAGE" || m.type === "VIDEO" || m.type === "AUDIO") ? "tooltip-wrap" : "bubble tooltip-wrap"}>
                              {m.type === "IMAGE" && <ImageAttachment url={m.content} />}
                              {m.type === "VIDEO" && <VideoAttachment url={m.content} />}
                              {m.type === "AUDIO" && <AudioAttachment url={m.content} mine={mine} />}
                              {m.type === "FILE" && (() => {
                                try {
                                  const fileData = JSON.parse(m.content);
                                  return <FileAttachment fileData={fileData} mine={mine} />;
                                } catch {
                                  return m.content;
                                }
                              })()}
                              {(!m.type || m.type === "TEXT") && renderMessageContent(m.content, conv?.members || [])}

                            </div>

                            {mine && (
                              <div className="msg-actions">
                                {(!m.type || m.type === 'TEXT') && (
                                  <button className="action-btn tooltip-wrap" onClick={() => { setEditingMessageId(m.id); setEditContent(m.content); }} aria-label="Chỉnh sửa">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                    <span className="tooltip tooltip-bottom">Chỉnh sửa</span>
                                  </button>
                                )}
                                <button className="action-btn tooltip-wrap" onClick={() => handleDeleteMessage(m.id)} aria-label="Thu hồi">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                  <span className="tooltip tooltip-bottom">Thu hồi</span>
                                </button>
                              </div>
                            )}

                            <span className={`tooltip delay ${mine ? "tooltip-left" : "tooltip-right"}`}>
                              {timeHM(m.createdAt)} {dateLabel(m.createdAt).toLowerCase()}
                            </span>
                          </>
                        )}
                      </div>

                      {isLast && (
                        <div className="meta">
                          <span>{timeHM(m.createdAt)}</span>
                          {mine && <StatusTicks status={m.status} seen={seen} onRetry={() => retryMessage(m.clientMsgId)} />}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {someoneTyping && (
            <div className="row recv first last">
              <div className="gutter"><Avatar name={memberName(typingUsers[0])} seed={typingUsers[0]} url={conv?.members.find(u => u.id === typingUsers[0])?.avatarUrl ?? null} size={30} /></div>
              <div className="stack"><div className="typing-bubble"><i /><i /><i /></div></div>
            </div>
          )}
        </div>
      </div>

      {showScrollDown && (
        <button className="scroll-down" onClick={() => scrollToBottom("smooth")} aria-label="Xuống cuối">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
        </button>
      )}

      <div className="panel-foot">
        {isRecording ? (
          <div className="composer" style={{ padding: '8px 16px', height: 'auto', minHeight: '52px' }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'red', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
              <div style={{ fontFamily: 'monospace', fontSize: '16px', color: 'red', fontWeight: 600, width: '48px' }}>
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: '30px' }}>
                <canvas ref={canvasRef} width={200} height={30} style={{ width: '100%', height: '100%', opacity: 0.7 }} />
              </div>
              <button className="btn btn-ghost" style={{ color: 'var(--text-secondary)' }} onClick={cancelRecording}>Huỷ</button>
              <button className="btn btn-primary" style={{ borderRadius: '20px', padding: '0 20px', height: 36, display: 'flex', alignItems: 'center', gap: '8px' }} onClick={stopRecording}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                Gửi
              </button>
            </div>
          </div>
        ) : (
          <div className="composer">
            <div className="composer-actions">
              <button className="action-icon-btn tooltip-wrap" aria-label="Đính kèm ảnh" onClick={() => imageInputRef.current?.click()}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <span className="tooltip tooltip-top align-left">Gửi hình ảnh/video</span>
              </button>
              <input type="file" accept="image/*,video/*" ref={imageInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

              <button className="action-icon-btn tooltip-wrap" aria-label="Đính kèm tài liệu" onClick={() => fileInputRef.current?.click()}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                <span className="tooltip tooltip-top">Đính kèm tệp</span>
              </button>
              <input type="file" accept="*/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

              <button className="action-icon-btn tooltip-wrap" onClick={startRecording} aria-label="Thu âm">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                <span className="tooltip tooltip-top">Ghi âm</span>
              </button>
            </div>

            {showEmoji && (
              <div className="emoji-pop" ref={emojiRef}>
                <EmojiPicker
                  onEmojiClick={(e) => setText((t) => t + e.emoji)}
                  lazyLoadEmojis={true}
                  previewConfig={{ showPreview: false }}
                  searchPlaceHolder="Tìm kiếm emoji..."
                  width={320}
                  height={400}
                />
              </div>
            )}

            <div className="field" style={{ position: 'relative', flex: 1, display: 'grid', padding: 0 }}>
              {mentionCandidates.length > 0 && (
                <div className="mention-pop" style={{ left: '16px' }}>
                  {mentionCandidates.map((u, idx) => (
                    <div key={u.id} className={`mention-item ${idx === mentionFocusIndex ? 'focused' : ''}`} onClick={() => insertMention(u.displayName)}>
                      <Avatar name={u.displayName} seed={u.id} size={24} url={u.avatarUrl} />
                      <span style={{ fontWeight: 500 }}>{u.displayName}</span>
                      {u.email && <span className="muted small">{u.email}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* 1. Hidden div to auto-size the grid */}
              <div
                style={{
                  gridArea: '1 / 1',
                  padding: '15px 24px', paddingRight: '44px',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontSize: '15px', lineHeight: '21px', fontFamily: 'inherit',
                  minHeight: '52px', maxHeight: '120px',
                  visibility: 'hidden', pointerEvents: 'none',
                  overflow: 'hidden'
                }}
              >
                {text ? text : "Nhập tin nhắn…"}
                {'\u200B'}
              </div>

              {/* 2. Textarea */}
              <textarea
                ref={inputRef}
                rows={1}
                value={text}
                disabled={uploading}
                onFocus={() => setShowEmoji(false)}
                onChange={handleTextChange}
                onScroll={(e) => { if (overlayRef.current) overlayRef.current.scrollTop = e.currentTarget.scrollTop; }}
                onKeyDown={(e) => {
                  if (mentionCandidates.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setMentionFocusIndex(prev => (prev + 1) % mentionCandidates.length);
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setMentionFocusIndex(prev => (prev - 1 + mentionCandidates.length) % mentionCandidates.length);
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      insertMention(mentionCandidates[mentionFocusIndex].displayName);
                      return;
                    }
                  }
                  if (e.key === 'Enter') {
                    if (e.shiftKey) {
                    } else {
                      e.preventDefault();
                      submit();
                    }
                  }
                }}
                style={{
                  gridArea: '1 / 1',
                  width: '100%', height: '100%', margin: 0,
                  padding: '15px 24px', paddingRight: '44px',
                  fontFamily: 'inherit', fontSize: '15px', lineHeight: '21px',
                  color: 'transparent', caretColor: 'var(--ink)',
                  background: 'transparent', border: 'none', outline: 'none',
                  resize: 'none', overflowY: 'auto',
                  minHeight: '52px', maxHeight: '120px'
                }}
              />

              {/* 3. Overlay for Mentions */}
              <div
                ref={overlayRef}
                style={{
                  gridArea: '1 / 1',
                  pointerEvents: 'none',
                  padding: '15px 24px', paddingRight: '44px',
                  overflow: 'hidden',
                  minHeight: '52px', maxHeight: '120px',
                  fontSize: '15px', lineHeight: '21px', fontFamily: 'inherit'
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', width: '100%', color: 'var(--ink)' }}>
                  {text ? renderMessageContent(text, conv?.members || []) : <span className="muted">{uploading ? "Đang tải lên..." : "Nhập tin nhắn…"}</span>}
                  {'\u200B'}
                </div>
              </div>

              <button
                className={showEmoji ? "emoji-btn on" : "emoji-btn"}
                onClick={() => setShowEmoji((v) => !v)}
                aria-label="Biểu tượng cảm xúc"
                style={{ position: 'absolute', right: '4px', bottom: '4px', padding: '4px', margin: 0, background: 'transparent', zIndex: 10 }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" /><path d="M9 9h.01M15 9h.01" /></svg>
              </button>
            </div>

            <button className="send-btn" onClick={submit} disabled={!text.trim()} aria-label="Gửi">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
            </button>
          </div>
        )}
      </div>

      {showGroupInfo && conv && (
        <GroupInfoModal
          conversation={conv}
          onClose={() => setShowGroupInfo(false)}
          onlinePresence={presence}
        />
      )}

      {messageToDelete && (
        <div className="modal-backdrop" onClick={() => setMessageToDelete(null)} style={{ zIndex: 1100, background: 'rgba(0,0,0,0.6)' }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360, textAlign: 'center' }}>
            <h3 style={{ marginTop: 0 }}>Xác nhận</h3>
            <p>Bạn chắc chắn muốn thu hồi tin nhắn này?</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <button className="btn btn-ghost" onClick={() => setMessageToDelete(null)}>Hủy</button>
              <button className="btn btn-primary" style={{ background: 'var(--red)' }} onClick={confirmDeleteMessage}>
                Thu hồi
              </button>
            </div>
          </div>
        </div>
      )}

      {showSummaryModal && (
        <div className="modal-backdrop" onClick={() => setShowSummaryModal(false)} style={{ zIndex: 1200, background: 'rgba(0,0,0,0.6)' }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-head" style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>✨</span> Catch Me Up
              </h3>
              <button className="icon-btn" onClick={() => setShowSummaryModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {!loadingSummary && !summary ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" name="summaryMode" checked={summaryMode === "recent50"} onChange={() => setSummaryMode("recent50")} />
                      ⏱ 50 tin nhắn gần nhất
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" name="summaryMode" checked={summaryMode === "3h"} onChange={() => setSummaryMode("3h")} />
                      🕒 3 giờ qua
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" name="summaryMode" checked={summaryMode === "24h"} onChange={() => setSummaryMode("24h")} />
                      📅 24 giờ qua
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" name="summaryMode" checked={summaryMode === "custom"} onChange={() => setSummaryMode("custom")} />
                      ⚙️ Tùy chỉnh thời gian
                    </label>
                  </div>

                  {summaryMode === "custom" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', padding: '12px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Từ lúc:</span>
                        <input type="datetime-local" className="input" value={summaryStartTime} onChange={e => setSummaryStartTime(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Đến lúc:</span>
                        <input type="datetime-local" className="input" value={summaryEndTime} onChange={e => setSummaryEndTime(e.target.value)} />
                      </div>
                    </div>
                  )}

                  <button className="btn btn-primary" style={{ width: '100%', padding: '10px', fontSize: '15px' }} onClick={submitCatchMeUp}>
                    🚀 Bắt đầu tóm tắt
                  </button>
                </>
              ) : loadingSummary ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div className="typing-bubble" style={{ background: 'transparent', boxShadow: 'none' }}>
                    <i style={{ background: '#e6004b' }} />
                    <i style={{ background: '#e6004b' }} />
                    <i style={{ background: '#e6004b' }} />
                  </div>
                  <span>AI đang đọc tin nhắn...</span>
                </div>
              ) : (
                <div style={{ lineHeight: 1.6, fontSize: '15px' }}>
                  {summary?.split('\n').map((line, idx) => (
                    <div key={idx} style={{ marginBottom: line.trim() === '' ? '0' : '8px' }}>
                      {line}
                    </div>
                  ))}
                  <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <button className="btn btn-ghost" onClick={openCatchMeUp}>⬅ Chọn lại thời gian</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderMessageContent(content: string, members: ConversationMemberLite[]) {
  if (!content) return null;
  const memberNames = members.map(m => m.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  memberNames.push("all");
  const regex = new RegExp(`@(${memberNames.join('|')})`, 'g');

  const parts = content.split(regex);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <span key={i} className="mention">@{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}
