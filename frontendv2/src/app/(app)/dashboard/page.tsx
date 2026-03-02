"use client";

import { useQuery } from "@tanstack/react-query";
import { getPatients, getAssessments } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Activity, AlertTriangle, Search, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { AssessmentResult } from "@/lib/types";

export default function DashboardPage() {
  const [search, setSearch] = useState("");

  // Fetch all patients
  const {
    data: patients,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["patients"],
    queryFn: getPatients,
  });

  // Fetch latest assessments for all patients to derive "Attention Needed" count
  const { data: allAssessments, isLoading: isAssessmentsLoading } = useQuery({
    queryKey: ["all-assessments", patients?.map((p) => p.patient_id)],
    queryFn: async () => {
      if (!patients) return [];
      const results = await Promise.all(
        patients.map((p) => getAssessments(p.patient_id).catch(() => [])),
      );
      return results;
    },
    enabled: !!patients && patients.length > 0,
  });

  const filteredPatients =
    patients?.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.surgery_type.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  // Derived stats
  const totalPatients = patients?.length || 0;
  const attentionNeeded = allAssessments
    ? allAssessments.filter(
        (assessments) =>
          assessments.length > 0 && assessments[0].urgency_level === "high",
      ).length
    : 0;

  // Build a map: patient_id -> latest urgency level
  const urgencyByPatient = useMemo(() => {
    const map: Record<string, string> = {};
    if (patients && allAssessments) {
      patients.forEach((p, idx) => {
        const assessments = allAssessments[idx];
        if (assessments && assessments.length > 0) {
          map[p.patient_id] = assessments[0].urgency_level;
        }
      });
    }
    return map;
  }, [patients, allAssessments]);

  const getStatusColor = (patientId: string) => {
    const urgency = urgencyByPatient[patientId];
    if (urgency === "high") return "bg-red-500";
    if (urgency === "medium") return "bg-yellow-500";
    if (urgency === "low") return "bg-green-500";
    return "bg-muted-foreground/30"; // no assessment yet
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Clinician Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Overview of your patients and their wound healing progress.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Patients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-12" /> : totalPatients}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Attention Needed
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </TooltipTrigger>
                <TooltipContent>
                  Patients with high urgency assessments
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {isLoading || isAssessmentsLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                attentionNeeded
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Monitoring
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-12" /> : totalPatients}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tracking via AI assessments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Patient List */}
      <Card>
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Patients</CardTitle>
              <CardDescription>
                Manage and view patient recovery.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search patients..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button asChild size="sm" className="hidden sm:flex">
                <Link href="/patients/new">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Patient
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Surgery</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Loading Skeleton Rows
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-4 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell align="right">
                        <Skeleton className="h-8 w-16 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-destructive"
                    >
                      Error loading patients. Please check the backend
                      connection.
                    </TableCell>
                  </TableRow>
                ) : filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No patients found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.patient_id}>
                      <TableCell>
                        <div
                          className={`h-3 w-3 rounded-full ${getStatusColor(patient.patient_id)}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {patient.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{patient.surgery_type}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {patient.phone}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(patient.created_at), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/patient/${patient.patient_id}`}>
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
