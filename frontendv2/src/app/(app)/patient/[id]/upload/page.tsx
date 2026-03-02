"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  Loader2,
  Image as ImageIcon,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { uploadWoundPhoto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

export default function UploadAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Create a preview URL
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadWoundPhoto(id, file),
    onSuccess: () => {
      toast.success("Assessment completed successfully!");
      // Invalidate both patient and their assessments
      queryClient.invalidateQueries({ queryKey: ["assessments", id] });
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      router.push(`/patient/${id}`);
    },
    onError: (error) => {
      console.error(error);
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

  return (
    <div className="max-w-xl mx-auto w-full pt-10">
      <div className="mb-6">
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

      <Card>
        <CardHeader>
          <CardTitle>New AI Wound Assessment</CardTitle>
          <CardDescription>
            Upload a clear photo of the wound. The AI will analyze healing
            progress, detect infections, and classify tissue types.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center w-full">
              {!previewUrl ? (
                <label
                  htmlFor="dropzone-file"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 border-muted-foreground/25 hover:bg-muted/80 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground text-center px-4">
                      JPEG, PNG, or WEBP (Max 10MB)
                      <br />
                      Ensure good lighting and focus on the wound.
                    </p>
                  </div>
                  <input
                    id="dropzone-file"
                    type="file"
                    className="hidden"
                    accept="image/jpeg, image/png, image/webp"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="relative w-full rounded-lg overflow-hidden border border-border group bg-black/5 flex items-center justify-center min-h-64">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-80 object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label htmlFor="replace-file" className="cursor-pointer">
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        className="pointer-events-none"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Replace Image
                      </Button>
                      <input
                        id="replace-file"
                        type="file"
                        className="hidden"
                        accept="image/jpeg, image/png, image/webp"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border pt-6">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.back()}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!file || uploadMutation.isPending}>
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                "Run Assessment"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
