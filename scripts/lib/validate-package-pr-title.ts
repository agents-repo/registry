import { readFileSync } from 'node:fs';

const PACKAGE_PR_TITLE_PATTERN = /^(feat|fix)\(package\): /;

interface PullRequestEventPayload {
  readonly pull_request?: {
    readonly title?: string;
  };
}

export const isValidPackagePrTitle = (title: string): boolean =>
  PACKAGE_PR_TITLE_PATTERN.test(title);

export const validatePackagePrTitleFromEventPath = (
  eventPath: string | undefined,
  eventName: string | undefined,
): void => {
  if (eventName !== 'pull_request' || eventPath === undefined || eventPath.length === 0) {
    return;
  }

  let payload: PullRequestEventPayload;
  try {
    payload = JSON.parse(readFileSync(eventPath, 'utf8')) as PullRequestEventPayload;
  } catch {
    console.error('Failed to read GitHub event payload for package PR title validation.');
    process.exit(1);
  }

  const title = payload.pull_request?.title?.trim() ?? '';
  if (title.length === 0) {
    console.error('GitHub pull_request event is missing pull_request.title.');
    process.exit(1);
  }

  if (!isValidPackagePrTitle(title)) {
    console.error(
      'Package PR title must start with feat(package): or fix(package): for semantic-release.',
    );
    console.error(`Current title: ${title}`);
    process.exit(1);
  }
};

export const validatePackagePrTitleFromCiEnv = (): void => {
  if (process.env.SKIP_PACKAGE_PR_TITLE_CHECK === '1') {
    return;
  }

  validatePackagePrTitleFromEventPath(
    process.env.GITHUB_EVENT_PATH,
    process.env.GITHUB_EVENT_NAME,
  );
};
