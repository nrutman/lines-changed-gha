import { describe, expect, it } from 'vitest';
import { calculateDiffSummary } from '../calculateDiffSummary';
import type { FileChange, FileGroup, FileGroupsConfig } from '../types';

describe('calculateDiffSummary', () => {
  // Helper to create file changes
  const file = (
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

  // Helper to create a group
  const group = (
    label: string,
    patterns: string[],
    countTowardMetric = true
  ): FileGroup => ({
    label,
    patterns,
    countTowardMetric,
  });

  // Helper to create config
  const config = (
    groups: FileGroup[] = [],
    defaultGroupLabel = 'Changed'
  ): FileGroupsConfig => ({
    groups,
    defaultGroup: {
      label: defaultGroupLabel,
      countTowardMetric: true,
    },
  });

  describe('basic grouping', () => {
    it('should place all files in default group when no groups defined', () => {
      const files = [
        file('src/main.ts', 100, 50),
        file('src/utils.ts', 30, 10),
      ];

      const result = calculateDiffSummary(files, config());

      expect(result.addedLines).toBe(130);
      expect(result.removedLines).toBe(60);
      expect(result.uncountedAddedLines).toBe(0);
      expect(result.uncountedRemovedLines).toBe(0);
      expect(result.totalFiles).toBe(2);
      expect(result.groupedFiles).toHaveLength(1);
      expect(result.groupedFiles[0].group.label).toBe('Changed');
      expect(result.groupedFiles[0].files).toHaveLength(2);
    });

    it('should handle empty file list', () => {
      const result = calculateDiffSummary([], config());

      expect(result.addedLines).toBe(0);
      expect(result.removedLines).toBe(0);
      expect(result.totalFiles).toBe(0);
      expect(result.groupedFiles).toHaveLength(0);
    });

    it('should place files in matching groups and count correctly', () => {
      const files = [
        file('src/main.ts', 100, 50),
        file('src/generated/api.ts', 500, 200),
        file('dist/index.js', 1000, 0),
      ];

      const result = calculateDiffSummary(
        files,
        config([group('Generated', ['**/generated/**', '**/dist/**'], false)])
      );

      // Counted: src/main.ts
      expect(result.addedLines).toBe(100);
      expect(result.removedLines).toBe(50);
      // Uncounted: generated + dist
      expect(result.uncountedAddedLines).toBe(1500);
      expect(result.uncountedRemovedLines).toBe(200);

      expect(result.groupedFiles).toHaveLength(2);
      expect(
        result.groupedFiles.find(g => g.group.label === 'Generated')!.files
      ).toHaveLength(2);
      expect(
        result.groupedFiles.find(g => g.group.label === 'Changed')!.files
      ).toHaveLength(1);
    });

    it('should skip empty groups in results', () => {
      const files = [file('src/main.ts', 100, 50)];

      const result = calculateDiffSummary(
        files,
        config([group('Generated', ['**/generated/**'], false)])
      );

      expect(result.groupedFiles).toHaveLength(1);
      expect(result.groupedFiles[0].group.label).toBe('Changed');
    });
  });

  describe('group ordering and first-match-wins', () => {
    it('should process groups in order - first match wins', () => {
      const files = [
        file('src/generated/api.test.ts', 50, 10), // Matches both Generated and Tests
        file('src/utils.test.ts', 30, 5), // Matches only Tests
        file('src/main.ts', 100, 50), // Matches neither
      ];

      const result = calculateDiffSummary(
        files,
        config([
          group('Generated', ['**/generated/**'], false),
          group('Tests', ['**/*.test.ts'], true),
        ])
      );

      // First match wins: generated test file goes to Generated, not Tests
      const generatedGroup = result.groupedFiles.find(
        g => g.group.label === 'Generated'
      )!;
      expect(generatedGroup.files.map(f => f.filename)).toEqual([
        'src/generated/api.test.ts',
      ]);

      const testsGroup = result.groupedFiles.find(
        g => g.group.label === 'Tests'
      )!;
      expect(testsGroup.files.map(f => f.filename)).toEqual([
        'src/utils.test.ts',
      ]);
    });

    it('should maintain group order with default group first', () => {
      const files = [
        file('src/main.ts', 100, 50),
        file('test/main.test.ts', 30, 10),
        file('docs/README.md', 20, 5),
      ];

      const result = calculateDiffSummary(
        files,
        config([
          group('Tests', ['test/**'], true),
          group('Documentation', ['docs/**'], false),
        ])
      );

      expect(result.groupedFiles.map(g => g.group.label)).toEqual([
        'Changed',
        'Tests',
        'Documentation',
      ]);
    });
  });

  describe('counting behavior', () => {
    it('should aggregate metrics correctly per group', () => {
      const files = [
        file('src/a.ts', 10, 5),
        file('src/b.ts', 20, 10),
        file('test/a.test.ts', 30, 15),
        file('test/b.test.ts', 40, 20),
      ];

      const result = calculateDiffSummary(
        files,
        config([group('Tests', ['test/**'], false)])
      );

      const testsGroup = result.groupedFiles.find(
        g => g.group.label === 'Tests'
      )!;
      expect(testsGroup.addedLines).toBe(70);
      expect(testsGroup.removedLines).toBe(35);

      const defaultGroup = result.groupedFiles.find(
        g => g.group.label === 'Changed'
      )!;
      expect(defaultGroup.addedLines).toBe(30);
      expect(defaultGroup.removedLines).toBe(15);

      // Overall metrics
      expect(result.addedLines).toBe(30); // Only counted group
      expect(result.removedLines).toBe(15);
      expect(result.uncountedAddedLines).toBe(70);
      expect(result.uncountedRemovedLines).toBe(35);
    });

    it('should show +0/-0 when all files are in uncounted groups', () => {
      const files = [
        file('dist/index.js', 1000, 500),
        file('pnpm-lock.yaml', 5000, 4000),
      ];

      const result = calculateDiffSummary(
        files,
        config([
          group('Build', ['dist/**'], false),
          group('Lock Files', ['*-lock.*'], false),
        ])
      );

      expect(result.addedLines).toBe(0);
      expect(result.removedLines).toBe(0);
      expect(result.uncountedAddedLines).toBe(6000);
      expect(result.uncountedRemovedLines).toBe(4500);
      expect(result.groupedFiles).toHaveLength(2);
    });
  });

  describe('glob pattern matching', () => {
    it('should match files with multiple patterns in a group', () => {
      const files = [
        file('src/api.ts', 100, 50),
        file('src/Component.tsx', 80, 30),
        file('src/utils.js', 30, 10),
      ];

      const result = calculateDiffSummary(
        files,
        config([group('TypeScript', ['**/*.ts', '**/*.tsx'], true)])
      );

      const tsGroup = result.groupedFiles.find(
        g => g.group.label === 'TypeScript'
      )!;
      expect(tsGroup.files.map(f => f.filename)).toEqual([
        'src/api.ts',
        'src/Component.tsx',
      ]);
    });

    it('should match lock files with glob pattern', () => {
      const files = [
        file('package-lock.json', 5000, 4000),
        file('pnpm-lock.yaml', 3000, 2000),
        file('src/main.ts', 50, 10),
      ];

      const result = calculateDiffSummary(
        files,
        config([group('Lock Files', ['*-lock.*'], false)])
      );

      const lockGroup = result.groupedFiles.find(
        g => g.group.label === 'Lock Files'
      )!;
      expect(lockGroup.files.map(f => f.filename)).toEqual([
        'package-lock.json',
        'pnpm-lock.yaml',
      ]);
    });

    it('should match dot files with dot option enabled', () => {
      const files = [
        file('.env', 10, 0),
        file('.gitignore', 5, 2),
        file('src/main.ts', 100, 50),
      ];

      const result = calculateDiffSummary(
        files,
        config([group('Dotfiles', ['.*'], false)])
      );

      const dotfilesGroup = result.groupedFiles.find(
        g => g.group.label === 'Dotfiles'
      )!;
      expect(dotfilesGroup.files.map(f => f.filename)).toEqual([
        '.env',
        '.gitignore',
      ]);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical PR with source, tests, and generated files', () => {
      const files = [
        // Source files (should count)
        file('src/main.ts', 100, 50),
        file('src/utils/helpers.ts', 30, 10),
        // Test files (should count)
        file('src/__tests__/main.test.ts', 80, 20),
        file('src/__tests__/helpers.test.ts', 40, 10),
        // Generated/build files (should not count)
        file('dist/index.js', 2000, 1000),
        file('dist/index.js.map', 500, 200),
        // Lock file (should not count)
        file('pnpm-lock.yaml', 100, 50),
      ];

      const result = calculateDiffSummary(
        files,
        config(
          [
            group('🧪 Tests', ['**/__tests__/**'], true),
            group('📦 Build', ['dist/**'], false),
            group('⚙️ Generated', ['pnpm-lock.yaml'], false),
          ],
          '🏅 Source Code'
        )
      );

      // Verify group assignment (default group first, then defined groups in order)
      expect(result.groupedFiles.map(g => g.group.label)).toEqual([
        '🏅 Source Code',
        '🧪 Tests',
        '📦 Build',
        '⚙️ Generated',
      ]);

      // Verify counts
      expect(result.addedLines).toBe(250); // source (130) + tests (120)
      expect(result.removedLines).toBe(90); // source (60) + tests (30)
      expect(result.uncountedAddedLines).toBe(2600); // build (2500) + lock (100)
      expect(result.uncountedRemovedLines).toBe(1250); // build (1200) + lock (50)
      expect(result.totalFiles).toBe(7);
    });

    it('should support emoji labels', () => {
      const files = [file('src/main.ts', 100, 50)];

      const result = calculateDiffSummary(
        files,
        config([group('🚀 Features', ['src/**'], true)], '📁 Other')
      );

      expect(result.groupedFiles[0].group.label).toBe('🚀 Features');
    });
  });
});
