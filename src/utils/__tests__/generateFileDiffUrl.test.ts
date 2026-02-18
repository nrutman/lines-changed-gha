import { describe, it, expect } from 'vitest';
import { generateFileDiffUrl } from '../generateFileDiffUrl';

describe('generateFileDiffUrl', () => {
  it('should generate correct URL structure', () => {
    const url = generateFileDiffUrl('owner', 'repo', 123, 'src/main.ts');

    expect(url).toMatch(
      /^https:\/\/github\.com\/owner\/repo\/pull\/123\/files#diff-[a-f0-9]{16}$/
    );
  });

  it('should generate consistent hash for same filename', () => {
    const url1 = generateFileDiffUrl('owner', 'repo', 123, 'src/main.ts');
    const url2 = generateFileDiffUrl('owner', 'repo', 123, 'src/main.ts');

    expect(url1).toBe(url2);
  });

  it('should generate different hashes for different filenames', () => {
    const url1 = generateFileDiffUrl('owner', 'repo', 123, 'src/main.ts');
    const url2 = generateFileDiffUrl('owner', 'repo', 123, 'src/utils.ts');

    expect(url1).not.toBe(url2);
  });

  it('should handle filenames with special characters', () => {
    const url = generateFileDiffUrl(
      'owner',
      'repo',
      123,
      'src/components/[id]/page.tsx'
    );

    expect(url).toContain('https://github.com/owner/repo/pull/123/files#diff-');
  });

  it('should handle deeply nested paths', () => {
    const url = generateFileDiffUrl(
      'owner',
      'repo',
      456,
      'src/components/ui/buttons/primary/PrimaryButton.tsx'
    );

    expect(url).toMatch(
      /^https:\/\/github\.com\/owner\/repo\/pull\/456\/files#diff-[a-f0-9]{16}$/
    );
  });

  it('should use first 16 characters of MD5 hash', () => {
    const url = generateFileDiffUrl('owner', 'repo', 1, 'test.ts');
    const anchor = url.split('#')[1];

    // Format should be "diff-" followed by exactly 16 hex characters
    expect(anchor).toMatch(/^diff-[a-f0-9]{16}$/);
  });
});
