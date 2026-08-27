export const GITHUB_USERNAME_MAX_LENGTH = 39;
export const GITHUB_USERNAME_PATTERN =
  /^(?!.*--)[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

export function isValidGithubUsername(value: string) {
  const normalized = value.trim();
  return (
    normalized.length > 0 &&
    normalized.length <= GITHUB_USERNAME_MAX_LENGTH &&
    GITHUB_USERNAME_PATTERN.test(normalized)
  );
}
