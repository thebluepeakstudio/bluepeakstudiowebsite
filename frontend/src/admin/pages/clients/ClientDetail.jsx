import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Upload, Trash2, FolderKanban } from "lucide-react";
import {
  getClientOverview,
  getClientActivities,
  getClientAttachments,
  logClientActivity,
  uploadClientAttachments,
  deleteClientAttachment,
  updateClient,
} from "../../api/clients.api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Table from "../../components/ui/Table";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { Form, FormSection, FormFooter } from "../../components/ui/Form";
import ActivityTimeline from "../../components/leads/ActivityTimeline";
import ServicesPillList from "../../components/projects/ServicesPillList";
import { ACTIVITY_TYPES, getProjectLabel } from "../../utils/constants";
import { formatCurrency, formatDate } from "../../utils/formatCurrency";
import { CardSkeleton } from "../../components/ui/Skeleton";
import toast from "react-hot-toast";
import { adminPath } from "../../utils/adminPaths";

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityModal, setActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: "note", title: "", body: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await getClientOverview(id);
      const overview = res.data;
      setClient(overview.client);
      setProjects(overview.projects);
      setActivities(overview.activities);
      setAttachments(overview.attachments);
    } catch {
      toast.error("Client not found");
      navigate(adminPath("clients"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleActivity = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await logClientActivity(id, activityForm);
      toast.success("Activity logged");
      setActivityModal(false);
      setActivityForm({ type: "note", title: "", body: "" });
      const a = await getClientActivities(id);
      setActivities(a.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    try {
      await uploadClientAttachments(id, fd);
      toast.success("Files uploaded");
      const att = await getClientAttachments(id);
      setAttachments(att.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    }
    e.target.value = "";
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await deleteClientAttachment(id, attachmentId);
      toast.success("Attachment removed");
      setAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const saveNotes = async () => {
    try {
      await updateClient(id, { notes: client.notes });
      toast.success("Notes saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    }
  };

  if (loading) return <CardSkeleton />;
  if (!client) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" onClick={() => navigate(adminPath("clients"))}>
          <ArrowLeft size={18} /> Back
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-admin-text">{client.name}</h1>
          {client.companyName && (
            <p className="text-admin-textMuted">{client.companyName}</p>
          )}
        </div>
        <Badge status={client.status}>{client.status}</Badge>
        <Link to={`${adminPath("projects")}?clientId=${id}`} className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full">
            <FolderKanban size={16} /> New Project
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Contact Information">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div><dt className="text-xs text-admin-textMuted">Email</dt><dd className="text-sm">{client.email || "—"}</dd></div>
            <div><dt className="text-xs text-admin-textMuted">Phone</dt><dd className="text-sm">{client.phone || "—"}</dd></div>
            <div><dt className="text-xs text-admin-textMuted">Website</dt><dd className="text-sm">{client.website || "—"}</dd></div>
            <div><dt className="text-xs text-admin-textMuted">Created</dt><dd className="text-sm">{formatDate(client.createdAt)}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-admin-textMuted">Address</dt><dd className="text-sm">{client.address || "—"}</dd></div>
          </dl>
        </Card>

        <Card title="Notes">
          <Textarea
            value={client.notes || ""}
            onChange={(e) => setClient({ ...client, notes: e.target.value })}
            rows={5}
          />
          <Button className="mt-2" size="sm" onClick={saveNotes}>Save notes</Button>
        </Card>
      </div>

      <Card
        title="Activity Timeline"
        action={
          <Button size="sm" onClick={() => setActivityModal(true)}>
            <Plus size={14} /> Log activity
          </Button>
        }
      >
        <ActivityTimeline activities={activities} />
      </Card>

      <Card
        title="Attachments"
        action={
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1 rounded-lg bg-admin-primary px-3 py-1.5 text-xs font-medium text-white">
              <Upload size={14} /> Upload
            </span>
            <input type="file" multiple className="hidden" onChange={handleUpload} />
          </label>
        }
      >
        {attachments.length === 0 ? (
          <p className="text-sm text-admin-textMuted">No attachments</p>
        ) : (
          <ul className="divide-y divide-admin-border">
            {attachments.map((a) => (
              <li key={a._id} className="flex items-center justify-between py-2">
                <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-admin-primary hover:underline">
                  {a.fileName}
                </a>
                <button type="button" onClick={() => handleDeleteAttachment(a._id)} className="text-red-600">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Project History">
        <Table
          columns={[
            { key: "projectTitle", label: "Project", render: (r) => getProjectLabel(r) },
            {
              key: "services",
              label: "Services",
              render: (r) => (
                <ServicesPillList services={r.services} servicesCount={r.servicesCount} />
              ),
            },
            { key: "workStatus", label: "Status" },
            { key: "totalAmount", label: "Amount", render: (r) => formatCurrency(r.totalAmount) },
            {
              key: "link",
              label: "",
              render: (r) => (
                <Link to={adminPath("projects", r._id)} className="text-xs text-admin-primary hover:underline">
                  View
                </Link>
              ),
            },
          ]}
          data={projects}
          emptyMessage="No projects linked yet"
        />
      </Card>

      <Modal
        open={activityModal}
        onClose={() => setActivityModal(false)}
        title="Log activity"
        description="Record a call, meeting, email, or note for this client."
      >
        <Form onSubmit={handleActivity}>
          <FormSection>
            <Select
              label="Activity type"
              value={activityForm.type}
              onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
              options={ACTIVITY_TYPES}
            />
            <Input
              label="Title"
              value={activityForm.title}
              onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
            />
            <Textarea
              label="Details"
              value={activityForm.body}
              onChange={(e) => setActivityForm({ ...activityForm, body: e.target.value })}
            />
          </FormSection>
          <FormFooter
            onCancel={() => setActivityModal(false)}
            submitLabel="Save activity"
            loading={submitting}
          />
        </Form>
      </Modal>
    </div>
  );
}
