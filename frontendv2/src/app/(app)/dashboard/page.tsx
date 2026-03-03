"use client";

import { useQuery } from "@tanstack/react-query";
import { getPatients, getAssessments } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { parseISO } from "date-fns";
import type { AssessmentResult } from "@/lib/types";
import { UrgencyBadge } from "@/components/urgency-badge";
import { timeAgo, getDaysPostOp } from "@/lib/date-utils";

const URGENCY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export default function DashboardPage() {
  const [search, setSearch] = useState("");

  const {
    data: patients,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["patients"],
    queryFn: getPatients,
  });

  const { data: allAssessments, isLoading: isAssessmentsLoading } = useQuery({
    queryKey: ["all-assessments", patients?.map((p) => p.patient_id)],
    queryFn: async () => {
      if (!patients) return [];
      return Promise.all(
        patients.map((p) => getAssessments(p.patient_id).catch(() => [])),
      );
    },
    enabled: !!patients && patients.length > 0,
  });

  // Patient ID -> latest urgency level
  const urgencyByPatient = useMemo(() => {
    const map: Record<string, string> = {};
    if (patients && allAssessments) {
      patients.forEach((p, i) => {
        const a = allAssessments[i];
        if (a?.length) map[p.patient_id] = a[0].urgency_level;
      });
    }
    return map;
  }, [patients, allAssessments]);

  // -- Stats --
  const totalPatients = patients?.length ?? 0;

  const attentionNeeded = useMemo(() => {
    if (!allAssessments) return 0;
    return allAssessments.filter(
      (a) => a.length > 0 && a[0].urgency_level === "high",
    ).length;
  }, [allAssessments]);

  const avgHealingScore = useMemo(() => {
    if (!allAssessments) return null;
    const scores = allAssessments
      .filter((a) => a.length > 0)
      .map((a) => a[0].healing_score);
    if (!scores.length) return null;
    return (scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(1);
  }, [allAssessments]);

  // -- Recent assessments (last 5 across all patients) --
  const recentAssessments = useMemo(() => {
    if (!allAssessments || !patients) return [];
    type Tagged = AssessmentResult & { patientName: string };
    const flat: Tagged[] = [];
    allAssessments.forEach((assessments, i) => {
      const name = patients[i]?.name ?? "Unknown";
      assessments.forEach((a) => flat.push({ ...a, patientName: name }));
    });
    flat.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return flat.slice(0, 5);
  }, [allAssessments, patients]);

  // -- Filtered + sorted patient list --
  const sortedPatients = useMemo(() => {
    const q = search.toLowerCase();
    const filtered =
      patients?.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.surgery_type.toLowerCase().includes(q),
      ) ?? [];

    return [...filtered].sort((a, b) => {
      const oA = URGENCY_ORDER[urgencyByPatient[a.patient_id]] ?? 3;
      const oB = URGENCY_ORDER[urgencyByPatient[b.patient_id]] ?? 3;
      if (oA !== oB) return oA - oB;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [patients, search, urgencyByPatient]);

  const statsReady = !isLoading && !isAssessmentsLoading;

  return (
    <div className="flex flex-col gap-10">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Patient overview and monitoring status.
          </p>
        </div>
        <Button asChild size="sm" className="w-fit">
          <Link href="/patients/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Patient
          </Link>
        </Button>
      </div>

      {/* ── Stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-border rounded-lg p-6">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            Patients
          </p>
          {!statsReady ? (
            <Skeleton className="mt-3 h-10 w-14" />
          ) : (
            <p className="mt-3 text-4xl font-semibold tracking-tighter font-mono">
              {totalPatients}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            Registered in system
          </p>
        </div>

        <div className="border border-border rounded-lg p-6">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            Attention
          </p>
          {!statsReady ? (
            <Skeleton className="mt-3 h-10 w-20" />
          ) : (
            <p className="mt-3 text-4xl font-semibold tracking-tighter font-mono">
              <span className={attentionNeeded > 0 ? "text-destructive" : ""}>
                {attentionNeeded}
              </span>
              <span className="text-lg font-normal text-muted-foreground ml-0.5">
                /{totalPatients}
              </span>
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            High urgency cases
          </p>
        </div>

        <div className="border border-border rounded-lg p-6">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            Healing
          </p>
          {!statsReady ? (
            <Skeleton className="mt-3 h-10 w-20" />
          ) : (
            <p className="mt-3 text-4xl font-semibold tracking-tighter font-mono">
              {avgHealingScore ?? "\u2014"}
              <span className="text-lg font-normal text-muted-foreground">
                /10
              </span>
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            Average healing score
          </p>
        </div>
      </div>

      {/* ── Patient List ───────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
            Patients
          </p>
          {!isLoading && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {sortedPatients.length}{" "}
              {sortedPatients.length === 1 ? "patient" : "patients"}
            </p>
          )}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search by name or surgery type..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Desktop table */}
        <div className="hidden md:block border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-24">Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Surgery</TableHead>
                <TableHead className="w-28">Post-Op</TableHead>
                <TableHead className="w-32">Added</TableHead>
                <TableHead className="w-16 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    Unable to load patients. Check that the backend is running.
                  </TableCell>
                </TableRow>
              ) : sortedPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <p className="text-sm text-muted-foreground">
                      {search
                        ? "No patients match your search."
                        : "No patients registered yet."}
                    </p>
                    {!search && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="mt-3"
                      >
                        <Link href="/patients/new">
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Add your first patient
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                sortedPatients.map((patient) => (
                  <TableRow key={patient.patient_id} className="group">
                    <TableCell>
                      <UrgencyBadge
                        level={urgencyByPatient[patient.patient_id]}
                        loading={isAssessmentsLoading}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {patient.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {patient.surgery_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono tabular-nums">
                      <span>{getDaysPostOp(patient.surgery_date).label}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {timeAgo(patient.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/patient/${patient.patient_id}`}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span>View</span>
                        <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="flex flex-col gap-3 md:hidden">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-5 w-36 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))
          ) : isError ? (
            <div className="border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
              Unable to load patients. Check that the backend is running.
            </div>
          ) : sortedPatients.length === 0 ? (
            <div className="border border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {search
                  ? "No patients match your search."
                  : "No patients registered yet."}
              </p>
              {!search && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  <Link href="/patients/new">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add your first patient
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            sortedPatients.map((patient) => (
              <Link
                key={patient.patient_id}
                href={`/patient/${patient.patient_id}`}
                className="block border border-border rounded-lg p-4 hover:border-foreground/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <UrgencyBadge
                    level={urgencyByPatient[patient.patient_id]}
                    loading={isAssessmentsLoading}
                  />
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    {getDaysPostOp(patient.surgery_date).label}
                  </span>
                </div>
                <p className="text-sm font-medium">{patient.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline" className="font-normal text-xs">
                    {patient.surgery_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(patient.created_at)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* ── Recent Assessments ─────────────────────────── */}
      {!isAssessmentsLoading && recentAssessments.length > 0 && (
        <section>
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-6">
            Recent Assessments
          </p>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory sm:mx-0 sm:px-0 sm:snap-none sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {recentAssessments.map((a) => (
              <Link
                key={a.assessment_id}
                href={`/patient/${a.patient_id}`}
                className="min-w-[180px] flex-shrink-0 snap-start border border-border rounded-lg p-5 hover:border-foreground/20 transition-colors sm:min-w-0"
              >
                <p className="text-sm font-medium truncate">
                  {a.patientName}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tighter font-mono">
                  {a.healing_score.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /10
                  </span>
                </p>
                <div className="flex items-center justify-between mt-3 gap-2">
                  <UrgencyBadge level={a.urgency_level} />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo(a.created_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
