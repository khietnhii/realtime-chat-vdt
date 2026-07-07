import type { SendStatus } from "../types";

export default function StatusTicks({
  status,
  seen,
  onRetry,
}: {
  status?: SendStatus;
  seen: boolean;
  onRetry: () => void;
}) {
  if (status === "sending") {
    return (
      <span className="ticks" title="Đang gửi" aria-label="Đang gửi">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="9" opacity="0.35" />
          <path d="M12 7v5l3 2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <button className="retry" onClick={onRetry}>
        Gửi lỗi · thử lại
      </button>
    );
  }
  return (
    <span className={seen ? "ticks seen" : "ticks"} aria-label={seen ? "Đã xem" : "Đã gửi"}>
      <svg width="16" height="12" viewBox="0 0 20 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6.5l3.2 3.2L11 3" />
        {seen && <path d="M9 9.7L9.6 9.2 14.8 3" />}
      </svg>
    </span>
  );
}
