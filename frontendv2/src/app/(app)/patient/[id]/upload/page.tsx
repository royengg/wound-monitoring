"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  Loader2,
  Image as ImageIcon,
  ArrowLeft,
  Sun,
  Focus,
  Ruler,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { uploadWoundPhoto } from "@/lib/api";
import { Button } from "@/components/ui/button";

/* ── Helpers ────────────────────────────────────────────── */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Unsupported format. Please use JPEG, PNG, or WEBP.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File is too large. Maximum size is 10 MB.";
  }
  return null;
}

/* ── Processing Steps ───────────────────────────────────── */

const PROCESSING_STEPS = [
  { label: "Uploading image", description: "Sending photo to the server" },
  { label: "Detecting wound", description: "AI is locating the wound region" },
  {
    label: "Generating assessment",
    description: "Scoring healing, tissue types, and urgency",
  },
];

/* ── Component ──────────────────────────────────────────── */

export default function UploadAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── File handling ──────────────────────────────────── */

  const handleFile = useCallback(
    (selectedFile: File) => {
      const error = validateFile(selectedFile);
      if (error) {
        toast.error(error);
        return;
      }
      // Revoke previous blob URL to prevent memory leak
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    },
    [previewUrl],
  );

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  /* ── Drag and drop ──────────────────────────────────── */

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [handleFile],
  );

  /* ── Mutation ───────────────────────────────────────── */

  const uploadMutation = useMutation({
    mutationFn: async (uploadFile: File) => {
      setProcessingStep(0);

      // Simulate a brief upload phase before the real call
      // (the API call itself covers upload + AI processing)
      const stepTimer = setTimeout(() => setProcessingStep(1), 1500);
      const stepTimer2 = setTimeout(() => setProcessingStep(2), 4000);

      try {
        const result = await uploadWoundPhoto(id, uploadFile);
        return result;
      } finally {
        clearTimeout(stepTimer);
        clearTimeout(stepTimer2);
      }
    },
    onSuccess: () => {
      toast.success("Assessment completed successfully!");
      queryClient.invalidateQueries({ queryKey: ["assessments", id] });
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      router.push(`/patient/${id}`);
    },
    onError: (error) => {
      console.error(error);
      setProcessingStep(0);
      toast.error(
        "Failed to upload assessment. Ensure the backend AI agents are running.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    uploadMutation.mutate(file);
  };

  const isProcessing = uploadMutation.isPending;

  /* ── Processing view ────────────────────────────────── */

  if (isProcessing) {
    return (
      <div className="max-w-3xl mx-auto w-full">
        <div className="mb-10">
          <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Patient
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Processing Assessment
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            The AI is analyzing the wound photograph. This may take a moment.
          </p>
        </div>

        <div className="border border-border rounded-lg">
          <div className="p-6">
            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-6">
              Analysis Progress
            </p>
            <div className="flex flex-col gap-6">
              {PROCESSING_STEPS.map((step, i) => {
                const isActive = i === processingStep;
                const isComplete = i < processingStep;
                return (
                  <div key={i} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-mono font-semibold transition-colors ${
                          isComplete
                            ? "border-foreground bg-foreground text-background"
                            : isActive
                              ? "border-foreground text-foreground"
                              : "border-border text-muted-foreground"
                        }`}
                      >
                        {isComplete ? (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          i + 1
                        )}
                      </div>
                      {i < PROCESSING_STEPS.length - 1 && (
                        <div
                          className={`w-px h-6 mt-1 ${isComplete ? "bg-foreground" : "bg-border"}`}
                        />
                      )}
                    </div>
                    <div className="pt-1">
                      <p
                        className={`text-sm font-medium ${
                          isActive
                            ? "text-foreground"
                            : isComplete
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                        {isActive && (
                          <Loader2 className="inline-block ml-2 h-3.5 w-3.5 animate-spin" />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview thumbnail during processing */}
          {previewUrl && (
            <>
              <div className="h-px bg-border" />
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-lg overflow-hidden border border-border bg-muted/30 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Uploaded wound"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file ? formatFileSize(file.size) : ""}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── Main upload view ───────────────────────────────── */

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Back link */}
      <div className="mb-10">
        <Link
          href={`/patient/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Patient
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Upload Wound Photo
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a clear photo of the wound. The AI will analyze healing
          progress, detect infections, and classify tissue types.
        </p>
      </div>

      {/* Main form container */}
      <form onSubmit={handleSubmit}>
        <div className="border border-border rounded-lg">
          {/* Section: Upload Area */}
          <div className="p-6">
            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-5">
              Wound Photograph
            </p>

            {!previewUrl ? (
              /* ── Drop zone ──────────────────────────────── */
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragOver
                    ? "border-foreground bg-muted/80"
                    : "border-border hover:border-muted-foreground/50 bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <UploadCloud
                  className={`w-8 h-8 mb-3 transition-colors ${
                    isDragOver
                      ? "text-foreground"
                      : "text-muted-foreground/60"
                  }`}
                />
                <p className="text-sm text-muted-foreground mb-1">
                  <span className="font-medium text-foreground">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, or WEBP up to 10 MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              /* ── Image preview ──────────────────────────── */
              <div className="flex flex-col gap-4">
                <div
                  className="relative w-full rounded-lg overflow-hidden border border-border bg-muted/30 flex items-center justify-center min-h-64 group"
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Wound preview"
                    className="max-h-80 object-contain"
                  />
                  <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                      Replace Image
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                {/* File info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg overflow-hidden border border-border bg-muted/30 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[min(240px,50vw)]">
                        {file?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file ? formatFileSize(file.size) : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      if (previewUrl) {
                        URL.revokeObjectURL(previewUrl);
                      }
                      setFile(null);
                      setPreviewUrl(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Section: Photo Guidelines */}
          <div className="p-6">
            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-5">
              Photo Guidelines
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GuidelineCard
                icon={<Sun className="h-4 w-4" />}
                title="Good Lighting"
                description="Use natural or bright overhead light. Avoid flash and shadows on the wound."
              />
              <GuidelineCard
                icon={<Focus className="h-4 w-4" />}
                title="Sharp Focus"
                description="Hold the camera steady, 15-30 cm away. Ensure the wound edges are in focus."
              />
              <GuidelineCard
                icon={<Ruler className="h-4 w-4" />}
                title="Full Wound Visible"
                description="Capture the entire wound and surrounding skin. Include a size reference if possible."
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
              onClick={() => router.push(`/patient/${id}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!file}>
              Run Assessment
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function GuidelineCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
