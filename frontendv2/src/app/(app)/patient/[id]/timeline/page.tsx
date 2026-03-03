"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format, differenceInDays, parseISO } from "date-fns";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";

import { getAssessments, getPatient } from "@/lib/api";
import type { AssessmentResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UrgencyBadge } from "@/components/urgency-badge";
import { WoundImage } from "@/components/wound-image";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig: ChartConfig = {
  score: {
    label: "Healing Score",
    color: "hsl(var(--primary))",
  },
};

export default function PatientTimelinePage() {
  const { id } = useParams<{ id: string }>();

  const { data: patient, isLoading: isPatientLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatient(id),
  });

  const { data: assessments, isLoading: isAssessmentsLoading } = useQuery({
    queryKey: ["assessments", id],
    queryFn: () => getAssessments(id),
  });

  const dataReady = !isPatientLoading && !isAssessmentsLoading;
  const hasAssessments = assessments && assessments.length > 0;
  const latestAssessment = hasAssessments ? assessments[0] : null;

  // Chart data: chronological order (oldest first)
  const chartData = assessments
    ? [...assessments].reverse().map((a) => ({
        date: format(parseISO(a.created_at), "MMM d"),
        score: a.healing_score,
      }))
    : [];

  // Stats
  const totalAssessments = assessments?.length ?? 0;
  const daysTracked = (() => {
    if (!assessments || assessments.length < 2) return null;
    const sorted = [...assessments].sort(
      (a, b) =>
        parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime(),
    );
    return differenceInDays(
      parseISO(sorted[sorted.length - 1].created_at),
      parseISO(sorted[0].created_at),
    );
  })();

  return (
    <div className="flex flex-col gap-10">
      {/* ── Back Link ──────────────────────────────────── */}
      <Link
        href={`/patient/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Patient
      </Link>

      {/* ── Header ─────────────────────────────────────── */}
      <div className="-mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Recovery Timeline
        </h1>
        <div className="text-sm text-muted-foreground mt-1">
          {isPatientLoading ? (
            <Skeleton className="h-5 w-56" />
          ) : (
            `Healing progress and assessment history for ${patient?.name}`
          )}
        </div>
      </div>

      {/* ── Stats Strip ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-border rounded-lg p-6">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            Assessments
          </p>
          {!dataReady ? (
            <Skeleton className="mt-3 h-10 w-14" />
          ) : (
            <p className="mt-3 text-4xl font-semibold tracking-tighter font-mono">
              {totalAssessments}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {totalAssessments === 1
              ? "Total assessment"
              : "Total assessments"}
          </p>
        </div>

        <div className="border border-border rounded-lg p-6">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            Latest Score
          </p>
          {!dataReady ? (
            <Skeleton className="mt-3 h-10 w-20" />
          ) : latestAssessment ? (
            <p className="mt-3 text-4xl font-semibold tracking-tighter font-mono">
              {latestAssessment.healing_score.toFixed(1)}
              <span className="text-lg font-normal text-muted-foreground">
                /10
              </span>
            </p>
          ) : (
            <p className="mt-3 text-4xl font-semibold tracking-tighter font-mono">
              {"\u2014"}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {latestAssessment ? "Healing score" : "No assessment yet"}
          </p>
        </div>

        <div className="border border-border rounded-lg p-6">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            Days Tracked
          </p>
          {!dataReady ? (
            <Skeleton className="mt-3 h-10 w-14" />
          ) : (
            <p className="mt-3 text-4xl font-semibold tracking-tighter font-mono">
              {daysTracked !== null ? (
                <>
                  {daysTracked}
                  <span className="text-lg font-normal text-muted-foreground ml-0.5">
                    d
                  </span>
                </>
              ) : (
                "\u2014"
              )}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {daysTracked !== null
              ? "Between first and last"
              : "Need 2+ assessments"}
          </p>
        </div>
      </div>

      {/* ── Healing Score Chart ────────────────────────── */}
      {isAssessmentsLoading ? (
        <section>
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">
            Healing Score Trend
          </p>
          <div className="border border-border rounded-lg p-6">
            <Skeleton className="h-[300px] w-full" />
          </div>
        </section>
      ) : hasAssessments ? (
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
              Healing Score Trend
            </p>
            <p className="text-xs text-muted-foreground">
              Scale 0&ndash;10
            </p>
          </div>
          <div className="border border-border rounded-lg p-6">
            <ChartContainer
              config={chartConfig}
              className="h-[300px] w-full"
            >
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 20, bottom: 5, left: -20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.4}
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  className="text-xs"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  className="text-xs"
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-score)"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    strokeWidth: 2,
                    fill: "hsl(var(--background))",
                  }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </section>
      ) : null}

      {/* ── Assessment History ─────────────────────────── */}
      <section>
        <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">
          Assessment History
        </p>

        {isAssessmentsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ) : hasAssessments ? (
          <div className="relative border-l-2 border-border ml-3 space-y-8 pl-6 pb-4">
            {assessments.map((assessment, index) => (
              <TimelineEntry
                key={assessment.assessment_id}
                assessment={assessment}
                isLatest={index === 0}
              />
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-base font-medium text-foreground">
              No assessments yet
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Upload wound photos to track healing progress.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={`/patient/${id}/upload`}>Upload First Photo</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function TimelineEntry({
  assessment,
  isLatest,
}: {
  assessment: AssessmentResult;
  isLatest: boolean;
}) {
  const dateStr = format(
    parseISO(assessment.created_at),
    "MMMM d, yyyy 'at' h:mm a",
  );

  return (
    <div className="relative">
      {/* Timeline Dot */}
      <div
        className={`absolute -left-[31px] top-5 h-4 w-4 rounded-full border-2 border-background ${
          isLatest ? "bg-primary" : "bg-muted-foreground/40"
        }`}
      />

      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header: Date + Urgency */}
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-medium">{dateStr}</p>
            {assessment.days_post_op != null && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Day {assessment.days_post_op} post-op
              </p>
            )}
          </div>
          <UrgencyBadge level={assessment.urgency_level} />
        </div>

        <div className="h-px bg-border" />

        {/* Healing Score */}
        <div className="px-6 py-4 flex items-baseline gap-1.5">
          <span className="text-xs text-muted-foreground">Healing</span>
          <span className="text-lg font-semibold tracking-tighter font-mono ml-auto">
            {assessment.healing_score.toFixed(1)}
            <span className="text-sm font-normal text-muted-foreground">
              /10
            </span>
          </span>
        </div>

        {/* Wound Image */}
        {assessment.image_url && (
          <>
            <div className="h-px bg-border" />
            <div className="p-6">
              <div className="rounded-lg overflow-hidden border border-border bg-muted/30 flex items-center justify-center">
                <WoundImage
                  src={assessment.image_url}
                  alt={`Wound assessment from ${format(parseISO(assessment.created_at), "MMM d, yyyy")}`}
                  className="max-h-56 object-contain w-full"
                />
              </div>
            </div>
          </>
        )}

        {/* Summary */}
        <div className="h-px bg-border" />
        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed">{assessment.summary}</p>
        </div>

        {/* Tissue Types + Infection */}
        {(assessment.tissue_types.length > 0 ||
          (assessment.infection_status &&
            assessment.infection_status !== "none")) && (
          <>
            <div className="h-px bg-border" />
            <div className="px-6 py-4 flex flex-col gap-3">
              {assessment.tissue_types.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">
                    Tissue
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {assessment.tissue_types.map((type, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground capitalize"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {assessment.infection_status &&
                assessment.infection_status !== "none" && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">
                      Infection
                    </span>
                    <span className="inline-flex items-center rounded-full bg-destructive/10 text-destructive px-2.5 py-0.5 text-xs font-medium capitalize">
                      {assessment.infection_status}
                    </span>
                  </div>
                )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
