import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, LoaderCircle, RefreshCw, Calendar, CheckSquare, Clock, FileText } from 'lucide-react';
import { repository } from '../data';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionReceipt?: {
    tool?: string;
    details?: string;
  };
}

interface ChatWidgetProps {
  onNavigate?: (hash: string) => void;
  onRefreshApps?: () => void;
}

export default function ChatWidget({ onNavigate, onRefreshApps }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Xin chào! Tôi là trợ lý JobTrack AI với quyền Full Control. Tôi có thể giúp bạn theo dõi deadline, lên lịch phỏng vấn, tóm tắt công việc hôm nay hoặc nhập tin từ đường dẫn tuyển dụng.',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  async function handleSend(textToSend?: string) {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await repository.chat(text);
      const replyText = response.output || response.text || 'Đã nhận yêu cầu.';

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
      // If AI did mutations, notify app to refresh
      if (onRefreshApps) {
        onRefreshApps();
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: `Rất tiếc, đã có lỗi kết nối: ${(err as Error).message || 'Không thể gửi tin nhắn.'}`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  const quickPrompts = [
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
                onClick={() =>
                  setMessages([
                    {
                      id: 'welcome-reset',
                      sender: 'assistant',
                      text: 'Cuộc trò chuyện đã được làm mới. Tôi có thể hỗ trợ gì cho bạn?',
                      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                    }
                  ])
                }
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
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`chat-bubble-container ${msg.sender === 'user' ? 'chat-user' : 'chat-assistant'}`}
              >
                <div className="chat-bubble">
                  <p>{msg.text}</p>
                  <span className="chat-time">{msg.timestamp}</span>
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
            {quickPrompts.map((q, idx) => {
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
            onSubmit={e => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <input
              type="text"
              placeholder="Hỏi AI hoặc giao việc: 'Xem deadline', 'Sửa ghi chú'…"
              value={input}
              onChange={e => setInput(e.target.value)}
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
