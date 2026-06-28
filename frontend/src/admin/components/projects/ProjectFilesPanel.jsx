import { useEffect, useState } from "react";
import { Upload, Download, Trash2, ExternalLink } from "lucide-react";
import { getDocuments, uploadDocuments, deleteDocument } from "../../api/documents.api";
import Button from "../ui/Button";
import Card from "../ui/Card";
import ConfirmDialog from "../ui/ConfirmDialog";
import { DOCUMENT_CATEGORIES } from "../../utils/constants";
import { formatDate } from "../../utils/formatCurrency";
import toast from "react-hot-toast";

export default function ProjectFilesPanel({ projectId }) {
  const [docs, setDocs] = useState([]);
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

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

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    try {
      await uploadDocuments(projectId, files, category);
      toast.success("Documents uploaded");
      setFiles([]);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDocument(projectId, deleteId);
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
      <Card title="Upload documents">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-admin-border px-3 py-2 text-sm"
          >
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="text-sm"
          />
          <Button onClick={handleUpload} loading={uploading} disabled={!files.length}>
            <Upload size={16} /> Upload
          </Button>
        </div>
      </Card>

      {DOCUMENT_CATEGORIES.map((cat) =>
        grouped[cat]?.length ? (
          <Card key={cat} title={cat}>
            <ul className="divide-y divide-admin-border">
              {grouped[cat].map((doc) => (
                <li key={doc._id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-admin-primary hover:underline"
                    >
                      {doc.fileName}
                      <ExternalLink size={14} />
                    </a>
                    <p className="text-xs text-admin-textMuted">{formatDate(doc.uploadedAt)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a href={doc.fileUrl} download className="text-admin-textMuted hover:text-admin-primary">
                      <Download size={16} />
                    </a>
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
