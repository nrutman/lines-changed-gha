import * as core from '@actions/core';
import * as github from '@actions/github';
import {
  calculateDiffSummary,
  COMMENT_IDENTIFIER,
  generateCommentBody,
  getGitWhitespaceDiff,
  parseFileGroups,
  validateGlobPatterns,
} from './utils';

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true });
    const fileGroupsYaml = core.getInput('file-groups');
    const defaultGroupLabel = core.getInput('default-group-label') || 'Changed';
    const globalIgnoreWhitespace =
      core.getInput('ignore-whitespace') === 'true';
    const commentHeader = core.getInput('comment-header');

    // Parse file groups configuration
    let config;
    try {
      config = parseFileGroups(
        fileGroupsYaml,
        defaultGroupLabel,
        globalIgnoreWhitespace
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown error';
      core.setFailed(`Failed to parse file-groups configuration: ${message}`);
      return;
    }

    // Validate glob patterns from all groups
    for (const group of config.groups) {
      const patternErrors = validateGlobPatterns(group.patterns);
      for (const error of patternErrors) {
        core.warning(`Invalid pattern in group "${group.label}": ${error}`);
      }
    }

    const octokit = github.getOctokit(token);
    const context = github.context;

    if (!context.payload.pull_request) {
      core.setFailed('This action can only be run on pull_request events');
      return;
    }

    const prNumber = context.payload.pull_request.number;
    const baseSha = context.payload.pull_request.base.sha as string;
    const headSha = context.payload.pull_request.head.sha as string;
    const owner = context.repo.owner;
    const repo = context.repo.repo;

    core.info(`Processing PR #${prNumber} in ${owner}/${repo}`);

    // Log configuration
    if (config.groups.length > 0) {
      core.info(`File groups configured: ${config.groups.length}`);
      for (const group of config.groups) {
        core.info(
          `  - "${group.label}": ${group.patterns.length} pattern(s), count=${group.countTowardMetric}`
        );
      }
    }
    core.info(
      `Default group: "${config.defaultGroup.label}", count=${config.defaultGroup.countTowardMetric}, ignoreWhitespace=${config.defaultGroup.ignoreWhitespace}`
    );

    // Get all files changed in the PR using pagination
    const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    core.info(`Found ${files.length} changed files`);

    // Get whitespace-adjusted counts if any group uses ignore-whitespace
    const hasIgnoreWhitespace =
      config.defaultGroup.ignoreWhitespace ||
      config.groups.some(g => g.ignoreWhitespace);
    let whitespaceAdjustedCounts = null;
    if (hasIgnoreWhitespace) {
      core.info('Groups with ignore-whitespace detected, running git diff -w');
      whitespaceAdjustedCounts = await getGitWhitespaceDiff(baseSha, headSha);
      if (whitespaceAdjustedCounts) {
        core.info(
          `Got whitespace-adjusted counts for ${whitespaceAdjustedCounts.size} files`
        );
      }
    }

    // Calculate diff summary
    const summary = calculateDiffSummary(
      files,
      config,
      whitespaceAdjustedCounts
    );

    // Log grouped files
    for (const groupedFile of summary.groupedFiles) {
      const countIndicator = groupedFile.group.countTowardMetric
        ? '✓'
        : '○ (not counted)';
      core.info(`${countIndicator} ${groupedFile.group.label}:`);
      for (const file of groupedFile.files) {
        core.info(
          `    ${file.filename} (+${file.additions} -${file.deletions})`
        );
      }
    }

    // Set outputs
    core.setOutput('added-lines', summary.addedLines);
    core.setOutput('removed-lines', summary.removedLines);

    core.setOutput('uncounted-added-lines', summary.uncountedAddedLines);
    core.setOutput('uncounted-removed-lines', summary.uncountedRemovedLines);
    core.setOutput('total-files', summary.totalFiles);

    // Generate comment body
    const commentBody = generateCommentBody(
      summary,
      commentHeader,
      owner,
      repo,
      prNumber,
      headSha
    );

    // Find existing comment
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });

    const existingComment = comments.find((comment: { body?: string | null }) =>
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
      // Provide more context for common error types
      if (error.message.includes('Bad credentials')) {
        core.setFailed(
          'GitHub token is invalid or lacks required permissions. Ensure the token has "pull-requests: read" and "issues: write" permissions.'
        );
      } else if (error.message.includes('Not Found')) {
        core.setFailed(
          `Repository or PR not found. Ensure the action is running in the correct repository context.`
        );
      } else if (error.message.includes('rate limit')) {
        core.setFailed(
          'GitHub API rate limit exceeded. Please wait before retrying.'
        );
      } else {
        core.setFailed(`Action failed: ${error.message}`);
      }
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

run();
