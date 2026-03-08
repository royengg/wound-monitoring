"use client";

import { Skeleton } from "@/components/ui/skeleton";

const BADGE_CONFIG: Record<string, { className: string; label: string }> = {
  high: { className: "bg-destructive/10 text-destructive", label: "High" },
  medium: {
    className: "bg-foreground/[0.06] text-foreground",
    label: "Medium",
  },
  low: { className: "bg-muted text-muted-foreground", label: "Low" },
};

const DEFAULT_BADGE = {
  className: "bg-muted text-muted-foreground/60",
  label: "New",
};

const TEXT_CONFIG: Record<string, { className: string; label: string }> = {
  high: { className: "text-destructive", label: "High" },
  medium: { className: "text-foreground", label: "Medium" },
  low: { className: "text-muted-foreground", label: "Low" },
};

const DEFAULT_TEXT = { className: "text-muted-foreground", label: "Unknown" };

/**
 * Pill-style badge for urgency level.
 * Used in dashboard table, mobile cards, recent assessments, and timeline entries.
 */
export function UrgencyBadge({
  level,
  loading,
}: {
  level?: string;
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-5 w-14 rounded-full" />;

  const { className, label } =
    level && BADGE_CONFIG[level] ? BADGE_CONFIG[level] : DEFAULT_BADGE;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

/**
 * Large text display for urgency level.
 * Used in patient detail stat cards.
 */
export function UrgencyText({ level }: { level: string }) {
  const { className, label } = TEXT_CONFIG[level] ?? DEFAULT_TEXT;

  return (
    <p
      className={`mt-3 text-4xl font-semibold tracking-tighter font-mono ${className}`}
    >
      {label}
    </p>
  );
}
