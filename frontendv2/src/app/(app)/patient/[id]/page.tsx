"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { getPatient, getAssessments, triggerVoiceCall } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  PhoneCall,
  UploadCloud,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UrgencyText } from "@/components/urgency-badge";
import { WoundImage } from "@/components/wound-image";
import { timeAgo, getDaysPostOp } from "@/lib/date-utils";

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();

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

  const callMutation = useMutation({
    mutationFn: (patientId: string) => triggerVoiceCall(patientId),
    onSuccess: () => {
      toast.success("Voice call initiated.");
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
            <PhoneCall className="mr-1.5 h-3.5 w-3.5" />
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
              ? format(new Date(patient.surgery_date), "MMM d, yyyy")
              : "Surgery date not set"}
          </p>
        </div>
      </div>

      {/* ── Patient Info + Latest Assessment ────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patient Information */}
        <div className="md:col-span-1">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">
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
                      ? format(new Date(patient.surgery_date), "MMM d, yyyy")
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
            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">
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
            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">
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
              <div key={item.label} className="bg-background p-5">
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
