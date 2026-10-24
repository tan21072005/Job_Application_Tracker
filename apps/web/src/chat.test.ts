import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseChatMarkdown,
  DEFAULT_SUGGESTED_CHAT_PROMPTS
} from './domain';
import { chatRepository, repository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Chat Intake & Automation Integration', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Markdown Parsing & Suggested Prompts', () => {
    it('parses headings, lists, and paragraphs accurately', () => {
      const markdown = `# Thông báo
## Vòng phỏng vấn
- Shopee: Kỹ thuật
* VNG: HR interview
1. Chuẩn bị CV
2. Ôn tập thuật toán

Ghi chú cuối cùng.`;

      const blocks = parseChatMarkdown(markdown);
      expect(blocks.length).toBeGreaterThanOrEqual(4);

      const h1 = blocks.find(b => b.type === 'heading' && b.level === 1);
      expect(h1).toBeDefined();
      expect(h1?.content).toBe('Thông báo');

      const bulletList = blocks.find(b => b.type === 'bullet_list');
      expect(bulletList).toBeDefined();
      expect(bulletList?.items?.length).toBe(2);

      const numList = blocks.find(b => b.type === 'numbered_list');
      expect(numList).toBeDefined();
      expect(numList?.items?.length).toBe(2);
    });

    it('exposes default suggested prompts with Vietnamese queries', () => {
      expect(DEFAULT_SUGGESTED_CHAT_PROMPTS.length).toBeGreaterThanOrEqual(3);
      expect(DEFAULT_SUGGESTED_CHAT_PROMPTS.some(p => p.includes('phỏng vấn'))).toBe(true);
    });
  });

  describe('chatRepository in Demo Mode', () => {
    it('generates grounded responses and persists history in localStorage', async () => {
      const response = await chatRepository.chat('Hôm nay tôi cần làm gì?', 'ses-demo-1');
      expect(response.reply).toBeDefined();
      expect(response.reply).toContain('Kế hoạch');
      expect(response.provenance).toBe('local_fallback');
      expect(response.sessionId).toBe('ses-demo-1');

      const history = await chatRepository.getHistory('ses-demo-1');
      expect(history.total).toBe(2);
      expect(history.messages[0].sender).toBe('user');
      expect(history.messages[0].message).toBe('Hôm nay tôi cần làm gì?');
      expect(history.messages[1].sender).toBe('assistant');
    });

    it('clears session history accurately without affecting other sessions', async () => {
      await chatRepository.chat('Tin nhắn 1', 'ses-a');
      await chatRepository.chat('Tin nhắn 2', 'ses-b');

      const historyBeforeA = await chatRepository.getHistory('ses-a');
      const historyBeforeB = await chatRepository.getHistory('ses-b');
      expect(historyBeforeA.total).toBe(2);
      expect(historyBeforeB.total).toBe(2);

      const clearRes = await chatRepository.clearHistory('ses-a');
      expect(clearRes.success).toBe(true);
      expect(clearRes.cleared).toBe(2);

      const historyAfterA = await chatRepository.getHistory('ses-a');
      expect(historyAfterA.total).toBe(0);

      const historyAfterB = await chatRepository.getHistory('ses-b');
      expect(historyAfterB.total).toBe(2);
    });

    it('maintains backwards compatibility via repository.chat', async () => {
      const res = await repository.chat('Xin chào');
      expect(res.output).toBeDefined();
      expect(res.text).toBeDefined();
      expect(res.reply).toBeDefined();
    });
  });
});
