"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Activity, Image as ImageIcon } from "lucide-react";

import { getAssessments, getPatient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
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

  // Prepare chart data (reverse to show chronological order)
  const chartData = assessments
    ? [...assessments].reverse().map((a) => ({
        date: format(new Date(a.created_at), "MMM d"),
        score: a.healing_score,
      }))
    : [];

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent">
          <Link
            href={`/patient/${id}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Patient
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Recovery Timeline</h1>
        <p className="text-muted-foreground">
          {isPatientLoading ? (
            <Skeleton className="h-5 w-48" />
          ) : (
            `Healing progress and assessment history for ${patient?.name}`
          )}
        </p>
      </div>

      {assessments && assessments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Healing Score Trend
            </CardTitle>
            <CardDescription>
              Overall progress of wound healing (0-10)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig}
              className="h-[300px] w-full mt-4"
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
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
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
          </CardContent>
        </Card>
      ) : isAssessmentsLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold mt-4">Assessment History</h2>

        {isAssessmentsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : assessments && assessments.length > 0 ? (
          <div className="relative border-l-2 border-muted ml-3 space-y-8 pl-6 pb-4">
            {assessments.map((assessment, index) => (
              <div key={assessment.assessment_id} className="relative">
                {/* Timeline Dot */}
                <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-background bg-primary" />

                <Card>
                  <CardHeader className="py-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {format(
                          new Date(assessment.created_at),
                          "MMMM d, yyyy 'at' h:mm a",
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Healing Score: {assessment.healing_score}/10
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        assessment.urgency_level === "high"
                          ? "destructive"
                          : assessment.urgency_level === "medium"
                            ? "secondary"
                            : "default"
                      }
                      className="capitalize"
                    >
                      {assessment.urgency_level} Urgency
                    </Badge>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                      {assessment.summary}
                    </p>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {assessment.tissue_types.map((type, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="font-normal text-xs bg-muted/50"
                        >
                          {type}
                        </Badge>
                      ))}
                      {assessment.infection_status !== "none" && (
                        <Badge
                          variant="outline"
                          className="font-normal text-xs border-destructive/50 text-destructive bg-destructive/5"
                        >
                          Infection: {assessment.infection_status}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
            <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium text-foreground">
              No assessments yet
            </h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Upload wound photos to track healing progress.
            </p>
            <Button asChild variant="outline">
              <Link href={`/patient/${id}/upload`}>Upload First Photo</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
