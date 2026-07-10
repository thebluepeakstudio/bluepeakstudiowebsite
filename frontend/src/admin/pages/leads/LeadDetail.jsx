import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Upload, Trash2, Pencil } from "lucide-react";
import {
  getLeadOverview,
  getLeadActivities,
  getLeadAttachments,
  logLeadActivity,
  uploadLeadAttachments,
  deleteLeadAttachment,
  updateLead,
  updateLeadFollowUp,
  deleteLead,
} from "../../api/leads.api";
import { getAdmins } from "../../api/auth.api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import LeadStatusBadge from "../../components/leads/LeadStatusBadge";
import ConvertToClientBanner from "../../components/leads/ConvertToClientBanner";
import ActivityTimeline from "../../components/leads/ActivityTimeline";
import LeadFormModal, { emptyLead } from "./LeadFormModal";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { Form, FormSection, FormFooter } from "../../components/ui/Form";
import { ACTIVITY_TYPES, FOLLOW_UP_STATUSES } from "../../utils/constants";
import { formatCurrency, formatDate } from "../../utils/formatCurrency";
import { CardSkeleton } from "../../components/ui/Skeleton";
import toast from "react-hot-toast";
import { adminPath } from "../../utils/adminPaths";

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityModal, setActivityModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState(emptyLead);
  const [admins, setAdmins] = useState([]);
  const [activityForm, setActivityForm] = useState({ type: "note", title: "", body: "" });
  const [followUp, setFollowUp] = useState({
    nextFollowUpDate: "",
    reminderNotes: "",
    followUpStatus: "Scheduled",
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: res } = await getLeadOverview(id);
      const overview = res.data;
      const data = overview.lead;
      setLead(data);
      setActivities(overview.activities);
      setAttachments(overview.attachments);
      setHistory(overview.history);
      setFollowUp({
        nextFollowUpDate: data.nextFollowUpDate?.slice(0, 10) || "",
        reminderNotes: data.reminderNotes || "",
        followUpStatus: data.followUpStatus || "Scheduled",
      });
      setForm({
        ...emptyLead,
        ...data,
        requirements: data.requirements || [],
        nextFollowUpDate: data.nextFollowUpDate?.slice(0, 10) || "",
        estimatedProjectValue: data.estimatedProjectValue ?? 0,
      });
    } catch {
      toast.error("Lead not found");
      navigate(adminPath("leads"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAdmins().then(({ data }) => setAdmins(data.data)).catch(() => {});
    load();
  }, [id]);

  const handleActivity = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await logLeadActivity(id, activityForm);
      toast.success("Activity logged");
      setActivityModal(false);
      setActivityForm({ type: "note", title: "", body: "" });
      const a = await getLeadActivities(id);
      setActivities(a.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const saveFollowUp = async () => {
    setSubmitting(true);
    try {
      const { data } = await updateLeadFollowUp(id, followUp);
      setLead(data.data);
      toast.success("Follow-up updated");
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
      await uploadLeadAttachments(id, fd);
      toast.success("Files uploaded");
      const att = await getLeadAttachments(id);
      setAttachments(att.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    }
    e.target.value = "";
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await deleteLeadAttachment(id, attachmentId);
      setAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
      toast.success("Attachment removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const handleUpdate = async (payload) => {
    setSubmitting(true);
    try {
      await updateLead(id, payload);
      toast.success("Lead updated");
      setEditModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLead(id);
      toast.success("Lead deleted");
      navigate(adminPath("leads"));
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
    setDeleteOpen(false);
  };

  if (loading) return <CardSkeleton />;
  if (!lead) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
        <Button variant="ghost" className="w-fit" onClick={() => navigate(adminPath("leads"))}>
          <ArrowLeft size={18} /> Back
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-admin-text sm:text-2xl">{lead.fullName}</h1>
          {lead.companyName && (
            <p className="text-sm text-admin-textMuted">{lead.companyName}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <LeadStatusBadge status={lead.status} />
            <Badge status={lead.priority}>{lead.priority}</Badge>
          </div>
        </div>
        {!lead.isConverted && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setEditModal(true)}>
              <Pencil size={16} /> Edit
            </Button>
            <Button variant="danger" className="w-full sm:w-auto" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={16} /> Delete
            </Button>
          </div>
        )}
      </div>

      <ConvertToClientBanner lead={lead} onConverted={(updated) => setLead(updated)} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Contact">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-admin-textMuted">Email</dt>
              <dd className="break-all text-sm">{lead.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-admin-textMuted">Phone</dt>
              <dd className="text-sm">{lead.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-admin-textMuted">Source</dt>
              <dd className="text-sm">{lead.leadSource}</dd>
            </div>
            <div>
              <dt className="text-xs text-admin-textMuted">Requirements</dt>
              <dd className="text-sm">
                {lead.requirements?.length ? lead.requirements.join(", ") : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-admin-textMuted">Est. value</dt>
              <dd className="text-sm font-medium">{formatCurrency(lead.estimatedProjectValue)}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Follow-up">
          <div className="space-y-3">
            <Input
              label="Next follow-up"
              type="date"
              value={followUp.nextFollowUpDate}
              onChange={(e) =>
                setFollowUp({ ...followUp, nextFollowUpDate: e.target.value })
              }
              disabled={lead.isConverted}
            />
            <Select
              label="Status"
              value={followUp.followUpStatus}
              onChange={(e) =>
                setFollowUp({ ...followUp, followUpStatus: e.target.value })
              }
              options={FOLLOW_UP_STATUSES.map((s) => ({ value: s, label: s }))}
              disabled={lead.isConverted}
            />
            <Textarea
              label="Reminder notes"
              value={followUp.reminderNotes}
              onChange={(e) =>
                setFollowUp({ ...followUp, reminderNotes: e.target.value })
              }
              disabled={lead.isConverted}
            />
            {!lead.isConverted && (
              <Button size="sm" loading={submitting} onClick={saveFollowUp}>
                Save follow-up
              </Button>
            )}
          </div>
        </Card>
      </div>

      {lead.notes && (
        <Card title="Notes">
          <p className="whitespace-pre-wrap text-sm text-admin-text">{lead.notes}</p>
        </Card>
      )}

      <Card
        title="Activity"
        action={
          !lead.isConverted && (
            <Button size="sm" className="w-full sm:w-auto" onClick={() => setActivityModal(true)}>
              <Plus size={14} /> Log activity
            </Button>
          )
        }
      >
        <ActivityTimeline activities={activities} />
      </Card>

      <Card
        title="Attachments"
        action={
          !lead.isConverted && (
            <label className="block w-full cursor-pointer sm:w-auto">
              <span className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-admin-primary px-3 py-2 text-xs font-medium text-white sm:w-auto sm:py-1.5">
                <Upload size={14} /> Upload
              </span>
              <input type="file" multiple className="hidden" onChange={handleUpload} />
            </label>
          )
        }
      >
        {attachments.length === 0 ? (
          <p className="text-sm text-admin-textMuted">No attachments</p>
        ) : (
          <ul className="divide-y divide-admin-border">
            {attachments.map((a) => (
              <li
                key={a._id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <a
                  href={a.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-sm text-admin-primary hover:underline"
                >
                  {a.fileName}
                </a>
                {!lead.isConverted && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAttachment(a._id)}
                    className="self-start text-red-600 sm:self-center"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {history.length > 0 && (
        <Card title="Stage history">
          <ul className="space-y-2">
            {history.map((h) => (
              <li
                key={h._id}
                className="flex flex-col gap-1 rounded-lg border border-admin-border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  {h.fromStatus ? `${h.fromStatus} → ` : ""}
                  <strong>{h.toStatus}</strong>
                </span>
                <span className="text-xs text-admin-textMuted">
                  {formatDate(h.createdAt)} · {h.changedBy}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <LeadFormModal
        open={editModal}
        onClose={() => setEditModal(false)}
        form={form}
        setForm={setForm}
        onSubmit={handleUpdate}
        editing={lead}
        submitting={submitting}
      />

      <Modal
        open={activityModal}
        onClose={() => setActivityModal(false)}
        title="Log activity"
        description="Record a call, meeting, email, or note for this lead."
      >
        <Form onSubmit={handleActivity}>
          <FormSection>
            <Select
              label="Activity type"
              value={activityForm.type}
              onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
              options={ACTIVITY_TYPES.map((t) => ({ value: t, label: t }))}
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

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete lead?"
        message="This cannot be undone."
        danger
      />
    </div>
  );
}
