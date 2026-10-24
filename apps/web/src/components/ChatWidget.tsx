import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, LoaderCircle, RefreshCw, Calendar, CheckSquare, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { chatRepository, type ChatActionReceiptDTO, type ChatMessageDTO } from '../data';
import { parseChatMarkdown, DEFAULT_SUGGESTED_CHAT_PROMPTS } from '../domain';

interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  receipts?: ChatActionReceiptDTO[];
  provenance?: 'n8n' | 'local_fallback' | 'system' | 'client';
}

interface ChatWidgetProps {
  onNavigate?: (hash: string) => void;
  onRefreshApps?: () => void;
}

function renderInlineFormatting(text: string) {
  const parts: (string | React.ReactNode)[] = [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index));
    }
    parts.push(<strong key={match.index}>{match[1]}</strong>);
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }
  return parts.length > 0 ? parts : text;
}

function renderMessageContent(text: string) {
  const blocks = parseChatMarkdown(text);
  if (blocks.length === 0) {
    return <p className="chat-md-paragraph">{renderInlineFormatting(text)}</p>;
  }

  return (
    <div className="chat-markdown-body">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <h4 key={idx} className="chat-md-heading">
              {block.content}
            </h4>
          );
        }
        if (block.type === 'bullet_list') {
          return (
            <ul key={idx} className="chat-md-list">
              {block.items?.map((item, itemIdx) => (
                <li key={itemIdx}>{renderInlineFormatting(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'numbered_list') {
          return (
            <ol key={idx} className="chat-md-list-num">
              {block.items?.map((item, itemIdx) => (
                <li key={itemIdx}>{renderInlineFormatting(item)}</li>
              ))}
            </ol>
          );
        }
        if (block.type === 'code_block') {
          return (
            <pre key={idx} className="chat-md-code">
              <code>{block.content}</code>
            </pre>
          );
        }
        return (
          <p key={idx} className="chat-md-paragraph">
            {renderInlineFormatting(block.content)}
          </p>
        );
      })}
    </div>
  );
}

export default function ChatWidget({ onRefreshApps }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Xin chào! Tôi là trợ lý JobTrack AI với quyền Full Control. Tôi có thể giúp bạn theo dõi deadline, lên lịch phỏng vấn, tóm tắt công việc hôm nay hoặc quản lý hồ sơ.',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      provenance: 'local_fallback'
    }
  ]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<readonly string[]>(DEFAULT_SUGGESTED_CHAT_PROMPTS);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      void (async () => {
        try {
          const res = await chatRepository.getHistory();
          if (res && res.messages && res.messages.length > 0) {
            const mapped: ChatMessageItem[] = res.messages.map((m: ChatMessageDTO) => ({
              id: m.id,
              sender: m.sender === 'user' ? 'user' : 'assistant',
              text: m.message,
              timestamp: new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              receipts: m.receipts,
              provenance: m.provenance
            }));
            setMessages(mapped);
          }
        } catch {
        }
      })();
    }
  }, [open]);

  async function handleReset() {
    try {
      await chatRepository.clearHistory();
    } catch {
    }
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: 'Cuộc trò chuyện đã được làm mới. Tôi có thể hỗ trợ gì cho bạn?',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        provenance: 'local_fallback'
      }
    ]);
  }

  async function handleSend(textToSend?: string) {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessageItem = {
      id: crypto.randomUUID(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatRepository.chat(text);
      const replyText = response.reply || 'Đã nhận yêu cầu.';

      const botMsg: ChatMessageItem = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        receipts: response.receipts,
        provenance: response.provenance
      };

      setMessages((prev) => [...prev, botMsg]);
      if (response.suggestedPrompts && response.suggestedPrompts.length > 0) {
        setSuggestedPrompts(response.suggestedPrompts);
      }
      if (onRefreshApps) {
        onRefreshApps();
      }
    } catch (err) {
      const errorMsg: ChatMessageItem = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: `Rất tiếc, đã có lỗi kết nối: ${(err as Error).message || 'Không thể gửi tin nhắn.'}`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        provenance: 'local_fallback'
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  const quickPromptsConfig = [
    { label: 'Hôm nay làm gì?', icon: Calendar, prompt: 'Hôm nay tôi cần làm gì? Tóm tắt các deadline và lịch phỏng vấn sắp tới.' },
    { label: 'Chuẩn bị phỏng vấn', icon: CheckSquare, prompt: 'Chuẩn bị phỏng vấn cho các hồ sơ đang trong vòng Interview.' },
    { label: 'Hồ sơ lâu chưa cập nhật', icon: Clock, prompt: 'Kiểm tra xem có hồ sơ nào lâu chưa cập nhật hoặc cần follow-up không?' },
    { label: 'Nháp thư follow-up', icon: FileText, prompt: 'Viết nháp một email follow-up lịch sự hỏi về kết quả phỏng vấn.' }
  ];

  return (
    <aside aria-label="Khung trò chuyện với trợ lý JobTrack AI" className="chat-widget-root">
      {!open ? (
        <button
          className="chat-fab-button"
          onClick={() => setOpen(true)}
          aria-label="Mở trợ lý JobTrack AI"
          title="Trợ lý JobTrack AI"
        >
          <Sparkles size={22} />
          <span>Trợ lý AI</span>
        </button>
      ) : (
        <div className="chat-drawer" role="dialog" aria-label="Hộp thoại trợ lý AI">
          <header className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">
                <Bot size={20} />
              </div>
              <div>
                <strong>JobTrack AI</strong>
                <span className="chat-badge">Full Control</span>
              </div>
            </div>
            <div className="chat-header-actions">
              <button
                className="icon-button"
                aria-label="Làm mới cuộc trò chuyện"
                title="Làm mới"
                onClick={() => void handleReset()}
              >
                <RefreshCw size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Đóng trợ lý AI"
                title="Đóng"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="chat-messages" tabIndex={0} aria-live="polite">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble-container ${msg.sender === 'user' ? 'chat-user' : 'chat-assistant'}`}
              >
                <div className="chat-bubble">
                  {renderMessageContent(msg.text)}

                  {msg.receipts && msg.receipts.length > 0 && (
                    <div className="chat-receipts-list">
                      {msg.receipts.map((rcpt, rIdx) => (
                        <div key={rIdx} className="chat-receipt-chip">
                          <CheckCircle2 size={12} />
                          <span>{rcpt.summary}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="chat-bubble-footer">
                    {msg.sender === 'assistant' && msg.provenance && (
                      <span className={`chat-prov-tag chat-prov-${msg.provenance}`}>
                        {msg.provenance === 'n8n' ? 'n8n Agent' : 'JobTrack Core'}
                      </span>
                    )}
                    <span className="chat-time">{msg.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-bubble-container chat-assistant">
                <div className="chat-bubble chat-loading-bubble">
                  <LoaderCircle className="spin" size={16} />
                  <span>JobTrack AI đang xử lý…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-quick-prompts">
            {quickPromptsConfig.map((q, idx) => {
              const Icon = q.icon;
              return (
                <button
                  key={idx}
                  className="quick-prompt-chip"
                  onClick={() => void handleSend(q.prompt)}
                  disabled={loading}
                >
                  <Icon size={13} />
                  <span>{q.label}</span>
                </button>
              );
            })}
          </div>

          <form
            className="chat-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <input
              type="text"
              placeholder="Hỏi AI hoặc giao việc: 'Xem deadline', 'Sửa ghi chú'…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={loading || !input.trim()}
              aria-label="Gửi tin nhắn"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
