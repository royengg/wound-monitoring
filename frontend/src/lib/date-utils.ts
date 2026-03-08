import { formatDistanceToNow, differenceInDays, parseISO } from "date-fns";

/**
 * Safely format a date string as a relative distance (e.g., "2 hours ago").
 * Uses parseISO for timezone safety instead of new Date().
 */
export function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return "\u2014";
  }
}

/**
 * Calculate days post-op from a surgery date string.
 * Returns structured data for flexible rendering.
 */
export function getDaysPostOp(dateStr?: string): {
  days: number;
  label: string;
  suffix: string;
  type: "pre-op" | "today" | "post-op" | "unknown";
} {
  if (!dateStr) return { days: 0, label: "\u2014", suffix: "", type: "unknown" };
  try {
    const days = differenceInDays(new Date(), parseISO(dateStr));
    if (days < 0)
      return {
        days: Math.abs(days),
        label: `${Math.abs(days)}d pre-op`,
        suffix: "d pre-op",
        type: "pre-op",
      };
    if (days === 0)
      return { days: 0, label: "Today", suffix: "today", type: "today" };
    return {
      days,
      label: `${days}d post-op`,
      suffix: "d",
      type: "post-op",
    };
  } catch {
    return { days: 0, label: "\u2014", suffix: "", type: "unknown" };
  }
}
