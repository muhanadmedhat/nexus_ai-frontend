import { clsx } from "clsx";
import {
  ExternalLink,
  FileText,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Image as ImageIcon,
} from "lucide-react";
import type { ProjectSubmission } from "@/types/delivery";

interface EvidenceItem {
  key: string;
  label: string;
  value: string;
  href?: string;
  icon: React.ReactNode;
}

function collectEvidence(submission: Pick<
  ProjectSubmission,
  "repoUrl" | "branchName" | "pullRequestUrl" | "commitSha" | "fileUrls"
>): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  if (submission.repoUrl) {
    items.push({
      key: "repo",
      label: "Repository",
      value: submission.repoUrl,
      href: submission.repoUrl,
      icon: <ExternalLink size={15} aria-hidden />,
    });
  }

  if (submission.branchName) {
    items.push({
      key: "branch",
      label: "Branch",
      value: submission.branchName,
      icon: <GitBranch size={15} aria-hidden />,
    });
  }

  if (submission.pullRequestUrl) {
    items.push({
      key: "pr",
      label: "Pull request",
      value: submission.pullRequestUrl,
      href: submission.pullRequestUrl,
      icon: <GitPullRequest size={15} aria-hidden />,
    });
  }

  if (submission.commitSha) {
    items.push({
      key: "commit",
      label: "Commit",
      value: submission.commitSha,
      icon: <GitCommit size={15} aria-hidden />,
    });
  }

  const screenshots = submission.fileUrls?.screenshots ?? [];
  screenshots.forEach((url, index) => {
    items.push({
      key: `screenshot-${index}`,
      label: screenshots.length > 1 ? `Screenshot ${index + 1}` : "Screenshot",
      value: url,
      href: url,
      icon: <ImageIcon size={15} aria-hidden />,
    });
  });

  const attachments = submission.fileUrls?.attachments ?? [];
  attachments.forEach((url, index) => {
    items.push({
      key: `attachment-${index}`,
      label: attachments.length > 1 ? `Attachment ${index + 1}` : "Attachment",
      value: url,
      href: url,
      icon: <FileText size={15} aria-hidden />,
    });
  });

  return items;
}

/**
 * Repo, branch, pull request, commit and file evidence attached to a
 * submission. Used by the freelancer task page, the customer delivery
 * workspace, and the admin review screens.
 */
export function EvidenceList({
  submission,
  emptyLabel = "No evidence attached yet.",
  className,
}: {
  submission: Pick<
    ProjectSubmission,
    "repoUrl" | "branchName" | "pullRequestUrl" | "commitSha" | "fileUrls"
  >;
  emptyLabel?: string;
  className?: string;
}) {
  const items = collectEvidence(submission);

  if (!items.length) {
    return <p className={clsx("text-sm text-on-surface-variant", className)}>{emptyLabel}</p>;
  }

  return (
    <ul className={clsx("flex flex-col gap-2", className)}>
      {items.map((item) => (
        <li
          key={item.key}
          className="flex items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2"
        >
          <span className="shrink-0 text-outline">{item.icon}</span>
          <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {item.label}
          </span>
          {item.href ? (
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 truncate text-sm text-primary-container underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {item.value}
            </a>
          ) : (
            <span className="min-w-0 truncate font-mono text-sm text-on-surface">{item.value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
