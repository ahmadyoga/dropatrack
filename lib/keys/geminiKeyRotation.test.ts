import { describe, expect, it } from 'vitest';
import { GeminiKeyRotationForTest } from './geminiKeyRotation';

describe('GeminiKeyRotation', () => {
  it('reports all configured keys so callers can attempt every Gemini fallback key', () => {
    const rotation = new GeminiKeyRotationForTest('key-a, key-b,key-c');

    expect(rotation.configuredKeyCount()).toBe(3);
  });
});
