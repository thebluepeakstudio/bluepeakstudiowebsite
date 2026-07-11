import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Upload, Download, Trash2, ExternalLink, FileText, X } from "lucide-react";
import { getDocuments, getDocumentView, uploadDocuments, deleteDocument } from "../../api/documents.api";
import Button from "../ui/Button";
import Card from "../ui/Card";
import ConfirmDialog from "../ui/ConfirmDialog";
import { DOCUMENT_CATEGORIES } from "../../utils/constants";
import { formatDate } from "../../utils/formatCurrency";
import toast from "react-hot-toast";

const guessMimeType = (fileName) => {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  const types = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
  };
  return types[ext] || "application/octet-stream";
};

function DocumentPreviewModal({ preview, onClose, onPreviewError }) {
  useEffect(() => {
    if (!preview) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      if (!preview.direct) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  if (!preview) return null;

  const isPdf =
    preview.mimeType === "application/pdf" || preview.fileName?.toLowerCase().endsWith(".pdf");
  const isImage = preview.mimeType?.startsWith("image/");

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close preview"
      />
      <div className="absolute inset-x-3 top-3 bottom-3 flex flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-4xl sm:-translate-x-1/2">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-admin-border px-4 py-3">
          <h3 className="truncate text-sm font-semibold text-admin-text">{preview.fileName}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-admin-muted"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 bg-admin-muted/30">
          {isPdf && (
            <iframe
              src={preview.url}
              title={preview.fileName}
              className="h-full w-full border-0 bg-white"
            />
          )}
          {isImage && (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              <img
                src={preview.url}
                alt={preview.fileName}
                className="max-h-full max-w-full object-contain"
                onError={() => onPreviewError?.(preview)}
              />
            </div>
          )}
          {!isPdf && !isImage && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-admin-textMuted">Preview is not available for this file type.</p>
              <a
                href={preview.url}
                download={preview.fileName}
                className="text-sm font-medium text-admin-primary hover:underline"
              >
                Download file
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

export default function ProjectFilesPanel({ projectId }) {
  const fileInputRef = useRef(null);
  const [docs, setDocs] = useState([]);
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const previewDocRef = useRef(null);

  const loadProxyPreview = async (doc) => {
    const mimeType = guessMimeType(doc.fileName);
    const { data } = await getDocumentView(doc._id);
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    setPreview({ url: URL.createObjectURL(blob), fileName: doc.fileName, mimeType, direct: false });
  };

  const load = () => {
    getDocuments(projectId)
      .then(({ data }) => setDocs(data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const grouped = DOCUMENT_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = docs.filter((d) => d.category === cat);
    return acc;
  }, {});

  const addFiles = (incoming) => {
    const next = Array.from(incoming || []);
    if (!next.length) return;
    setFiles((prev) => {
      const names = new Set(prev.map((f) => `${f.name}-${f.size}`));
      return [...prev, ...next.filter((f) => !names.has(`${f.name}-${f.size}`))];
    });
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    try {
      await uploadDocuments(projectId, files, category);
      toast.success("Documents uploaded");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDocument = async (doc) => {
    setOpeningId(doc._id);
    previewDocRef.current = doc;
    try {
      await loadProxyPreview(doc);
    } catch {
      toast.error("Could not open document");
    } finally {
      setOpeningId(null);
    }
  };

  const handlePreviewError = async () => {
    const doc = previewDocRef.current;
    if (!doc) return;
    try {
      await loadProxyPreview(doc);
    } catch {
      toast.error("Could not open document");
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const { data } = await getDocumentView(doc._id);
      const mimeType = guessMimeType(doc.fileName);
      const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
      downloadBlob(blob, doc.fileName);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDocument(deleteId);
      toast.success("Document deleted");
      setDeleteId(null);
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) return <p className="text-sm text-admin-textMuted">Loading files…</p>;

  return (
    <div className="space-y-6">
      <DocumentPreviewModal
        preview={preview}
        onClose={() => setPreview(null)}
        onPreviewError={handlePreviewError}
      />

      <Card title="Upload documents">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-admin-text">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-admin-border bg-white px-3 py-2 text-sm sm:max-w-xs"
            >
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

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
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragOver
                ? "border-admin-primary bg-blue-50/50"
                : "border-admin-border bg-admin-muted/30 hover:border-admin-primary/50 hover:bg-admin-muted/50"
            }`}
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-admin-primary/10 text-admin-primary">
              <Upload size={22} />
            </div>
            <p className="text-sm font-medium text-admin-text">
              Drop files here or <span className="text-admin-primary">browse</span>
            </p>
            <p className="mt-1 text-xs text-admin-textMuted">PDF, images, spreadsheets, and other documents</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <ul className="divide-y divide-admin-border rounded-lg border border-admin-border bg-white">
              {files.map((file, i) => (
                <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText size={16} className="shrink-0 text-admin-textMuted" />
                    <span className="truncate text-sm text-admin-text">{file.name}</span>
                    <span className="shrink-0 text-xs text-admin-textMuted">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="shrink-0 rounded p-1 text-admin-textMuted hover:bg-admin-muted hover:text-red-600"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end">
            <Button onClick={handleUpload} loading={uploading} disabled={!files.length}>
              <Upload size={16} /> Upload {files.length > 0 ? `(${files.length})` : ""}
            </Button>
          </div>
        </div>
      </Card>

      {DOCUMENT_CATEGORIES.map((cat) =>
        grouped[cat]?.length ? (
          <Card key={cat} title={cat}>
            <ul className="divide-y divide-admin-border">
              {grouped[cat].map((doc) => (
                <li key={doc._id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => handleOpenDocument(doc)}
                      disabled={openingId === doc._id}
                      className="inline-flex items-center gap-1 text-sm font-medium text-admin-primary hover:underline disabled:opacity-50"
                    >
                      {doc.fileName}
                      <ExternalLink size={14} />
                    </button>
                    <p className="text-xs text-admin-textMuted">
                      {formatDate(doc.uploadedAt || doc.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadDocument(doc)}
                      className="text-admin-textMuted hover:text-admin-primary"
                      aria-label={`Download ${doc.fileName}`}
                    >
                      <Download size={16} />
                    </button>
                    <button type="button" onClick={() => setDeleteId(doc._id)} className="text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ) : null
      )}

      {docs.length === 0 && (
        <p className="text-sm text-admin-textMuted">No documents uploaded yet.</p>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        message="Delete this document?"
        danger
      />
    </div>
  );
}
