import { describe, expect, it } from 'vitest';
import { parseFileGroups } from '../parseFileGroups';

describe('parseFileGroups', () => {
  describe('with empty input', () => {
    it('should return config with only default group when no groups defined', () => {
      const result = parseFileGroups('', 'Changed');

      expect(result.groups).toHaveLength(0);
      expect(result.defaultGroup).toEqual({
        label: 'Changed',
        countTowardMetric: true,
        ignoreWhitespace: false,
      });
    });

    it('should handle whitespace-only input', () => {
      const result = parseFileGroups('   \n\t  ', 'Changed');

      expect(result.groups).toHaveLength(0);
    });

    it('should use provided default group label', () => {
      const result = parseFileGroups('', 'Other Files');

      expect(result.defaultGroup.label).toBe('Other Files');
    });

    it('should fallback to "Changed" if default label is empty', () => {
      const result = parseFileGroups('', '');

      expect(result.defaultGroup.label).toBe('Changed');
    });
  });

  describe('with valid YAML input', () => {
    it('should parse single group with all properties', () => {
      const yaml = `
- label: "Generated"
  patterns:
    - "**/generated/**"
  count: false
`;
      const result = parseFileGroups(yaml, 'Changed');

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0]).toEqual({
        label: 'Generated',
        patterns: ['**/generated/**'],
        countTowardMetric: false,
        ignoreWhitespace: false,
      });
    });

    it('should parse multiple groups with multiple patterns', () => {
      const yaml = `
- label: "Generated"
  patterns:
    - "**/generated/**"
  count: false
- label: "Tests"
  patterns:
    - "**/*.test.ts"
    - "**/*.spec.ts"
  count: true
`;
      const result = parseFileGroups(yaml, 'Changed');

      expect(result.groups).toHaveLength(2);
      expect(result.groups[0].label).toBe('Generated');
      expect(result.groups[1].label).toBe('Tests');
      expect(result.groups[1].patterns).toEqual([
        '**/*.test.ts',
        '**/*.spec.ts',
      ]);
    });

    it('should default count to true when not specified', () => {
      const yaml = `
- label: "Source"
  patterns:
    - "src/**/*.ts"
`;
      const result = parseFileGroups(yaml, 'Changed');

      expect(result.groups[0].countTowardMetric).toBe(true);
    });

    it('should parse ignore-whitespace: true', () => {
      const yaml = `
- label: "Source"
  patterns:
    - "src/**/*.ts"
  ignore-whitespace: true
`;
      const result = parseFileGroups(yaml, 'Changed');

      expect(result.groups[0].ignoreWhitespace).toBe(true);
    });

    it('should parse ignore-whitespace: false', () => {
      const yaml = `
- label: "Source"
  patterns:
    - "src/**/*.ts"
  ignore-whitespace: false
`;
      const result = parseFileGroups(yaml, 'Changed');

      expect(result.groups[0].ignoreWhitespace).toBe(false);
    });

    it('should default ignore-whitespace to false when not specified', () => {
      const yaml = `
- label: "Source"
  patterns:
    - "src/**/*.ts"
`;
      const result = parseFileGroups(yaml, 'Changed');

      expect(result.groups[0].ignoreWhitespace).toBe(false);
    });

    it('should trim whitespace from labels and patterns', () => {
      const yaml = `
- label: "  Source Files  "
  patterns:
    - "  src/**/*.ts  "
`;
      const result = parseFileGroups(yaml, 'Changed');

      expect(result.groups[0].label).toBe('Source Files');
      expect(result.groups[0].patterns).toEqual(['src/**/*.ts']);
    });

    it('should preserve order of groups', () => {
      const yaml = `
- label: "First"
  patterns: ["first/**"]
- label: "Second"
  patterns: ["second/**"]
- label: "Third"
  patterns: ["third/**"]
`;
      const result = parseFileGroups(yaml, 'Changed');

      expect(result.groups.map(g => g.label)).toEqual([
        'First',
        'Second',
        'Third',
      ]);
    });

    it('should support emoji in labels', () => {
      const yaml = `
- label: "🧪 Tests"
  patterns:
    - "**/*.test.ts"
- label: "📦 Build"
  patterns:
    - "dist/**"
  count: false
`;
      const result = parseFileGroups(yaml, '🏅 Source');

      expect(result.groups[0].label).toBe('🧪 Tests');
      expect(result.groups[1].label).toBe('📦 Build');
      expect(result.defaultGroup.label).toBe('🏅 Source');
    });

    it('should handle YAML with comments', () => {
      const yaml = `
# This is a comment
- label: "Source"  # inline comment
  patterns:
    - "src/**/*.ts"
`;
      const result = parseFileGroups(yaml, 'Changed');

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].label).toBe('Source');
    });

    it('should handle inline YAML array syntax for patterns', () => {
      const yaml = `
- label: "Source"
  patterns: ["src/**/*.ts", "lib/**/*.ts"]
`;
      const result = parseFileGroups(yaml, 'Changed');

      expect(result.groups[0].patterns).toEqual(['src/**/*.ts', 'lib/**/*.ts']);
    });
  });

  describe('with invalid YAML input', () => {
    it('should throw error for invalid YAML syntax', () => {
      const yaml = `
- label: "Source"
  patterns:
    - "src/**/*.ts
`;
      expect(() => parseFileGroups(yaml, 'Changed')).toThrow(/Invalid YAML/);
    });

    it('should throw error when input is not an array', () => {
      const yaml = `
label: "Source"
patterns:
  - "src/**/*.ts"
`;
      expect(() => parseFileGroups(yaml, 'Changed')).toThrow(
        /must be a YAML array/
      );
    });

    it('should throw error when label is missing or invalid', () => {
      // Missing label
      expect(() =>
        parseFileGroups(
          `
- patterns:
    - "src/**"
`,
          'Changed'
        )
      ).toThrow(/Group 1: 'label' is required/);

      // Empty label
      expect(() =>
        parseFileGroups(
          `
- label: ""
  patterns:
    - "src/**"
`,
          'Changed'
        )
      ).toThrow(/Group 1: 'label' is required and must be a non-empty string/);

      // Non-string label
      expect(() =>
        parseFileGroups(
          `
- label: 123
  patterns:
    - "src/**"
`,
          'Changed'
        )
      ).toThrow(/Group 1: 'label' is required and must be a non-empty string/);
    });

    it('should throw error when patterns is missing or invalid', () => {
      // Missing patterns
      expect(() =>
        parseFileGroups(
          `
- label: "Source"
`,
          'Changed'
        )
      ).toThrow(/Group 1 \("Source"\): 'patterns' is required/);

      // Empty patterns array
      expect(() =>
        parseFileGroups(
          `
- label: "Source"
  patterns: []
`,
          'Changed'
        )
      ).toThrow(
        /Group 1 \("Source"\): 'patterns' is required and must be a non-empty array/
      );

      // Patterns not an array
      expect(() =>
        parseFileGroups(
          `
- label: "Source"
  patterns: "src/**"
`,
          'Changed'
        )
      ).toThrow(
        /Group 1 \("Source"\): 'patterns' is required and must be a non-empty array/
      );
    });

    it('should throw error when pattern is invalid', () => {
      // Non-string pattern
      expect(() =>
        parseFileGroups(
          `
- label: "Source"
  patterns:
    - 123
`,
          'Changed'
        )
      ).toThrow(
        /Group 1 \("Source"\): pattern at index 0 must be a non-empty string/
      );

      // Empty string pattern
      expect(() =>
        parseFileGroups(
          `
- label: "Source"
  patterns:
    - ""
`,
          'Changed'
        )
      ).toThrow(
        /Group 1 \("Source"\): pattern at index 0 must be a non-empty string/
      );
    });

    it('should throw error when count is not a boolean', () => {
      expect(() =>
        parseFileGroups(
          `
- label: "Source"
  patterns:
    - "src/**"
  count: "yes"
`,
          'Changed'
        )
      ).toThrow(/Group 1 \("Source"\): 'count' must be a boolean/);
    });

    it('should throw error when ignore-whitespace is not a boolean', () => {
      expect(() =>
        parseFileGroups(
          `
- label: "Source"
  patterns:
    - "src/**"
  ignore-whitespace: "yes"
`,
          'Changed'
        )
      ).toThrow(/Group 1 \("Source"\): 'ignore-whitespace' must be a boolean/);
    });

    it('should include group number in error messages', () => {
      expect(() =>
        parseFileGroups(
          `
- label: "Valid"
  patterns:
    - "src/**"
- label: ""
  patterns:
    - "test/**"
`,
          'Changed'
        )
      ).toThrow(/Group 2:/);
    });
  });

  describe('complex patterns', () => {
    it('should handle glob patterns with special characters', () => {
      const yaml = `
- label: "Complex"
  patterns:
    - "**/*.{ts,tsx}"
    - "src/**/[A-Z]*.ts"
    - "**/?(foo|bar).ts"
`;
      const result = parseFileGroups(yaml, 'Changed');

      expect(result.groups[0].patterns).toEqual([
        '**/*.{ts,tsx}',
        'src/**/[A-Z]*.ts',
        '**/?(foo|bar).ts',
      ]);
    });
  });

  describe('global ignoreWhitespace', () => {
    it('should set ignoreWhitespace on default group when global is true', () => {
      const result = parseFileGroups('', 'Changed', true);

      expect(result.defaultGroup.ignoreWhitespace).toBe(true);
    });

    it('should set ignoreWhitespace false on default group when global is false', () => {
      const result = parseFileGroups('', 'Changed', false);

      expect(result.defaultGroup.ignoreWhitespace).toBe(false);
    });

    it('should inherit global ignoreWhitespace for groups that do not specify it', () => {
      const yaml = `
- label: "Source"
  patterns:
    - "src/**/*.ts"
`;
      const result = parseFileGroups(yaml, 'Changed', true);

      expect(result.groups[0].ignoreWhitespace).toBe(true);
    });

    it('should allow group-level ignore-whitespace: false to override global true', () => {
      const yaml = `
- label: "Source"
  patterns:
    - "src/**/*.ts"
  ignore-whitespace: false
`;
      const result = parseFileGroups(yaml, 'Changed', true);

      expect(result.groups[0].ignoreWhitespace).toBe(false);
    });

    it('should allow group-level ignore-whitespace: true to override global false', () => {
      const yaml = `
- label: "Source"
  patterns:
    - "src/**/*.ts"
  ignore-whitespace: true
`;
      const result = parseFileGroups(yaml, 'Changed', false);

      expect(result.groups[0].ignoreWhitespace).toBe(true);
    });
  });
});
