import React, { useState } from "react";
import { timeHM, dateLabel } from "../lib/format";
import Avatar from "./Avatar";
import StatusTicks from "./StatusTicks";
import type { Message, ConversationMemberLite } from "../types";
import { FileAttachment, ImageAttachment, VideoAttachment, AudioAttachment } from "./MessageAttachments";

interface MessageBubbleProps {
  message: Message;
  mine: boolean;
  isLast: boolean;
  seen: boolean;
  convMembers: ConversationMemberLite[];
  editingMessageId: string | null;
  editContent: string;
  setEditingMessageId: (id: string | null) => void;
  setEditContent: (content: string) => void;
  saveEditMessage: () => void;
  handleDeleteMessage: (id: string) => void;
  retryMessage: (id: string) => void;
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

export default function MessageBubble({
  message: m,
  mine,
  isLast,
  seen,
  convMembers,
  editingMessageId,
  editContent,
  setEditingMessageId,
  setEditContent,
  saveEditMessage,
  handleDeleteMessage,
  retryMessage
}: MessageBubbleProps) {
  const sender = convMembers.find(member => member.id === m.senderId);
  const senderName = mine ? "Tôi" : (sender?.displayName || "Unknown");
  const senderAvatar = sender?.avatarUrl || null;

  return (
    <div className={mine ? "row sent" : "row recv"} style={{ opacity: m.status === 'failed' ? 0.8 : 1 }}>
      {!mine && <div className="gutter"><Avatar name={senderName} seed={m.senderId} url={senderAvatar} size={30} /></div>}
      <div className="stack">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className={m.status === 'failed' ? "bubble-wrap error" : "bubble-wrap"}>
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
                  {(!m.type || m.type === "TEXT") && renderMessageContent(m.content, convMembers)}

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
    </div>
  );
}
