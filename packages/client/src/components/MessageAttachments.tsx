import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

export function FileAttachment({ fileData, mine }: { fileData: any, mine: boolean }) {
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

export function ImageAttachment({ url }: { url: string }) {
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

export function VideoAttachment({ url }: { url: string }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)', maxWidth: '280px', backgroundColor: '#000' }}>
      <video src={url} controls style={{ display: 'block', width: '100%', maxHeight: '280px', objectFit: 'contain' }} />
    </div>
  );
}

export function AudioAttachment({ url, mine }: { url: string, mine: boolean }) {
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
