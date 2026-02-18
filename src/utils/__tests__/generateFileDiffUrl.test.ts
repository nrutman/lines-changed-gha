import { describe, it, expect } from 'vitest';
import { generateFileDiffUrl } from '../generateFileDiffUrl';

describe('generateFileDiffUrl', () => {
  it('should generate correct URL structure with 16-char hex anchor', () => {
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
});
