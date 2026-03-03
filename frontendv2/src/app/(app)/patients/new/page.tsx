"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, Loader2 } from "lucide-react";
import Link from "next/link";

import { createPatient } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const patientFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  age: z.number().min(0).max(120),
  gender: z.string().optional(),
  phone: z
    .string()
    .min(10, { message: "Enter a valid phone number with country code." }),
  surgery_type: z.string().min(2, { message: "Surgery type is required." }),
  surgery_date: z.date(),
  wound_location: z.string().optional(),
  language_preference: z.string().optional(),
  risk_factors: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

export default function AddPatientPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: "",
      age: undefined as unknown as number,
      gender: "unspecified",
      phone: "+91",
      surgery_type: "",
      surgery_date: new Date(),
      wound_location: "",
      language_preference: "en",
      risk_factors: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      toast.success("Patient registered successfully.");
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      router.push("/dashboard");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        "Failed to create patient. Please check the backend connection.",
      );
    },
  });

  function onSubmit(data: PatientFormValues) {
    const payload = {
      ...data,
      surgery_date: format(data.surgery_date, "yyyy-MM-dd"),
      risk_factors: data.risk_factors
        ? data.risk_factors
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    };

    mutation.mutate(payload);
  }

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Page header */}
      <div className="mb-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Register Patient
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new patient to track their post-operative wound healing.
        </p>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="border border-border rounded-lg">
            {/* Section 1: Personal Information */}
            <div className="p-6">
              <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-5">
                Personal Information
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Priya Sharma" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 9876543210" {...field} />
                      </FormControl>
                      <FormDescription>
                        Include country code for voice calls.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 45"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(
                                val === "" ? undefined : parseInt(val, 10),
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="unspecified">
                              Prefer not to say
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border" />

            {/* Section 2: Surgery Details */}
            <div className="p-6">
              <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-5">
                Surgery Details
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <FormField
                  control={form.control}
                  name="surgery_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surgery Type</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Appendectomy, C-Section"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="surgery_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-1">
                      <FormLabel>Surgery Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wound_location"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Wound Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Lower right abdomen"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border" />

            {/* Section 3: Preferences & Risk Factors */}
            <div className="p-6">
              <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-5">
                Preferences & Risk Factors
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <FormField
                  control={form.control}
                  name="language_preference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Language</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="hi">Hindi</SelectItem>
                          <SelectItem value="mr">Marathi</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        For voice agent communication.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="risk_factors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Factors</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Diabetes, Smoking"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Comma-separated list (optional).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border" />

            {/* Footer: Actions */}
            <div className="flex items-center justify-end gap-3 p-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/dashboard")}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Register Patient"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
