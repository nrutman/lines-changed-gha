import { describe, it, expect } from 'vitest';
import { calculateDiffSummary } from '../calculateDiffSummary';
import type { FileChange } from '../types';

describe('calculateDiffSummary', () => {
  const createFile = (
    filename: string,
    additions: number,
    deletions: number
  ): FileChange => ({
    filename,
    additions,
    deletions,
    changes: additions + deletions,
    status: 'modified',
  });

  it('should calculate totals for all files when no patterns provided', () => {
    const files: FileChange[] = [
      createFile('src/main.ts', 100, 50),
      createFile('src/utils.ts', 30, 10),
    ];

    const result = calculateDiffSummary(files, []);

    expect(result.addedLines).toBe(130);
    expect(result.removedLines).toBe(60);
    expect(result.totalFiles).toBe(2);
    expect(result.includedFiles).toHaveLength(2);
    expect(result.ignoredFiles).toHaveLength(0);
  });

  it('should ignore files matching patterns', () => {
    const files: FileChange[] = [
      createFile('src/main.ts', 100, 50),
      createFile('src/generated/api.ts', 500, 200),
      createFile('dist/index.js', 1000, 0),
    ];

    const result = calculateDiffSummary(files, [
      '**/generated/**',
      '**/dist/**',
    ]);

    expect(result.addedLines).toBe(100);
    expect(result.removedLines).toBe(50);
    expect(result.ignoredAddedLines).toBe(1500);
    expect(result.ignoredRemovedLines).toBe(200);
    expect(result.includedFiles).toHaveLength(1);
    expect(result.ignoredFiles.map(f => f.filename)).toEqual([
      'src/generated/api.ts',
      'dist/index.js',
    ]);
  });

  it('should handle empty file list', () => {
    const result = calculateDiffSummary([], ['**/test/**']);

    expect(result.addedLines).toBe(0);
    expect(result.removedLines).toBe(0);
    expect(result.totalFiles).toBe(0);
    expect(result.includedFiles).toHaveLength(0);
    expect(result.ignoredFiles).toHaveLength(0);
  });

  it('should match lock files with glob pattern', () => {
    const files: FileChange[] = [
      createFile('package-lock.json', 5000, 4000),
      createFile('pnpm-lock.yaml', 3000, 2000),
      createFile('src/main.ts', 50, 10),
    ];

    const result = calculateDiffSummary(files, ['*-lock.*']);

    expect(result.includedFiles).toHaveLength(1);
    expect(result.ignoredFiles.map(f => f.filename)).toEqual([
      'package-lock.json',
      'pnpm-lock.yaml',
    ]);
  });

  it('should handle dot files with dot option enabled', () => {
    const files: FileChange[] = [
      createFile('.env', 10, 0),
      createFile('.gitignore', 5, 2),
      createFile('src/main.ts', 100, 50),
    ];

    const result = calculateDiffSummary(files, ['.*']);

    expect(result.includedFiles).toHaveLength(1);
    expect(result.ignoredFiles.map(f => f.filename)).toEqual([
      '.env',
      '.gitignore',
    ]);
  });
});
