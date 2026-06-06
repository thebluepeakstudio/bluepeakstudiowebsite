import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Upload, Download, Trash2, ExternalLink } from "lucide-react";
import { getDocuments, uploadDocuments, deleteDocument } from "../../api/documents.api";
import { getProject } from "../../api/projects.api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { DOCUMENT_CATEGORIES } from "../../utils/constants";
import { formatDate } from "../../utils/formatCurrency";
import { getProjectLabel } from "../../utils/constants";
import toast from "react-hot-toast";

export default function ProjectDocuments() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [docs, setDocs] = useState([]);
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = () => {
    Promise.all([getProject(id), getDocuments(id)])
      .then(([p, d]) => {
        setProject(p.data.data);
        setDocs(d.data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const grouped = DOCUMENT_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = docs.filter((d) => d.category === cat);
    return acc;
  }, {});

  const handleUpload = async () => {
    if (!files.length) return toast.error("Select files first");
    setUploading(true);
    try {
      await uploadDocuments(id, files, category);
      toast.success("Uploaded");
      setFiles([]);
      load();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDocument(deleteId);
      toast.success("Deleted");
      setDeleteId(null);
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) return <div className="animate-pulse h-40 bg-admin-muted rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Link to={`/admin-panel/projects/${id}`}>
          <Button variant="ghost"><ArrowLeft size={18} /> Back</Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold sm:text-xl">Documents</h2>
          <p className="truncate text-sm text-admin-textMuted">{getProjectLabel(project)}</p>
        </div>
      </div>

      <Card title="Upload Files">
        <div className="flex flex-wrap gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-admin-border px-3 py-2 text-sm"
          >
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
            className="text-sm"
          />
          <Button onClick={handleUpload} loading={uploading}>
            <Upload size={16} /> Upload
          </Button>
        </div>
      </Card>

      {DOCUMENT_CATEGORIES.map((cat) => (
        <Card key={cat} title={cat}>
          {!grouped[cat]?.length ? (
            <p className="text-sm text-admin-textMuted">No documents</p>
          ) : (
            <ul className="divide-y divide-admin-border">
              {grouped[cat].map((doc) => (
                <li key={doc._id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-medium">{doc.fileName}</p>
                    <p className="text-xs text-admin-textMuted">
                      {doc.uploadedBy} · {formatDate(doc.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm"><ExternalLink size={14} /></Button>
                    </a>
                    <a href={doc.fileUrl} download>
                      <Button variant="ghost" size="sm"><Download size={14} /></Button>
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(doc._id)}>
                      <Trash2 size={14} className="text-red-600" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}

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
