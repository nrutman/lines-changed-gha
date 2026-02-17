import * as core from '@actions/core';
import * as github from '@actions/github';
import { minimatch } from 'minimatch';
import { createHash } from 'crypto';

interface FileChange {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  status: string;
}

interface DiffSummary {
  addedLines: number;
  removedLines: number;
  totalFiles: number;
  excludedFiles: string[];
  includedFiles: FileChange[];
}

const COMMENT_IDENTIFIER = '<!-- lines-changed-summary -->';

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true });
    const excludePatternsInput = core.getInput('exclude-patterns');
    const commentHeader = core.getInput('comment-header');

    const excludePatterns = excludePatternsInput
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const octokit = github.getOctokit(token);
    const context = github.context;

    if (!context.payload.pull_request) {
      core.setFailed('This action can only be run on pull_request events');
      return;
    }

    const prNumber = context.payload.pull_request.number;
    const owner = context.repo.owner;
    const repo = context.repo.repo;

    core.info(`Processing PR #${prNumber} in ${owner}/${repo}`);
    core.info(`Exclude patterns: ${excludePatterns.join(', ') || 'none'}`);

    // Get the list of files changed in the PR
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    core.info(`Found ${files.length} changed files`);

    // Calculate diff summary
    const summary = calculateDiffSummary(files, excludePatterns);

    // Set outputs
    core.setOutput('added-lines', summary.addedLines);
    core.setOutput('removed-lines', summary.removedLines);
    core.setOutput('total-files', summary.totalFiles);
    core.setOutput('excluded-files', summary.excludedFiles.length);

    // Generate comment body
    const commentBody = generateCommentBody(
      summary,
      commentHeader,
      excludePatterns,
      owner,
      repo,
      prNumber
    );

    // Find existing comment
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });

    const existingComment = comments.find(comment =>
      comment.body?.includes(COMMENT_IDENTIFIER)
    );

    // Create or update comment
    if (existingComment) {
      core.info(`Updating existing comment (ID: ${existingComment.id})`);
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
    } else {
      core.info('Creating new comment');
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: commentBody,
      });
    }

    core.info('✓ Lines changed summary posted successfully');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
}

function calculateDiffSummary(
  files: FileChange[],
  excludePatterns: string[]
): DiffSummary {
  const excludedFiles: string[] = [];
  const includedFiles: FileChange[] = [];
  let addedLines = 0;
  let removedLines = 0;

  for (const file of files) {
    const isExcluded = excludePatterns.some(pattern =>
      minimatch(file.filename, pattern, { dot: true })
    );

    if (isExcluded) {
      excludedFiles.push(file.filename);
      core.info(`✗ Excluded: ${file.filename}`);
    } else {
      includedFiles.push(file);
      addedLines += file.additions;
      removedLines += file.deletions;
      core.info(
        `✓ Included: ${file.filename} (+${file.additions} -${file.deletions})`
      );
    }
  }

  return {
    addedLines,
    removedLines,
    totalFiles: files.length,
    excludedFiles,
    includedFiles,
  };
}

function generateFileDiffUrl(
  owner: string,
  repo: string,
  prNumber: number,
  filename: string
): string {
  const hash = createHash('md5').update(filename).digest('hex');
  const anchor = `diff-${hash.substring(0, 16)}`;
  return `https://github.com/${owner}/${repo}/pull/${prNumber}/files#${anchor}`;
}

function generateCommentBody(
  summary: DiffSummary,
  header: string,
  excludePatterns: string[],
  owner: string,
  repo: string,
  prNumber: number
): string {
  const netChange = summary.addedLines - summary.removedLines;
  const netChangeStr = netChange >= 0 ? `+${netChange}` : `${netChange}`;

  let body = `${COMMENT_IDENTIFIER}\n${header}\n\n`;

  // Main summary with colored squares
  body += `**🟩 +${summary.addedLines}** **🟥 -${summary.removedLines}** (${netChangeStr} net)\n\n`;

  // File counts
  const includedCount = summary.includedFiles.length;
  const excludedCount = summary.excludedFiles.length;

  body += `📊 **${includedCount}** ${includedCount === 1 ? 'file' : 'files'} included`;

  if (excludedCount > 0) {
    body += `, **${excludedCount}** ${excludedCount === 1 ? 'file' : 'files'} excluded\n\n`;
  } else {
    body += '\n\n';
  }

  // Excluded files section (collapsible)
  if (excludedCount > 0) {
    body += '<details>\n<summary>Excluded files</summary>\n\n';
    body += `The following files were excluded based on patterns: \`${excludePatterns.join('`, `')}\`\n\n`;

    for (const filename of summary.excludedFiles) {
      const fileUrl = generateFileDiffUrl(owner, repo, prNumber, filename);
      body += `- [\`${filename}\`](${fileUrl})\n`;
    }

    body += '\n</details>\n\n';
  }

  // Included files breakdown (collapsible)
  if (includedCount > 0) {
    body += '<details>\n<summary>Files included in summary</summary>\n\n';
    body += '| File | Lines Added | Lines Removed |\n';
    body += '|------|-------------|---------------|\n';

    // Sort files by total changes (descending)
    const sortedFiles = [...summary.includedFiles].sort(
      (a, b) => b.changes - a.changes
    );

    for (const file of sortedFiles) {
      const fileUrl = generateFileDiffUrl(owner, repo, prNumber, file.filename);
      body += `| [\`${file.filename}\`](${fileUrl}) | +${file.additions} | -${file.deletions} |\n`;
    }

    body += '\n</details>';
  }

  return body;
}

run();
