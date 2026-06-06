import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Pencil,
  User,
  Calendar,
  IndianRupee,
  Users,
  ExternalLink,
} from "lucide-react";
import { getProject, updateProject } from "../../api/projects.api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import ProjectForm from "./ProjectForm";
import { getProjectLabel } from "../../utils/constants";
import { formatCurrency, formatDate } from "../../utils/formatCurrency";
import { CardSkeleton } from "../../components/ui/Skeleton";
import toast from "react-hot-toast";

function DetailRow({ label, value, href }) {
  const display = value ?? "—";
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-admin-muted/60 px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wide text-admin-textMuted">{label}</span>
      {href && display !== "—" ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-admin-primary hover:underline"
        >
          {display}
          <ExternalLink size={14} />
        </a>
      ) : (
        <span className="text-sm font-medium text-admin-text">{display}</span>
      )}
    </div>
  );
}

function SummaryTile({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-admin-border bg-admin-surface p-4 shadow-sm">
      <p className="text-xs font-medium text-admin-textMuted">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent || "text-admin-text"}`}>{value}</p>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    getProject(id)
      .then(({ data }) => setProject(data.data))
      .catch(() => toast.error("Project not found"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleUpdate = async (payload) => {
    setSubmitting(true);
    try {
      await updateProject(id, payload);
      toast.success("Project updated");
      setEditOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <CardSkeleton />;
  if (!project) return null;

  const remaining =
    project.paymentStatus === "Paid" ? 0 : project.remainingAmount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" onClick={() => navigate("/admin-panel/projects")}>
          <ArrowLeft size={18} /> Back
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-admin-text">{getProjectLabel(project)}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-admin-textMuted">{project.projectType}</span>
            <Badge status={project.workStatus} />
            <Badge status={project.paymentStatus} />
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setEditOpen(true)}>
            <Pencil size={16} /> Edit
          </Button>
          <Link to={`/admin-panel/projects/${id}/documents`} className="w-full sm:w-auto">
            <Button className="w-full">
              <FileText size={16} /> Documents
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Total Amount" value={formatCurrency(project.totalAmount)} />
        <SummaryTile label="Advance Received" value={formatCurrency(project.advanceReceived)} accent="text-emerald-700" />
        <SummaryTile
          label="Remaining"
          value={formatCurrency(remaining)}
          accent={remaining > 0 ? "text-amber-700" : "text-emerald-700"}
        />
        {project.isOutsourced ? (
          <SummaryTile
            label="Outsourcing Cost"
            value={formatCurrency(project.outsourcingCost)}
            accent="text-admin-primary"
          />
        ) : (
          <SummaryTile label="Outsourced" value="No" />
        )}
      </div>

      {project.projectDescription && (
        <Card title="Description">
          <p className="text-sm leading-relaxed text-admin-text">{project.projectDescription}</p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title={
            <span className="flex items-center gap-2">
              <User size={18} className="text-admin-primary" />
              Client & project
            </span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="Client" value={project.clientName} />
            {project.clientId && (
              <div className="sm:col-span-2">
                <Link
                  to={`/admin-panel/clients/${project.clientId._id || project.clientId}`}
                  className="text-sm font-medium text-admin-primary hover:underline"
                >
                  View client profile
                </Link>
              </div>
            )}
            <DetailRow label="Business" value={project.businessName} />
            <DetailRow label="Contact" value={project.contactNumber} />
            <DetailRow label="Email" value={project.email} />
            <DetailRow label="Project type" value={project.projectType} />
          </div>
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              <Calendar size={18} className="text-admin-primary" />
              Timeline
            </span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="Onboarding" value={formatDate(project.dateOfOnboarding)} />
            <DetailRow label="Expected end" value={formatDate(project.expectedCompletionDate)} />
            <DetailRow label="Actual end" value={formatDate(project.actualCompletionDate)} />
            <DetailRow label="Work status" value={project.workStatus} />
          </div>
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              <IndianRupee size={18} className="text-admin-primary" />
              Payments
            </span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="Payment status" value={project.paymentStatus} />
            <DetailRow label="Advance payment date" value={formatDate(project.advancePaymentDate)} />
            <DetailRow label="Full payment date" value={formatDate(project.fullPaymentDate)} />
          </div>
        </Card>

        {project.isOutsourced && (
          <Card
            title={
              <span className="flex items-center gap-2">
                <Users size={18} className="text-admin-primary" />
                Freelancer
              </span>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow
                label="Assigned to"
                value={project.freelancerId?.name || project.freelancerAssigned}
              />
              <DetailRow label="Outsourcing cost" value={formatCurrency(project.outsourcingCost)} />
              <DetailRow
                label="Paid to freelancer"
                value={formatCurrency(project.amountPaidToFreelancer)}
              />
              <DetailRow
                label="Due to freelancer"
                value={formatCurrency(
                  Math.max(
                    0,
                    (project.outsourcingCost || 0) - (project.amountPaidToFreelancer || 0)
                  )
                )}
              />
              <div className="flex flex-col gap-1 rounded-lg bg-admin-muted/60 px-4 py-3 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-admin-textMuted">
                  Payment status
                </span>
                <div className="mt-0.5">
                  <Badge status={project.freelancerPaymentStatus} />
                </div>
              </div>
            </div>
          </Card>
        )}

        {(project.googleDriveLink || project.notes) && (
          <Card
            className={project.isOutsourced ? "" : "lg:col-span-2"}
            title="Links & notes"
          >
            <div className="grid gap-3">
              {project.googleDriveLink && (
                <DetailRow label="Google Drive" value="Open folder" href={project.googleDriveLink} />
              )}
              {project.notes && (
                <div className="rounded-lg bg-admin-muted/60 px-4 py-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-admin-textMuted">
                    Notes
                  </span>
                  <p className="mt-1 text-sm leading-relaxed text-admin-text">{project.notes}</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Project" description="Update project details, payment, and status." size="xl">
        <ProjectForm
          initial={project}
          onSubmit={handleUpdate}
          loading={submitting}
          onCancel={() => setEditOpen(false)}
          submitLabel="Save changes"
        />
      </Modal>
    </div>
  );
}
