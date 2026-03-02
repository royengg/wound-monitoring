"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { getPatient, getAssessments, triggerVoiceCall } from "@/lib/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
  AlertCircle,
  Calendar,
  PhoneCall,
  UploadCloud,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function PatientHomePage() {
  const { id } = useParams<{ id: string }>();

  // Fetch Patient Details
  const {
    data: patient,
    isLoading: isPatientLoading,
    isError: isPatientError,
  } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatient(id),
  });

  // Fetch Latest Assessments
  const { data: assessments, isLoading: isAssessmentsLoading } = useQuery({
    queryKey: ["assessments", id],
    queryFn: () => getAssessments(id),
  });

  // Call Voice Agent Mutation
  const callMutation = useMutation({
    mutationFn: (patientId: string) => triggerVoiceCall(patientId),
    onSuccess: (data) => {
      toast.success("Voice call initiated!");
      console.log("Call response:", data);
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        "Failed to initiate voice call. Ensure ElevenLabs is configured.",
      );
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
          <a href="/dashboard">Return to Dashboard</a>
        </Button>
      </div>
    );
  }

  // Derived state
  const latestAssessment =
    assessments && assessments.length > 0 ? assessments[0] : null;
  const urgencyColor =
    latestAssessment?.urgency_level === "high"
      ? "destructive"
      : latestAssessment?.urgency_level === "medium"
        ? "secondary"
        : "default";

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isPatientLoading ? (
              <Skeleton className="h-9 w-48" />
            ) : (
              patient?.name
            )}
          </h1>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            {isPatientLoading ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              <>
                <Badge variant="outline">{patient?.surgery_type}</Badge>
                <span>•</span>
                <span>
                  {patient?.age} yrs, {patient?.gender}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={`/patient/${id}/timeline`}>
              <Activity className="mr-2 h-4 w-4" />
              Timeline
            </a>
          </Button>
          <Button
            variant="secondary"
            onClick={() => callMutation.mutate(id)}
            disabled={callMutation.isPending || isPatientLoading}
          >
            <PhoneCall className="mr-2 h-4 w-4" />
            {callMutation.isPending ? "Calling..." : "Call Patient"}
          </Button>
          <Button asChild>
            <a href={`/patient/${id}/upload`}>
              <UploadCloud className="mr-2 h-4 w-4" />
              New Upload
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patient Details Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPatientLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground text-sm">Phone</span>
                  <span className="font-medium text-sm text-right">
                    {patient?.phone}
                  </span>
                </div>
                <Separator />
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground text-sm">
                    Surgery Date
                  </span>
                  <span className="font-medium text-sm text-right">
                    {patient?.surgery_date
                      ? format(new Date(patient.surgery_date), "MMM d, yyyy")
                      : "N/A"}
                  </span>
                </div>
                <Separator />
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground text-sm">
                    Wound Location
                  </span>
                  <span className="font-medium text-sm text-right">
                    {patient?.wound_location || "Not specified"}
                  </span>
                </div>
                <Separator />
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground text-sm">
                    Language
                  </span>
                  <span className="font-medium text-sm text-right uppercase">
                    {patient?.language_preference || "EN"}
                  </span>
                </div>

                {patient?.risk_factors && patient.risk_factors.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <span className="text-muted-foreground text-sm">
                        Risk Factors
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {patient.risk_factors.map((factor, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Latest Assessment Summary */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-lg">Latest Assessment</CardTitle>
                <CardDescription>
                  {isAssessmentsLoading ? (
                    <Skeleton className="h-4 w-32" />
                  ) : latestAssessment ? (
                    `Analyzed ${formatDistanceToNow(new Date(latestAssessment.created_at), { addSuffix: true })}`
                  ) : (
                    "No assessments recorded yet."
                  )}
                </CardDescription>
              </div>
              {latestAssessment && (
                <Badge variant={urgencyColor as any} className="capitalize">
                  {latestAssessment.urgency_level} Urgency
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {isAssessmentsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              )               : latestAssessment ? (
                <div className="space-y-6">
                  {/* Wound Image */}
                  {latestAssessment.image_url && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Wound Photo
                      </span>
                      <div className="rounded-lg overflow-hidden border border-border bg-black/5 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={latestAssessment.image_url}
                          alt="Latest wound assessment"
                          className="max-h-64 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Healing Score + Days Post-Op */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Healing Score</span>
                      <div className="flex items-center gap-3">
                        {latestAssessment.days_post_op != null && (
                          <span className="text-xs text-muted-foreground">
                            Day {latestAssessment.days_post_op} post-op
                          </span>
                        )}
                        <span className="font-bold">
                          {latestAssessment.healing_score}/10
                        </span>
                      </div>
                    </div>
                    {/* Linear mapping 0-10 -> 0-100 */}
                    <Progress
                      value={latestAssessment.healing_score * 10}
                      className="h-3"
                    />
                  </div>

                  {/* Summary Text */}
                  <p className="text-sm">{latestAssessment.summary}</p>

                  {/* Badges / Classification */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20">
                        Infection:
                      </span>
                      <Badge
                        variant={
                          latestAssessment.infection_status !== "none"
                            ? "destructive"
                            : "outline"
                        }
                        className="font-normal capitalize"
                      >
                        {latestAssessment.infection_status || "Unknown"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground w-20">
                        Tissue:
                      </span>
                      {latestAssessment.tissue_types.map((t, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="font-normal"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Alerts for Anomalies */}
                  {latestAssessment.anomalies &&
                    latestAssessment.anomalies.length > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Attention Required</AlertTitle>
                        <AlertDescription className="mt-2 flex flex-col gap-1">
                          {latestAssessment.anomalies.map((a, i) => (
                            <span
                              key={i}
                              className="text-xs flex items-center gap-2"
                            >
                              <div className="h-1 w-1 bg-destructive rounded-full" />
                              {a}
                            </span>
                          ))}
                        </AlertDescription>
                      </Alert>
                    )}

                  {/* Recommendations */}
                  {latestAssessment.recommendations &&
                    latestAssessment.recommendations.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <ListChecks className="h-4 w-4" />
                          Recommendations
                        </span>
                        <ul className="space-y-2">
                          {latestAssessment.recommendations.map((rec, i) => (
                            <li
                              key={i}
                              className="text-sm flex items-start gap-2"
                            >
                              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* PWAT Scores */}
                  {latestAssessment.pwat_scores && (
                    <div className="space-y-3">
                      <span className="text-sm font-medium">
                        PWAT Scores (Total:{" "}
                        {latestAssessment.pwat_scores.total_score ?? "N/A"}/32)
                      </span>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        {[
                          { label: "Size", value: latestAssessment.pwat_scores.size, max: 4 },
                          { label: "Depth", value: latestAssessment.pwat_scores.depth, max: 4 },
                          { label: "Necrotic Tissue Type", value: latestAssessment.pwat_scores.necrotic_tissue_type, max: 4 },
                          { label: "Necrotic Tissue Amount", value: latestAssessment.pwat_scores.necrotic_tissue_amount, max: 4 },
                          { label: "Granulation Type", value: latestAssessment.pwat_scores.granulation_tissue_type, max: 4 },
                          { label: "Granulation Amount", value: latestAssessment.pwat_scores.granulation_tissue_amount, max: 4 },
                          { label: "Edges", value: latestAssessment.pwat_scores.edges, max: 4 },
                          { label: "Periulcer Skin", value: latestAssessment.pwat_scores.periulcer_skin_viability, max: 2 },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between"
                          >
                            <span className="text-muted-foreground">
                              {item.label}
                            </span>
                            <span className="font-medium">
                              {item.value}/{item.max}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg border-muted">
                  <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload the first wound photo to generate an AI assessment.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <a href={`/patient/${id}/upload`}>Upload Photo</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
