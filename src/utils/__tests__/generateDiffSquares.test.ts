import { describe, it, expect } from 'vitest';
import { generateDiffSquares } from '../generateDiffSquares';

describe('generateDiffSquares', () => {
  it('should generate all green squares for additions only', () => {
    expect(generateDiffSquares(100, 0)).toBe('🟩🟩🟩🟩🟩');
  });

  it('should generate all red squares for deletions only', () => {
    expect(generateDiffSquares(0, 100)).toBe('🟥🟥🟥🟥🟥');
  });

  it('should generate proportional squares for mixed changes', () => {
    // 342/(342+128) = 0.728 -> 0.728*5 = 3.64 -> rounds to 4
    expect(generateDiffSquares(342, 128)).toBe('🟩🟩🟩🟩🟥');
  });

  it('should handle equal additions and deletions', () => {
    // 0.5 * 5 = 2.5 -> Math.round rounds to 3
    expect(generateDiffSquares(100, 100)).toBe('🟩🟩🟩🟥🟥');
  });

  it('should generate empty squares for no changes', () => {
    expect(generateDiffSquares(0, 0)).toBe('▫▫▫▫▫');
  });

  it('should round correctly at boundaries', () => {
    // 20% green = 1 square
    expect(generateDiffSquares(20, 80)).toBe('🟩🟥🟥🟥🟥');
    // 80% green = 4 squares
    expect(generateDiffSquares(80, 20)).toBe('🟩🟩🟩🟩🟥');
  });
});
