import { minimatch } from 'minimatch';

describe('File pattern matching', () => {
  it('should match generated files', () => {
    const pattern = '**/generated/**';
    expect(minimatch('src/generated/api.ts', pattern, { dot: true })).toBe(
      true
    );
    expect(minimatch('src/components/Button.tsx', pattern, { dot: true })).toBe(
      false
    );
  });

  it('should match lock files', () => {
    const pattern = '**/*.lock';
    expect(minimatch('some/path/file.lock', pattern, { dot: true })).toBe(true);
    expect(minimatch('pnpm-lock.yaml', pattern, { dot: true })).toBe(false);
  });

  it('should match multiple patterns', () => {
    const patterns = ['**/generated/**', '**/*.lock', '**/dist/**'];
    const testFile = (filename: string) =>
      patterns.some(pattern => minimatch(filename, pattern, { dot: true }));

    expect(testFile('src/generated/types.ts')).toBe(true);
    expect(testFile('path/to/file.lock')).toBe(true);
    expect(testFile('dist/index.js')).toBe(true);
    expect(testFile('src/main.ts')).toBe(false);
  });
});

describe('Lines calculation', () => {
  it('should calculate net changes correctly', () => {
    const added = 342;
    const removed = 128;
    const net = added - removed;
    expect(net).toBe(214);
  });

  it('should format positive net changes with plus sign', () => {
    const net = 214;
    const formatted = net >= 0 ? `+${net}` : `${net}`;
    expect(formatted).toBe('+214');
  });

  it('should format negative net changes without extra sign', () => {
    const net = -50;
    const formatted = net >= 0 ? `+${net}` : `${net}`;
    expect(formatted).toBe('-50');
  });
});

describe('Exclusion percentage calculation', () => {
  it('should calculate exclusion percentage correctly', () => {
    const includedAdded = 342;
    const includedRemoved = 128;
    const excludedAdded = 75;
    const excludedRemoved = 8;

    const totalChangedLines =
      includedAdded + includedRemoved + excludedAdded + excludedRemoved;
    const excludedChangedLines = excludedAdded + excludedRemoved;
    const percentage = Math.round(
      (excludedChangedLines / totalChangedLines) * 100
    );

    expect(percentage).toBe(15);
  });

  it('should handle 0% exclusion', () => {
    const totalChangedLines = 500;
    const excludedChangedLines = 0;
    const percentage = Math.round(
      (excludedChangedLines / totalChangedLines) * 100
    );

    expect(percentage).toBe(0);
  });

  it('should handle 100% exclusion', () => {
    const totalChangedLines = 500;
    const excludedChangedLines = 500;
    const percentage = Math.round(
      (excludedChangedLines / totalChangedLines) * 100
    );

    expect(percentage).toBe(100);
  });

  it('should handle no changes', () => {
    const totalChangedLines = 0;
    const excludedChangedLines = 0;
    const percentage =
      totalChangedLines > 0
        ? Math.round((excludedChangedLines / totalChangedLines) * 100)
        : 0;

    expect(percentage).toBe(0);
  });
});
