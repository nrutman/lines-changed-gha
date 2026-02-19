import { describe, expect, it, vi, beforeEach } from 'vitest';
import { parseGitNumstat, getGitWhitespaceDiff } from '../getGitWhitespaceDiff';

// Mock child_process and fs
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('@actions/core', () => ({
  warning: vi.fn(),
}));

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import * as core from '@actions/core';

const mockedExecSync = vi.mocked(execSync);
const mockedExistsSync = vi.mocked(existsSync);

describe('parseGitNumstat', () => {
  it('should parse normal numstat output', () => {
    const output = '10\t5\tsrc/main.ts\n20\t3\tsrc/utils.ts\n';
    const result = parseGitNumstat(output);

    expect(result.size).toBe(2);
    expect(result.get('src/main.ts')).toEqual({ additions: 10, deletions: 5 });
    expect(result.get('src/utils.ts')).toEqual({ additions: 20, deletions: 3 });
  });

  it('should skip binary files', () => {
    const output = '10\t5\tsrc/main.ts\n-\t-\timage.png\n';
    const result = parseGitNumstat(output);

    expect(result.size).toBe(1);
    expect(result.has('image.png')).toBe(false);
  });

  it('should handle empty output', () => {
    const result = parseGitNumstat('');
    expect(result.size).toBe(0);
  });

  it('should handle whitespace-only output', () => {
    const result = parseGitNumstat('\n\n  \n');
    expect(result.size).toBe(0);
  });

  it('should handle renamed files with arrow syntax', () => {
    const output = '5\t2\told-name.ts => new-name.ts\n';
    const result = parseGitNumstat(output);

    expect(result.size).toBe(1);
    expect(result.get('new-name.ts')).toEqual({ additions: 5, deletions: 2 });
  });

  it('should handle renamed files with brace syntax', () => {
    const output = '5\t2\tsrc/{old => new}/file.ts\n';
    const result = parseGitNumstat(output);

    expect(result.size).toBe(1);
    expect(result.get('src/new/file.ts')).toEqual({
      additions: 5,
      deletions: 2,
    });
  });

  it('should handle files with zero additions or deletions', () => {
    const output = '0\t10\tdeleted-content.ts\n15\t0\tnew-file.ts\n';
    const result = parseGitNumstat(output);

    expect(result.size).toBe(2);
    expect(result.get('deleted-content.ts')).toEqual({
      additions: 0,
      deletions: 10,
    });
    expect(result.get('new-file.ts')).toEqual({
      additions: 15,
      deletions: 0,
    });
  });
});

describe('getGitWhitespaceDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when no git checkout exists', async () => {
    mockedExistsSync.mockReturnValue(false);

    const result = await getGitWhitespaceDiff('base123', 'head456');

    expect(result).toBeNull();
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('No git checkout detected')
    );
  });

  it('should return parsed numstat on success', async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecSync
      .mockImplementationOnce(() => Buffer.from('')) // fetch
      .mockImplementationOnce(
        () => '10\t5\tsrc/main.ts\n20\t3\tsrc/utils.ts\n'
      ); // diff

    const result = await getGitWhitespaceDiff('base123', 'head456');

    expect(result).not.toBeNull();
    expect(result!.size).toBe(2);
    expect(result!.get('src/main.ts')).toEqual({
      additions: 10,
      deletions: 5,
    });
  });

  it('should still succeed when fetch fails', async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecSync
      .mockImplementationOnce(() => {
        throw new Error('fetch failed');
      }) // fetch fails
      .mockImplementationOnce(() => '10\t5\tsrc/main.ts\n'); // diff succeeds

    const result = await getGitWhitespaceDiff('base123', 'head456');

    expect(result).not.toBeNull();
    expect(result!.size).toBe(1);
  });

  it('should return null when git diff fails', async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecSync
      .mockImplementationOnce(() => Buffer.from('')) // fetch
      .mockImplementationOnce(() => {
        throw new Error('diff failed');
      }); // diff fails

    const result = await getGitWhitespaceDiff('base123', 'head456');

    expect(result).toBeNull();
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('Failed to get whitespace-adjusted diff')
    );
  });

  it('should call git with correct arguments', async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedExecSync
      .mockImplementationOnce(() => Buffer.from(''))
      .mockImplementationOnce(() => '');

    await getGitWhitespaceDiff('abc123', 'def456');

    expect(mockedExecSync).toHaveBeenCalledWith(
      'git fetch origin abc123 def456 --depth=1',
      expect.any(Object)
    );
    expect(mockedExecSync).toHaveBeenCalledWith(
      'git diff -w --numstat abc123...def456',
      expect.any(Object)
    );
  });
});
