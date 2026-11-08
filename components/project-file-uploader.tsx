"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2 } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase/client";
import { registerUploadedFileAction } from "@/app/dashboard/actions";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
  "application/zip"
] as const;

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const MAX_SIZE_BYTES = 52428800; // 50MB

export function ProjectFileUploader({
  projectId,
  organizationId
}: {
  projectId: string;
  organizationId: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      setError(`File exceeds the maximum allowable limit of 50MB (selected size: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
      setError(`Unsupported file type (${file.type || "unknown"}). Allowed formats: PDF, PNG, JPEG, TXT, ZIP.`);
      return;
    }

    setUploading(true);

    try {
      const supabase = createClientSupabase();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${projectId}/${Date.now()}_${sanitizedName}`;

      // Upload to private Supabase storage bucket
      const { error: uploadErr } = await supabase.storage
        .from("project-files")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadErr) {
        setError(`Storage upload failed: ${uploadErr.message}`);
        setUploading(false);
        return;
      }

      // Register file record in database
      const res = await registerUploadedFileAction({
        projectId,
        organizationId,
        storagePath,
        originalName: file.name,
        mimeType: file.type as AllowedMimeType,
        sizeBytes: file.size
      });

      if (!res.ok) {
        setError(res.error);
        setUploading(false);
        return;
      }

      setSuccess(`File "${file.name}" uploaded successfully.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error.";
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ border: "1px dashed var(--line-strong)", padding: "1.8rem", textAlign: "center", background: "var(--bg-deep)", borderRadius: "2px" }}>
      {error && <div className="error-box" style={{ marginBottom: "1rem", textAlign: "left" }}>{error}</div>}
      {success && <div className="success-box" style={{ marginBottom: "1rem", textAlign: "left" }}>{success}</div>}

      <UploadCloud size={36} className="cyan" style={{ margin: "0 auto 0.6rem" }} />
      <h3 style={{ margin: "0 0 0.3rem", fontSize: "1rem" }}>
        Upload Private Project Materials & Assets
      </h3>
      <p className="muted" style={{ margin: "0 0 1rem", fontSize: "0.82rem" }}>
        Allowed formats: PDF, PNG, JPEG, TXT, ZIP · Maximum file size: 50MB per object
      </p>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={uploading}
        style={{ display: "none" }}
        accept=".pdf,.png,.jpg,.jpeg,.txt,.zip"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="btn btn-primary"
        style={{ fontSize: "0.85rem" }}
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Uploading to Private Storage...
          </>
        ) : (
          "Select File to Upload"
        )}
      </button>
    </div>
  );
}
