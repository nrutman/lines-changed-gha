import * as core from '@actions/core';
import * as github from '@actions/github';
import {
  calculateDiffSummary,
  generateCommentBody,
  validateGlobPatterns,
  COMMENT_IDENTIFIER,
  type FileChange,
} from './utils';

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true });
    const excludePatternsInput = core.getInput('exclude-patterns');
    const commentHeader = core.getInput('comment-header');

    const excludePatterns = excludePatternsInput
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    // Validate glob patterns
    const patternErrors = validateGlobPatterns(excludePatterns);
    if (patternErrors.length > 0) {
      for (const error of patternErrors) {
        core.warning(`Invalid exclude pattern: ${error}`);
      }
    }

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

    // Get all files changed in the PR using pagination
    const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    core.info(`Found ${files.length} changed files`);

    // Calculate diff summary
    const summary = calculateDiffSummary(files, excludePatterns);

    // Log included/excluded files
    for (const file of summary.includedFiles) {
      core.info(
        `✓ Included: ${file.filename} (+${file.additions} -${file.deletions})`
      );
    }
    for (const filename of summary.excludedFiles) {
      const file = files.find((f: FileChange) => f.filename === filename);
      if (file) {
        core.info(
          `✗ Excluded: ${filename} (+${file.additions} -${file.deletions})`
        );
      }
    }

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
