/**
 * IME (Input Method Editor) utilities for handling multi-byte character input
 * 
 * This module provides detection and buffering for IME input from:
 * - Vietnamese (Telex, VNI, VIQR)
 * - Chinese (Pinyin, Wubi)
 * - Japanese (Romaji, Hiragana, Katakana)
 * - Korean (Hangul)
 * - Thai, Arabic, Devanagari, etc.
 * 
 * Related issues:
 * - https://github.com/anthropics/claude-code/issues/10429
 * - https://github.com/vadimdemedes/ink/issues/759
 */

/**
 * Check if a string contains multi-byte UTF-8 characters
 * that likely came from an IME
 */
export function isIMEInput(input: string): boolean {
  // Empty or single ASCII character - not IME
  if (!input || (input.length === 1 && input.charCodeAt(0) < 128)) {
    return false;
  }

  // Check for multi-byte characters
  const byteLength = Buffer.byteLength(input, 'utf8');
  if (byteLength > input.length) {
    return true;
  }

  // Check for combining diacritical marks (Vietnamese, etc.)
  if (/[\u0300-\u036F]/.test(input)) {
    return true;
  }

  // Vietnamese precomposed characters
  if (/[\u00C0-\u00FF\u0102-\u0103\u0110-\u0111\u0128-\u0129\u0168-\u0169\u01A0-\u01B0\u1EA0-\u1EF9]/.test(input)) {
    return true;
  }

  // CJK characters
  if (/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/.test(input)) {
    return true;
  }

  // Japanese Hiragana and Katakana
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(input)) {
    return true;
  }

  // Korean Hangul
  if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(input)) {
    return true;
  }

  // Thai
  if (/[\u0E00-\u0E7F]/.test(input)) {
    return true;
  }

  // Arabic
  if (/[\u0600-\u06FF]/.test(input)) {
    return true;
  }

  // Devanagari (Hindi, etc.)
  if (/[\u0900-\u097F]/.test(input)) {
    return true;
  }

  return false;
}

/**
 * IME Composition Buffer
 * Buffers rapid IME input and flushes after a timeout
 */
export class IMECompositionBuffer {
  private buffer: string = '';
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly timeout: number;
  private readonly onFlush: (text: string) => void;

  constructor(options: { timeout?: number; onFlush: (text: string) => void }) {
    this.timeout = options.timeout ?? 50;
    this.onFlush = options.onFlush;
  }

  /**
   * Add input to the buffer
   */
  add(input: string): void {
    this.buffer += input;
    this.scheduleFlush();
  }

  /**
   * Schedule a flush after timeout
   */
  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.timeout);
  }

  /**
   * Flush the buffer immediately
   */
  flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer) {
      this.onFlush(this.buffer);
      this.buffer = '';
    }
  }

  /**
   * Check if buffer has content
   */
  hasContent(): boolean {
    return this.buffer.length > 0;
  }

  /**
   * Get current buffer content
   */
  getContent(): string {
    return this.buffer;
  }

  /**
   * Clear buffer without flushing
   */
  clear(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.buffer = '';
  }

  /**
   * Handle backspace in buffer
   * Returns true if handled, false if buffer is empty
   */
  backspace(): boolean {
    if (this.buffer.length > 0) {
      const chars = [...this.buffer];
      chars.pop();
      this.buffer = chars.join('');
      this.scheduleFlush();
      return true;
    }
    return false;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
