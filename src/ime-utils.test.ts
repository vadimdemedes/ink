import {describe, it, expect} from 'vitest';
import {isIMEInput, IMECompositionBuffer} from '../ime-utils.js';

describe('isIMEInput', () => {
  describe('ASCII input', () => {
    it('returns false for empty string', () => {
      expect(isIMEInput('')).toBe(false);
    });

    it('returns false for single ASCII character', () => {
      expect(isIMEInput('a')).toBe(false);
      expect(isIMEInput('Z')).toBe(false);
      expect(isIMEInput('5')).toBe(false);
      expect(isIMEInput(' ')).toBe(false);
    });

    it('returns false for ASCII string', () => {
      expect(isIMEInput('hello')).toBe(false);
      expect(isIMEInput('Hello World')).toBe(false);
    });
  });

  describe('Vietnamese input', () => {
    it('returns true for Vietnamese precomposed characters', () => {
      expect(isIMEInput('à')).toBe(true);
      expect(isIMEInput('ă')).toBe(true);
      expect(isIMEInput('â')).toBe(true);
      expect(isIMEInput('đ')).toBe(true);
      expect(isIMEInput('ê')).toBe(true);
      expect(isIMEInput('ô')).toBe(true);
      expect(isIMEInput('ơ')).toBe(true);
      expect(isIMEInput('ư')).toBe(true);
    });

    it('returns true for Vietnamese words', () => {
      expect(isIMEInput('xin chào')).toBe(true);
      expect(isIMEInput('Việt Nam')).toBe(true);
      expect(isIMEInput('cảm ơn')).toBe(true);
    });

    it('returns true for combining diacritical marks', () => {
      // a + combining acute accent
      expect(isIMEInput('a\u0301')).toBe(true);
      // e + combining circumflex
      expect(isIMEInput('e\u0302')).toBe(true);
    });
  });

  describe('Chinese input', () => {
    it('returns true for CJK characters', () => {
      expect(isIMEInput('中')).toBe(true);
      expect(isIMEInput('国')).toBe(true);
      expect(isIMEInput('你好')).toBe(true);
      expect(isIMEInput('谢谢')).toBe(true);
    });
  });

  describe('Japanese input', () => {
    it('returns true for Hiragana', () => {
      expect(isIMEInput('あ')).toBe(true);
      expect(isIMEInput('こんにちは')).toBe(true);
    });

    it('returns true for Katakana', () => {
      expect(isIMEInput('ア')).toBe(true);
      expect(isIMEInput('コンピューター')).toBe(true);
    });
  });

  describe('Korean input', () => {
    it('returns true for Hangul', () => {
      expect(isIMEInput('한')).toBe(true);
      expect(isIMEInput('안녕하세요')).toBe(true);
    });
  });

  describe('Other languages', () => {
    it('returns true for Thai', () => {
      expect(isIMEInput('สวัสดี')).toBe(true);
    });

    it('returns true for Arabic', () => {
      expect(isIMEInput('مرحبا')).toBe(true);
    });

    it('returns true for Hindi (Devanagari)', () => {
      expect(isIMEInput('नमस्ते')).toBe(true);
    });
  });
});

describe('IMECompositionBuffer', () => {
  it('buffers input and flushes after timeout', async () => {
    const flushed: string[] = [];
    const buffer = new IMECompositionBuffer({
      timeout: 50,
      onFlush: (text) => flushed.push(text),
    });

    buffer.add('x');
    buffer.add('i');
    buffer.add('n');

    expect(flushed).toHaveLength(0);
    expect(buffer.hasContent()).toBe(true);
    expect(buffer.getContent()).toBe('xin');

    // Wait for flush
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toBe('xin');
    expect(buffer.hasContent()).toBe(false);

    buffer.destroy();
  });

  it('flushes immediately when flush() is called', () => {
    const flushed: string[] = [];
    const buffer = new IMECompositionBuffer({
      timeout: 1000,
      onFlush: (text) => flushed.push(text),
    });

    buffer.add('chào');
    expect(flushed).toHaveLength(0);

    buffer.flush();
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toBe('chào');

    buffer.destroy();
  });

  it('handles backspace correctly', () => {
    const flushed: string[] = [];
    const buffer = new IMECompositionBuffer({
      timeout: 1000,
      onFlush: (text) => flushed.push(text),
    });

    buffer.add('xin');
    expect(buffer.getContent()).toBe('xin');

    expect(buffer.backspace()).toBe(true);
    expect(buffer.getContent()).toBe('xi');

    expect(buffer.backspace()).toBe(true);
    expect(buffer.getContent()).toBe('x');

    expect(buffer.backspace()).toBe(true);
    expect(buffer.getContent()).toBe('');

    expect(buffer.backspace()).toBe(false); // Nothing to delete

    buffer.destroy();
  });

  it('clears buffer without flushing', () => {
    const flushed: string[] = [];
    const buffer = new IMECompositionBuffer({
      timeout: 1000,
      onFlush: (text) => flushed.push(text),
    });

    buffer.add('test');
    buffer.clear();

    expect(flushed).toHaveLength(0);
    expect(buffer.hasContent()).toBe(false);

    buffer.destroy();
  });

  it('handles multi-byte characters correctly', () => {
    const flushed: string[] = [];
    const buffer = new IMECompositionBuffer({
      timeout: 1000,
      onFlush: (text) => flushed.push(text),
    });

    buffer.add('你好');
    expect(buffer.getContent()).toBe('你好');

    buffer.backspace();
    expect(buffer.getContent()).toBe('你');

    buffer.flush();
    expect(flushed[0]).toBe('你');

    buffer.destroy();
  });
});
