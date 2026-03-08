"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPatient,
  getAssessments,
  triggerVoiceCall,
  getVoiceCalls,
} from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  PhoneCall,
  UploadCloud,
  Activity,
  AlertTriangle,
  ChevronDown,
  Clock,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { UrgencyText } from "@/components/urgency-badge";
import { WoundImage } from "@/components/wound-image";
import { timeAgo, getDaysPostOp } from "@/lib/date-utils";
import type { VoiceCallRecord } from "@/lib/types";

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const {
    data: patient,
    isLoading: isPatientLoading,
    isError: isPatientError,
  } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatient(id),
  });

  const { data: assessments, isLoading: isAssessmentsLoading } = useQuery({
    queryKey: ["assessments", id],
    queryFn: () => getAssessments(id),
  });

  const { data: voiceCalls, isLoading: isVoiceCallsLoading, isError: isVoiceCallsError } = useQuery({
    queryKey: ["voiceCalls", id],
    queryFn: () => getVoiceCalls(id),
  });

  const callMutation = useMutation({
    mutationFn: (patientId: string) => triggerVoiceCall(patientId),
    onSuccess: () => {
      toast.success("Voice call initiated.");
      queryClient.invalidateQueries({ queryKey: ["voiceCalls", id] });
    },
    onError: () => {
      toast.error("Failed to initiate voice call.");
    },
  });

  if (isPatientError) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Patient Not Found</h2>
        <p className="text-muted-foreground mb-4">
          Could not load details for this patient.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const latestAssessment =
    assessments && assessments.length > 0 ? assessments[0] : null;
  const dataReady = !isPatientLoading && !isAssessmentsLoading;

  return (
    <div className="flex flex-col gap-10">
      {/* ── Back Link ──────────────────────────────────── */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Dashboard
      </Link>

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between -mt-4">
        <div>
          {isPatientLoading ? (
            <>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">
                {patient?.name}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span>
                  {patient?.age} yrs
                  {patient?.gender ? ` · ${patient.gender}` : ""}
                </span>
                <span>·</span>
                <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-normal">
                  {patient?.surgery_type}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Button asChild variant="outline" size="sm">
            <Link href={`/patient/${id}/timeline`}>
              <Activity className="mr-1.5 h-3.5 w-3.5" />
              Timeline
            </Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => callMutation.mutate(id)}
            disabled={callMutation.isPending || isPatientLoading}
          >
            {callMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <PhoneCall className="mr-1.5 h-3.5 w-3.5" />
            )}
            {callMutation.isPending ? "Calling..." : "Call Patient"}
          </Button>
          <Button asChild size="sm">
            <Link href={`/patient/${id}/upload`}>
              <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
              New Upload
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Overview Stats ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-border rounded-lg p-6">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            Healing
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
            {latestAssessment ? "Latest healing score" : "No assessment yet"}
          </p>
        </div>

        <div className="border border-border rounded-lg p-6">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            Urgency
          </p>
          {!dataReady ? (
            <Skeleton className="mt-3 h-10 w-20" />
          ) : latestAssessment ? (
            <UrgencyText level={latestAssessment.urgency_level} />
          ) : (
            <p className="mt-3 text-4xl font-semibold tracking-tighter font-mono">
              {"\u2014"}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {latestAssessment ? "Current urgency level" : "Awaiting assessment"}
          </p>
        </div>

        <div className="border border-border rounded-lg p-6">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            Post-Op
          </p>
          {!dataReady ? (
            <Skeleton className="mt-3 h-10 w-14" />
          ) : (
            <p className="mt-3 text-4xl font-semibold tracking-tighter font-mono">
              {(() => {
                const postOp = getDaysPostOp(patient?.surgery_date);
                if (postOp.type === "unknown") return "\u2014";
                if (postOp.type === "today")
                  return (
                    <>
                      0
                      <span className="text-lg font-normal text-muted-foreground ml-0.5">
                        today
                      </span>
                    </>
                  );
                return (
                  <>
                    {postOp.days}
                    <span className="text-lg font-normal text-muted-foreground ml-0.5">
                      {postOp.type === "pre-op" ? "d pre-op" : "d"}
                    </span>
                  </>
                );
              })()}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {patient?.surgery_date
              ? format(parseISO(patient.surgery_date), "MMM d, yyyy")
              : "Surgery date not set"}
          </p>
        </div>
      </div>

      {/* ── Patient Info + Latest Assessment ────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patient Information */}
        <div className="md:col-span-1">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-5">
            Patient Information
          </p>
          <div className="border border-border rounded-lg">
            {isPatientLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <>
                <InfoRow label="Phone" value={patient?.phone ?? "N/A"} />
                <div className="h-px bg-border" />
                <InfoRow
                  label="Surgery Date"
                  value={
                    patient?.surgery_date
                      ? format(parseISO(patient.surgery_date), "MMM d, yyyy")
                      : "N/A"
                  }
                />
                <div className="h-px bg-border" />
                <InfoRow
                  label="Wound Location"
                  value={patient?.wound_location || "Not specified"}
                />
                <div className="h-px bg-border" />
                <InfoRow
                  label="Language"
                  value={(
                    patient?.language_preference || "EN"
                  ).toUpperCase()}
                />
                {patient?.risk_factors &&
                  patient.risk_factors.length > 0 && (
                    <>
                      <div className="h-px bg-border" />
                      <div className="px-6 py-4">
                        <p className="text-xs text-muted-foreground mb-2">
                          Risk Factors
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {patient.risk_factors.map((factor, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                            >
                              {factor}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
              </>
            )}
          </div>
        </div>

        {/* Latest Assessment */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
              Latest Assessment
            </p>
            {latestAssessment && (
              <p className="text-xs text-muted-foreground">
                {timeAgo(latestAssessment.created_at)}
              </p>
            )}
          </div>

          {isAssessmentsLoading ? (
            <div className="border border-border rounded-lg p-6 space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ) : latestAssessment ? (
            <div className="border border-border rounded-lg">
              {/* Wound Image */}
              {latestAssessment.image_url && (
                <>
                  <div className="p-6">
                    <div className="rounded-lg overflow-hidden border border-border bg-muted/30 flex items-center justify-center">
                      <WoundImage
                        src={latestAssessment.image_url}
                        alt="Latest wound assessment"
                        className="max-h-72 object-contain w-full"
                      />
                    </div>
                  </div>
                  <div className="h-px bg-border" />
                </>
              )}

              {/* Summary */}
              <div className="px-6 py-5">
                <p className="text-sm leading-relaxed">
                  {latestAssessment.summary}
                </p>
              </div>
              <div className="h-px bg-border" />

              {/* Infection + Tissue Types */}
              <div className="px-6 py-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">
                    Infection
                  </span>
                  <InfectionBadge
                    status={latestAssessment.infection_status}
                  />
                </div>
                {latestAssessment.tissue_types.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">
                      Tissue
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {latestAssessment.tissue_types.map((t, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground capitalize"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center py-12 text-center">
              <UploadCloud className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-base font-medium text-foreground">
                No assessment yet
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Upload the first wound photo to generate an AI assessment.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/patient/${id}/upload`}>Upload Photo</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Anomalies ──────────────────────────────────── */}
      {latestAssessment?.anomalies &&
        latestAssessment.anomalies.length > 0 && (
          <section>
            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-5">
              Anomalies
            </p>
            <div className="border border-destructive/20 bg-destructive/[0.03] rounded-lg px-6 py-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="flex flex-col gap-2">
                  {latestAssessment.anomalies.map((anomaly, i) => (
                    <p key={i} className="text-sm">
                      {anomaly}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

      {/* ── Recommendations ────────────────────────────── */}
      {latestAssessment?.recommendations &&
        latestAssessment.recommendations.length > 0 && (
          <section>
            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-5">
              Recommendations
            </p>
            <div className="border border-border rounded-lg">
              {latestAssessment.recommendations.map((rec, i) => (
                <div key={i}>
                  {i > 0 && <div className="h-px bg-border" />}
                  <div className="px-6 py-4 flex items-start gap-4">
                    <span className="text-xs font-mono text-muted-foreground tabular-nums mt-0.5 shrink-0 w-5 text-right">
                      {i + 1}
                    </span>
                    <p className="text-sm">{rec}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      {/* ── PWAT Scores ────────────────────────────────── */}
      {latestAssessment?.pwat_scores && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
              PWAT Scores
            </p>
            <p className="text-sm font-mono tabular-nums">
              <span className="font-semibold">
                {latestAssessment.pwat_scores.total_score ?? "N/A"}
              </span>
              <span className="text-muted-foreground">/32</span>
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden">
            {[
              {
                label: "Size",
                value: latestAssessment.pwat_scores.size,
                max: 4,
              },
              {
                label: "Depth",
                value: latestAssessment.pwat_scores.depth,
                max: 4,
              },
              {
                label: "Necrotic Type",
                value: latestAssessment.pwat_scores.necrotic_tissue_type,
                max: 4,
              },
              {
                label: "Necrotic Amt",
                value: latestAssessment.pwat_scores.necrotic_tissue_amount,
                max: 4,
              },
              {
                label: "Gran. Type",
                value: latestAssessment.pwat_scores.granulation_tissue_type,
                max: 4,
              },
              {
                label: "Gran. Amt",
                value: latestAssessment.pwat_scores.granulation_tissue_amount,
                max: 4,
              },
              {
                label: "Edges",
                value: latestAssessment.pwat_scores.edges,
                max: 4,
              },
              {
                label: "Periulcer Skin",
                value:
                  latestAssessment.pwat_scores.periulcer_skin_viability,
                max: 2,
              },
            ].map((item) => (
              <div key={item.label} className="bg-background p-6">
                <p className="text-xs text-muted-foreground mb-2">
                  {item.label}
                </p>
                <p className="text-xl font-semibold tracking-tighter font-mono">
                  {item.value}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{item.max}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Last Voice Call ─────────────────────────────── */}
      <VoiceCallSection
        calls={voiceCalls}
        isLoading={isVoiceCallsLoading}
        isError={isVoiceCallsError}
      />
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function InfectionBadge({ status }: { status?: string | null }) {
  const isInfected = status && status !== "none";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        isInfected
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

function VoiceCallSection({
  calls,
  isLoading,
  isError,
}: {
  calls?: VoiceCallRecord[];
  isLoading: boolean;
  isError: boolean;
}) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  if (isLoading) {
    return (
      <section>
        <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-5">
          Last Voice Call
        </p>
        <div className="border border-border rounded-lg p-6 space-y-4">
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </section>
    );
  }

  if (!calls || calls.length === 0) {
    if (isError) {
      return (
        <section>
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-5">
            Last Voice Call
          </p>
          <div className="border border-destructive/20 bg-destructive/[0.03] rounded-lg flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-8 w-8 text-destructive/50 mb-3" />
            <p className="text-base font-medium text-foreground">
              Failed to load voice calls
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Could not retrieve call history. Please try again later.
            </p>
          </div>
        </section>
      );
    }
    return (
      <section>
        <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-5">
          Last Voice Call
        </p>
        <div className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center py-12 text-center">
          <PhoneCall className="h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-base font-medium text-foreground">
            No voice calls yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Use the &quot;Call Patient&quot; button to initiate a voice call.
          </p>
        </div>
      </section>
    );
  }

  const latestCall = calls[0];
  const isInProgress =
    latestCall.status === "initiated" || latestCall.status === "in-progress";
  const hasEnded = latestCall.status === "ended";

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
          Last Voice Call
        </p>
        {latestCall.created_at && (
          <p className="text-xs text-muted-foreground">
            {timeAgo(latestCall.created_at)}
          </p>
        )}
      </div>

      <div className="border border-border rounded-lg">
        {/* Status + Review Badge Row */}
        <div className="px-6 py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {isInProgress ? (
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                Call in progress...
              </span>
            ) : latestCall.status === "failed" ? (
              <span className="inline-flex items-center rounded-full bg-destructive/10 text-destructive px-2.5 py-0.5 text-xs font-medium">
                Call Failed
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-xs font-medium">
                Completed
              </span>
            )}

            {hasEnded && latestCall.supervisor_review_needed != null && (
              latestCall.supervisor_review_needed ? (
                <span className="inline-flex items-center rounded-full bg-destructive/10 text-destructive px-2.5 py-0.5 text-xs font-medium">
                  Review Needed
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-xs font-medium">
                  No Review Needed
                </span>
              )
            )}
          </div>

          {/* Duration + Timestamp metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {latestCall.duration_seconds != null && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(latestCall.duration_seconds)}
              </span>
            )}
            {latestCall.created_at && (
              <span>
                {(() => {
                  try {
                    return format(
                      parseISO(latestCall.created_at),
                      "MMM d, yyyy 'at' h:mm a",
                    );
                  } catch {
                    return latestCall.created_at;
                  }
                })()}
              </span>
            )}
          </div>
        </div>

        {/* Call Summary */}
        {hasEnded && latestCall.summary && (
          <>
            <div className="h-px bg-border" />
            <div className="px-6 py-5">
              <p className="text-xs text-muted-foreground mb-2">Summary</p>
              <p className="text-sm leading-relaxed">{latestCall.summary}</p>
            </div>
          </>
        )}

        {/* In-progress message */}
        {isInProgress && (
          <>
            <div className="h-px bg-border" />
            <div className="px-6 py-5">
              <p className="text-sm text-muted-foreground">
                The voice call is currently active. Results will appear here once the call ends.
              </p>
            </div>
          </>
        )}

        {/* Collapsible Transcript */}
        {hasEnded && latestCall.transcript && (
          <>
            <div className="h-px bg-border" />
            <Collapsible open={transcriptOpen} onOpenChange={setTranscriptOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors">
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Transcript
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                      transcriptOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="h-px bg-border" />
                <div className="px-6 py-5">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-mono text-muted-foreground">
                    {latestCall.transcript}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>
    </section>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
