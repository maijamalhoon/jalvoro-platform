"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Clock3,
  Download,
  FileArchive,
  FileCheck2,
  FileClock,
  FilePlus2,
  Folder,
  FolderPlus,
  History,
  RefreshCcw,
  Search,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type DocumentVersion = {
  id: string;
  version_number: number;
  object_path: string;
  original_file_name: string;
  mime_type: string;
  size_bytes: number | string;
  checksum_sha256: string | null;
  version_notes: string | null;
  status: "pending" | "ready" | "failed";
  created_at: string;
  uploaded_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
};

type DocumentRecord = {
  id: string;
  folder_id: string | null;
  folder_name: string | null;
  title: string;
  document_type: string;
  description: string | null;
  tags: string[];
  related_type: string | null;
  related_id: string | null;
  status: "active" | "archived";
  current_version_id: string | null;
  current_version: DocumentVersion | null;
  version_count: number | string;
  pending_version_count: number | string;
  versions: DocumentVersion[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type DocumentFolder = {
  id: string;
  parent_folder_id: string | null;
  name: string;
  document_count: number | string;
  created_at: string;
};

type AuditEntry = {
  id: number | string;
  document_id: string | null;
  version_id: string | null;
  folder_id: string | null;
  action: string;
  actor_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type BusinessDocumentsSnapshot = {
  bucket_id?: string;
  can_manage?: boolean;
  selected_folder_id?: string | null;
  status_filter?: string;
  folders?: DocumentFolder[];
  documents?: DocumentRecord[];
  audit?: AuditEntry[];
  summary?: {
    active_documents?: number | string;
    archived_documents?: number | string;
    pending_uploads?: number | string;
    storage_bytes?: number | string;
    folders?: number | string;
  };
};

type Props = {
  businessId: string;
  businessName: string;
  businessSlug: string;
  snapshot: BusinessDocumentsSnapshot;
};

const DOCUMENT_TYPES = [
  "general",
  "contract",
  "invoice",
  "receipt",
  "statement",
  "tax",
  "legal",
  "identity",
  "license",
  "certificate",
  "policy",
  "report",
  "other",
] as const;

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function displayDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function displayBytes(value: unknown) {
  const bytes = numberValue(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function mimeFor(file: File) {
  if (file.type) return file.type.toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "";
}

async function sha256(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function BusinessDocumentsWorkspace({
  businessId,
  businessName,
  snapshot,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const canManage = snapshot.can_manage === true;
  const folders = snapshot.folders ?? [];
  const documents = snapshot.documents ?? [];
  const audit = snapshot.audit ?? [];
  const summary = snapshot.summary ?? {};
  const bucketId = snapshot.bucket_id ?? "business-documents";

  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
  const [busy, setBusy] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    documentType: "general",
    folderId: "",
    description: "",
    tags: "",
    versionNotes: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) ?? null;
  const filteredDocuments = documents.filter((document) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      document.title.toLowerCase().includes(normalizedSearch) ||
      document.current_version?.original_file_name.toLowerCase().includes(normalizedSearch) ||
      document.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch));
    const matchesFolder = !folderFilter || document.folder_id === folderFilter;
    const matchesStatus = statusFilter === "all" || document.status === statusFilter;
    return matchesSearch && matchesFolder && matchesStatus;
  });

  function refresh() {
    router.refresh();
  }

  function resetUpload() {
    setSelectedDocumentId(null);
    setUploadForm({ title: "", documentType: "general", folderId: "", description: "", tags: "", versionNotes: "" });
    setFile(null);
  }

  function startNewVersion(document: DocumentRecord) {
    setSelectedDocumentId(document.id);
    setUploadForm({
      title: document.title,
      documentType: document.document_type,
      folderId: document.folder_id ?? "",
      description: document.description ?? "",
      tags: document.tags.join(", "),
      versionNotes: "",
    });
    setFile(null);
    globalThis.document.getElementById("document-upload-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    if (nextFile && !uploadForm.title && !selectedDocument) {
      const derivedTitle = nextFile.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      setUploadForm((current) => ({ ...current, title: derivedTitle.slice(0, 160) }));
    }
  }

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || busy || !folderName.trim()) return;
    setBusy("folder");
    const { error } = await supabase.rpc("create_business_document_folder", {
      p_business_id: businessId,
      p_name: folderName.trim(),
      p_parent_folder_id: null,
    });
    setBusy(null);
    if (error) {
      console.error("Document folder creation failed", { code: error.code });
      toast.error(error.message || "Folder could not be created.");
      return;
    }
    setFolderName("");
    toast.success("Document folder created.");
    refresh();
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || busy || !file) return;
    const normalizedMime = mimeFor(file);
    if (!normalizedMime) {
      toast.error("This file type could not be identified.");
      return;
    }
    if (file.size < 1 || file.size > 25 * 1024 * 1024) {
      toast.error("Choose a file between 1 byte and 25 MB.");
      return;
    }
    if (uploadForm.title.trim().length < 2) {
      toast.error("Enter a document title.");
      return;
    }

    setBusy("upload");
    const checksum = await sha256(file).catch(() => null);
    const tags = uploadForm.tags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 20);

    const { data: preparedData, error: prepareError } = await supabase.rpc("prepare_business_document_upload", {
      p_business_id: businessId,
      p_document_id: selectedDocument?.id ?? null,
      p_title: uploadForm.title.trim(),
      p_document_type: uploadForm.documentType,
      p_folder_id: uploadForm.folderId || null,
      p_original_file_name: file.name,
      p_mime_type: normalizedMime,
      p_size_bytes: file.size,
      p_description: uploadForm.description.trim() || null,
      p_tags: tags,
      p_related_type: selectedDocument?.related_type ?? null,
      p_related_id: selectedDocument?.related_id ?? null,
      p_version_notes: uploadForm.versionNotes.trim() || null,
    });

    if (prepareError) {
      setBusy(null);
      console.error("Document upload preparation failed", { code: prepareError.code });
      toast.error(prepareError.message || "Document upload could not be prepared.");
      return;
    }

    const prepared = preparedData as { version_id?: string; object_path?: string } | null;
    const versionId = prepared?.version_id ?? "";
    const objectPath = prepared?.object_path ?? "";
    if (!versionId || !objectPath) {
      setBusy(null);
      toast.error("Document upload path was not created.");
      return;
    }

    const { error: uploadError } = await supabase.storage.from(bucketId).upload(objectPath, file, {
      contentType: normalizedMime,
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) {
      await supabase.rpc("fail_business_document_upload", {
        p_business_id: businessId,
        p_version_id: versionId,
        p_reason: uploadError.message,
      });
      setBusy(null);
      console.error("Private document upload failed", { message: uploadError.message });
      toast.error("Private file upload failed.");
      refresh();
      return;
    }

    const { error: finalizeError } = await supabase.rpc("finalize_business_document_upload", {
      p_business_id: businessId,
      p_version_id: versionId,
      p_checksum_sha256: checksum,
    });
    setBusy(null);
    if (finalizeError) {
      console.error("Document upload finalization failed", { code: finalizeError.code });
      toast.error(finalizeError.message || "Uploaded document could not be finalized.");
      return;
    }

    toast.success(selectedDocument ? "New document version uploaded." : "Private document uploaded.");
    resetUpload();
    refresh();
  }

  async function downloadVersion(version: DocumentVersion) {
    if (version.status !== "ready" || busy) return;
    setBusy(`download:${version.id}`);
    const { data, error } = await supabase.storage.from(bucketId).createSignedUrl(version.object_path, 60, {
      download: version.original_file_name,
    });
    setBusy(null);
    if (error || !data?.signedUrl) {
      console.error("Signed document download failed", { message: error?.message });
      toast.error("Secure download link could not be created.");
      return;
    }
    window.location.assign(data.signedUrl);
  }

  async function setArchived(document: DocumentRecord, archived: boolean) {
    if (!canManage || busy) return;
    setBusy(`archive:${document.id}`);
    const { error } = await supabase.rpc("set_business_document_archived", {
      p_business_id: businessId,
      p_document_id: document.id,
      p_archived: archived,
    });
    setBusy(null);
    if (error) {
      console.error("Document archive action failed", { code: error.code });
      toast.error(error.message || "Document status could not be changed.");
      return;
    }
    toast.success(archived ? "Document archived." : "Document restored.");
    refresh();
  }

  return (
    <main className="min-h-dvh bg-background px-4 pb-12 pt-5 text-foreground sm:px-6 sm:pt-7 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Company records</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">Documents & records</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
              {businessName} contracts, statements, certificates, policies, reports, and linked ERP records remain private, versioned, and tenant isolated.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
            <ShieldCheck className="size-4" aria-hidden="true" /> Private storage active
          </span>
        </header>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={FileCheck2} label="Active records" value={String(numberValue(summary.active_documents))} />
          <SummaryCard icon={Folder} label="Folders" value={String(numberValue(summary.folders))} />
          <SummaryCard icon={FileClock} label="Pending uploads" value={String(numberValue(summary.pending_uploads))} tone="warning" />
          <SummaryCard icon={FileArchive} label="Private storage" value={displayBytes(summary.storage_bytes)} tone="success" />
        </section>

        {canManage ? (
          <section className="mt-7 grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
            <form onSubmit={createFolder} className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)] sm:px-6">
              <div className="flex items-center gap-3">
                <FolderPlus className="size-5 text-primary" aria-hidden="true" />
                <h2 className="font-black text-text-primary">Create folder</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-text-secondary">Group records without changing their private storage isolation.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Contracts" maxLength={100} />
                <Button type="submit" loading={busy === "folder"} loadingLabel="Creating…"><FolderPlus aria-hidden="true" /> Create</Button>
              </div>
            </form>

            <form id="document-upload-panel" onSubmit={uploadDocument} className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)] sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FilePlus2 className="size-5 text-primary" aria-hidden="true" />
                  <div><h2 className="font-black text-text-primary">{selectedDocument ? `Upload version ${numberValue(selectedDocument.version_count) + 1}` : "Upload private record"}</h2><p className="mt-1 text-xs text-text-secondary">PDF, Office, CSV, text, or image · maximum 25 MB</p></div>
                </div>
                {selectedDocument ? <Button type="button" size="sm" variant="ghost" onClick={resetUpload}>Cancel version</Button> : null}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Title"><Input value={uploadForm.title} onChange={(event) => setUploadForm({ ...uploadForm, title: event.target.value })} maxLength={160} /></Field>
                <Field label="Record type"><select className="field-input min-h-11 w-full" value={uploadForm.documentType} onChange={(event) => setUploadForm({ ...uploadForm, documentType: event.target.value })}>{DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></Field>
                <Field label="Folder"><select className="field-input min-h-11 w-full" value={uploadForm.folderId} onChange={(event) => setUploadForm({ ...uploadForm, folderId: event.target.value })}><option value="">Unfiled</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></Field>
                <Field label="Tags"><Input value={uploadForm.tags} onChange={(event) => setUploadForm({ ...uploadForm, tags: event.target.value })} placeholder="legal, customer" /></Field>
                <Field label="File"><Input type="file" onChange={handleFile} accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx" /></Field>
                <Field label="Version note"><Input value={uploadForm.versionNotes} onChange={(event) => setUploadForm({ ...uploadForm, versionNotes: event.target.value })} placeholder="Signed renewal" maxLength={1000} /></Field>
              </div>
              <Field label="Description"><Input value={uploadForm.description} onChange={(event) => setUploadForm({ ...uploadForm, description: event.target.value })} maxLength={2000} /></Field>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button type="submit" loading={busy === "upload"} loadingLabel="Encrypting & uploading…" disabled={!file}><UploadCloud aria-hidden="true" /> {selectedDocument ? "Upload new version" : "Upload record"}</Button>
                {file ? <span className="text-xs font-bold text-text-secondary">{file.name} · {displayBytes(file.size)}</span> : null}
              </div>
            </form>
          </section>
        ) : null}

        <section className="mt-9">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Record library</p><h2 className="mt-1 text-xl font-black text-text-primary">Private company files</h2></div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[620px]">
              <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records" /></label>
              <select className="field-input min-h-11 w-full" value={folderFilter} onChange={(event) => setFolderFilter(event.target.value)}><option value="">All folders</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>
              <select className="field-input min-h-11 w-full" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "active" | "archived" | "all")}><option value="active">Active</option><option value="archived">Archived</option><option value="all">All records</option></select>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDocuments.map((document) => (
              <article key={document.id} className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary"><FileArchive className="size-5" aria-hidden="true" /></span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${document.status === "active" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>{label(document.status)}</span>
                </div>
                <h3 className="mt-4 text-base font-black text-text-primary">{document.title}</h3>
                <p className="mt-1 text-xs font-bold text-primary">{label(document.document_type)} · {document.folder_name ?? "Unfiled"}</p>
                {document.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-secondary">{document.description}</p> : null}
                <div className="mt-4 flex flex-wrap gap-1.5">{document.tags.map((tag) => <span key={tag} className="rounded-full bg-surface-secondary px-2 py-1 text-[10px] font-bold text-text-secondary">{tag}</span>)}</div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <Metric label="Current version" value={document.current_version ? `v${document.current_version.version_number}` : "Pending"} />
                  <Metric label="File size" value={displayBytes(document.current_version?.size_bytes)} />
                </div>
                {document.current_version ? <p className="mt-3 truncate text-xs text-text-secondary">{document.current_version.original_file_name}</p> : null}
                <details className="mt-4 rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3">
                  <summary className="finance-focus flex cursor-pointer items-center gap-2 text-xs font-black text-text-primary"><History className="size-4 text-primary" aria-hidden="true" /> Version history ({numberValue(document.version_count)})</summary>
                  <div className="mt-3 space-y-2">
                    {document.versions.map((version) => (
                      <div key={version.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-button)] bg-surface px-3 py-2">
                        <div className="min-w-0"><strong className="block text-xs text-text-primary">v{version.version_number} · {version.status}</strong><span className="block truncate text-[11px] text-text-secondary">{version.original_file_name} · {displayDate(version.uploaded_at ?? version.created_at)}</span></div>
                        {version.status === "ready" ? <Button type="button" size="icon-sm" variant="ghost" aria-label={`Download version ${version.version_number}`} loading={busy === `download:${version.id}`} onClick={() => void downloadVersion(version)}><Download aria-hidden="true" /></Button> : null}
                      </div>
                    ))}
                  </div>
                </details>
                <div className="mt-4 flex flex-wrap gap-2">
                  {document.current_version ? <Button type="button" size="sm" variant="secondary" loading={busy === `download:${document.current_version.id}`} onClick={() => void downloadVersion(document.current_version!)}><Download aria-hidden="true" /> Download</Button> : null}
                  {canManage && document.status === "active" ? <Button type="button" size="sm" variant="ghost" onClick={() => startNewVersion(document)}><UploadCloud aria-hidden="true" /> New version</Button> : null}
                  {canManage ? <Button type="button" size="sm" variant="ghost" loading={busy === `archive:${document.id}`} onClick={() => void setArchived(document, document.status === "active")}>{document.status === "active" ? <Archive aria-hidden="true" /> : <ArchiveRestore aria-hidden="true" />}{document.status === "active" ? "Archive" : "Restore"}</Button> : null}
                </div>
              </article>
            ))}
          </div>
          {!filteredDocuments.length ? <div className="mt-5 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-12 text-center text-sm text-text-secondary">No documents match the current filters.</div> : null}
        </section>

        <section className="mt-9 rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)] sm:px-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Audit trail</p><h2 className="mt-1 text-lg font-black text-text-primary">Recent record activity</h2></div><Button type="button" size="sm" variant="ghost" onClick={refresh}><RefreshCcw aria-hidden="true" /> Refresh</Button></div>
          <div className="mt-4 divide-y divide-border/60">
            {audit.slice(0, 20).map((entry) => <div key={entry.id} className="flex items-start gap-3 py-3"><Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><div><strong className="text-sm text-text-primary">{label(entry.action)}</strong><p className="mt-1 text-xs text-text-secondary">{displayDate(entry.created_at)}</p></div></div>)}
            {!audit.length ? <p className="py-6 text-center text-sm text-text-secondary">Document activity will appear here.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ icon: Icon, label: cardLabel, value, tone = "primary" }: { icon: typeof FileArchive; label: string; value: string; tone?: "primary" | "success" | "warning" }) {
  const style = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-primary";
  return <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]"><Icon className={`size-5 ${style}`} aria-hidden="true" /><p className="mt-4 text-xs font-bold text-text-secondary">{cardLabel}</p><strong className={`mt-1 block truncate text-xl font-black tabular-nums ${style}`}>{value}</strong></article>;
}

function Metric({ label: metricLabel, value }: { label: string; value: string }) {
  return <div className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3"><span className="text-[11px] font-bold text-text-tertiary">{metricLabel}</span><strong className="mt-1 block truncate text-sm font-black text-text-primary">{value}</strong></div>;
}

function Field({ label: fieldLabel, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2"><span className="text-sm font-bold text-text-primary">{fieldLabel}</span>{children}</label>;
}
