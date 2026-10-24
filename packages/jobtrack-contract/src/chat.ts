import type { ValidationResult } from './validators.ts';

export type ChatMessageSender = 'user' | 'assistant' | 'system';
export type ChatProvenance = 'n8n' | 'local_fallback' | 'system' | 'client';

export interface ChatActionReceiptDTO {
  action: string;
  success: boolean;
  summary: string;
  targetId?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}

export interface ChatMessageDTO {
  id: string;
  sender: ChatMessageSender;
  message: string;
  receipts?: ChatActionReceiptDTO[];
  provenance?: ChatProvenance;
  createdAt: string;
}

export interface ChatInputContext {
  applicationId?: string;
  pathname?: string;
  selectedJobTitle?: string;
  [key: string]: unknown;
}

export interface ChatInputDTO {
  message: string;
  sessionId?: string;
  context?: ChatInputContext;
}

export interface ChatResponseDTO {
  reply: string;
  sessionId: string;
  receipts?: ChatActionReceiptDTO[];
  provenance: ChatProvenance;
  suggestedPrompts?: string[];
  timestamp: string;
}

export interface ChatHistoryDTO {
  sessionId: string;
  messages: ChatMessageDTO[];
  total: number;
}

export const DEFAULT_SUGGESTED_CHAT_PROMPTS: readonly string[] = [
  'Hôm nay tôi có lịch phỏng vấn nào không?',
  'Tóm tắt tình hình các hồ sơ đang ở vòng Phỏng vấn',
  'Gợi ý bước tiếp theo cho các hồ sơ chưa phản hồi quá 7 ngày',
  'Tạo giúp tôi hồ sơ ứng tuyển mới tại FPT Software'
] as const;

export function validateChatInput(raw: unknown): ValidationResult<ChatInputDTO> {
  const errors: Record<string, string> = {};

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      errors: { root: 'Dữ liệu yêu cầu phải là một đối tượng hợp lệ' },
      message: 'Dữ liệu đầu vào không hợp lệ'
    };
  }

  const record = raw as Record<string, unknown>;
  const rawMessage = record.message;

  if (typeof rawMessage !== 'string') {
    errors.message = 'Nội dung tin nhắn bắt buộc phải là chuỗi ký tự';
  } else {
    const trimmed = rawMessage.trim();
    if (trimmed.length === 0) {
      errors.message = 'Nội dung tin nhắn không được để trống';
    } else if (trimmed.length > 2000) {
      errors.message = 'Nội dung tin nhắn vượt quá giới hạn 2,000 ký tự';
    }
  }

  let sessionId: string | undefined = undefined;
  if (record.sessionId !== undefined && record.sessionId !== null) {
    if (typeof record.sessionId !== 'string') {
      errors.sessionId = 'Mã phiên (sessionId) phải là chuỗi ký tự';
    } else {
      const trimmedSession = record.sessionId.trim();
      if (trimmedSession.length > 120) {
        errors.sessionId = 'Mã phiên không được vượt quá 120 ký tự';
      } else if (trimmedSession.length > 0) {
        sessionId = trimmedSession;
      }
    }
  }

  let context: ChatInputContext | undefined = undefined;
  if (record.context !== undefined && record.context !== null) {
    if (typeof record.context !== 'object' || Array.isArray(record.context)) {
      errors.context = 'Ngữ cảnh (context) phải là một đối tượng';
    } else {
      context = record.context as ChatInputContext;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
      message: 'Nội dung yêu cầu không hợp lệ'
    };
  }

  return {
    ok: true,
    data: {
      message: (rawMessage as string).trim(),
      ...(sessionId ? { sessionId } : {}),
      ...(context ? { context } : {})
    }
  };
}

export type ChatMarkdownBlockType =
  | 'heading'
  | 'bullet_list'
  | 'numbered_list'
  | 'code_block'
  | 'paragraph';

export interface ChatMarkdownBlock {
  type: ChatMarkdownBlockType;
  content: string;
  level?: number;
  items?: string[];
}

export function parseChatMarkdown(text: string): ChatMarkdownBlock[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ChatMarkdownBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().length === 0) {
      i++;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++;
      }
      blocks.push({
        type: 'code_block',
        content: codeLines.join('\n')
      });
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2].trim()
      });
      i++;
      continue;
    }

    const isBullet = /^[-*•]\s+(.*)$/.test(line.trim());
    if (isBullet) {
      const items: string[] = [];
      while (i < lines.length) {
        const itemMatch = lines[i].trim().match(/^[-*•]\s+(.*)$/);
        if (itemMatch) {
          items.push(itemMatch[1].trim());
          i++;
        } else if (lines[i].trim().length === 0) {
          break;
        } else {
          break;
        }
      }
      blocks.push({
        type: 'bullet_list',
        content: items.join('\n'),
        items
      });
      continue;
    }

    const isNumbered = /^\d+\.\s+(.*)$/.test(line.trim());
    if (isNumbered) {
      const items: string[] = [];
      while (i < lines.length) {
        const numMatch = lines[i].trim().match(/^\d+\.\s+(.*)$/);
        if (numMatch) {
          items.push(numMatch[1].trim());
          i++;
        } else if (lines[i].trim().length === 0) {
          break;
        } else {
          break;
        }
      }
      blocks.push({
        type: 'numbered_list',
        content: items.join('\n'),
        items
      });
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i];
      if (cur.trim().length === 0) {
        break;
      }
      if (
        cur.trim().startsWith('```') ||
        /^#{1,6}\s+/.test(cur.trim()) ||
        /^[-*•]\s+/.test(cur.trim()) ||
        /^\d+\.\s+/.test(cur.trim())
      ) {
        break;
      }
      paragraphLines.push(cur.trim());
      i++;
    }

    blocks.push({
      type: 'paragraph',
      content: paragraphLines.join(' ')
    });
  }

  return blocks;
}
