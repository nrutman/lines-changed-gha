import { describe, it, expect } from 'vitest';
import { validateGlobPatterns } from '../validateGlobPatterns';

describe('validateGlobPatterns', () => {
  it('should return empty array for valid patterns', () => {
    const errors = validateGlobPatterns([
      '**/generated/**',
      '**/*.lock',
      'dist/**',
    ]);

    expect(errors).toHaveLength(0);
  });

  it('should return empty array for empty input', () => {
    const errors = validateGlobPatterns([]);

    expect(errors).toHaveLength(0);
  });

  it('should warn about patterns starting with /', () => {
    const errors = validateGlobPatterns(['/src/**']);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('starts with /');
  });

  it('should warn about backslashes on non-Windows platforms', () => {
    const errors = validateGlobPatterns(['src\\generated\\**']);

    if (process.platform === 'win32') {
      // On Windows, backslashes are valid path separators
      expect(errors).toHaveLength(0);
    } else {
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('backslashes');
    }
  });

  it('should validate complex glob patterns', () => {
    const errors = validateGlobPatterns([
      '**/*.{ts,tsx}',
      '**/[id]/**',
      '!**/important/**',
    ]);

    expect(errors).toHaveLength(0);
  });

  it('should handle multiple errors', () => {
    const errors = validateGlobPatterns(['/absolute/path', '**/valid/**']);

    // At least one error for the absolute path
    expect(errors.some(e => e.includes('/absolute/path'))).toBe(true);
  });
});
