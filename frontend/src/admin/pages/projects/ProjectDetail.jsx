import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, ExternalLink } from "lucide-react";
import { getProject, updateProject } from "../../api/projects.api";
import {
  createDeliverable,
  updateDeliverable,
  deleteDeliverable,
  createProjectPayment,
  deleteProjectPayment,
} from "../../api/deliverables.api";
import { createExpense } from "../../api/expenses.api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Tabs from "../../components/ui/Tabs";
import Table from "../../components/ui/Table";
import ProgressBar from "../../components/ui/ProgressBar";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DeliverableDrawer from "../../components/projects/DeliverableDrawer";
import ProjectFilesPanel from "../../components/projects/ProjectFilesPanel";
import ProjectEditForm from "./ProjectEditForm";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { Form, FormSection, FormGrid, FormFooter } from "../../components/ui/Form";
import {
  getProjectLabel,
  DELIVERABLE_STATUSES,
  SERVICE_CATEGORIES,
  PROJECT_PAYMENT_TYPES,
  PAID_VIA,
  EXPENSE_CATEGORIES,
} from "../../utils/constants";
import { formatCurrency, formatDate } from "../../utils/formatCurrency";
import { CardSkeleton } from "../../components/ui/Skeleton";
import toast from "react-hot-toast";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "deliverables", label: "Deliverables" },
  { id: "payments", label: "Payments" },
  { id: "expenses", label: "Expenses" },
  { id: "files", label: "Files" },
  { id: "notes", label: "Notes" },
];

function SummaryTile({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-admin-border bg-admin-surface p-4 shadow-sm">
      <p className="text-xs font-medium text-admin-textMuted">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent || "text-admin-text"}`}>{value}</p>
    </div>
  );
}

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

const emptyDeliverable = {
  title: "",
  category: "Website",
  description: "",
  sellingPrice: 0,
  expectedCompletion: "",
  status: "Not Started",
  progress: 0,
};

const emptyPayment = {
  type: "Advance",
  amount: "",
  paymentDate: new Date().toISOString().slice(0, 10),
  method: "UPI",
  reference: "",
  notes: "",
};

const emptyExpense = {
  title: "",
  amount: "",
  category: "Miscellaneous",
  expenseDate: new Date().toISOString().slice(0, 10),
  paidVia: "UPI",
  notes: "",
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get("tab") || "overview");
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [drawerDeliverable, setDrawerDeliverable] = useState(null);
  const [addDeliverableOpen, setAddDeliverableOpen] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState(emptyDeliverable);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [deleteDeliverableId, setDeleteDeliverableId] = useState(null);
  const [deletePaymentId, setDeletePaymentId] = useState(null);

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

  const handleAddDeliverable = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createDeliverable(id, {
        ...newDeliverable,
        sellingPrice: Number(newDeliverable.sellingPrice) || 0,
      });
      toast.success("Deliverable added");
      setAddDeliverableOpen(false);
      setNewDeliverable(emptyDeliverable);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add deliverable");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDeliverable = async (payload) => {
    await updateDeliverable(id, drawerDeliverable._id, payload);
    load();
  };

  const handleDeleteDeliverable = async () => {
    if (!deleteDeliverableId) return;
    setSubmitting(true);
    try {
      await deleteDeliverable(id, deleteDeliverableId);
      toast.success("Deliverable deleted");
      setDeleteDeliverableId(null);
      setDrawerDeliverable(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createProjectPayment(id, {
        ...paymentForm,
        amount: Number(paymentForm.amount),
      });
      toast.success("Payment recorded");
      setPaymentModalOpen(false);
      setPaymentForm(emptyPayment);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async () => {
    setSubmitting(true);
    try {
      await deleteProjectPayment(id, deletePaymentId);
      toast.success("Payment removed");
      setDeletePaymentId(null);
      load();
    } catch {
      toast.error("Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createExpense({
        ...expenseForm,
        projectId: id,
        amount: Number(expenseForm.amount),
      });
      toast.success("Expense added");
      setExpenseModalOpen(false);
      setExpenseForm(emptyExpense);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add expense");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <CardSkeleton />;
  if (!project) return null;

  const remaining = project.paymentStatus === "Paid" ? 0 : project.remainingAmount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" onClick={() => navigate("/admin-panel/projects")}>
          <ArrowLeft size={18} /> Back
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-admin-text">{getProjectLabel(project)}</h2>
          <p className="text-sm text-admin-textMuted">{project.clientName}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge status={project.overallStatus || project.workStatus} />
            <Badge status={project.paymentStatus} />
          </div>
        </div>
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          <Pencil size={16} /> Edit
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Total Value" value={formatCurrency(project.totalAmount)} />
        <SummaryTile
          label="Overall Progress"
          value={`${project.overallProgress ?? 0}%`}
          accent="text-admin-primary"
        />
        <SummaryTile
          label="Remaining"
          value={formatCurrency(remaining)}
          accent={remaining > 0 ? "text-amber-700" : "text-emerald-700"}
        />
        <SummaryTile
          label="Project Profit"
          value={formatCurrency(project.projectProfit ?? 0)}
          accent={(project.projectProfit ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}
        />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Client & project">
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
            </div>
            {project.projectDescription && (
              <p className="mt-4 text-sm leading-relaxed text-admin-text">{project.projectDescription}</p>
            )}
          </Card>

          <Card title="Timeline">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Onboarding" value={formatDate(project.dateOfOnboarding)} />
              <DetailRow label="Expected end" value={formatDate(project.expectedCompletionDate)} />
              <DetailRow label="Actual end" value={formatDate(project.actualCompletionDate)} />
              <DetailRow label="Overall status" value={project.overallStatus || project.workStatus} />
            </div>
          </Card>

          <Card title="Payment summary">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Payment status" value={project.paymentStatus} />
              <DetailRow label="Advance received" value={formatCurrency(project.advanceReceived)} />
              <DetailRow label="Remaining" value={formatCurrency(remaining)} />
            </div>
          </Card>

          <Card title="Profit breakdown">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Deliverable revenue" value={formatCurrency(project.totalAmount)} />
              <DetailRow label="Freelancer costs" value={formatCurrency(project.totalFreelancerCost ?? 0)} />
              <DetailRow
                label="Deliverable profit"
                value={formatCurrency(project.deliverableProfitTotal ?? 0)}
              />
              <DetailRow label="Net project profit" value={formatCurrency(project.projectProfit ?? 0)} />
            </div>
          </Card>
        </div>
      )}

      {tab === "deliverables" && (
        <Card
          title="Deliverables"
          action={
            <Button size="sm" onClick={() => setAddDeliverableOpen(true)}>
              <Plus size={14} /> Add deliverable
            </Button>
          }
        >
          <Table
            columns={[
              { key: "title", label: "Title" },
              { key: "category", label: "Category" },
              {
                key: "sellingPrice",
                label: "Selling Price",
                render: (r) => formatCurrency(r.sellingPrice),
              },
              {
                key: "freelancers",
                label: "Assigned Freelancers",
                render: (r) =>
                  (r.assignments || [])
                    .map((a) => a.freelancerId?.name)
                    .filter(Boolean)
                    .join(", ") || "—",
              },
              {
                key: "progress",
                label: "Progress",
                render: (r) => <ProgressBar value={r.progress} />,
              },
              { key: "status", label: "Status", render: (r) => <Badge status={r.status} /> },
              {
                key: "expected",
                label: "Expected Date",
                render: (r) => formatDate(r.expectedCompletion),
              },
              {
                key: "actions",
                label: "",
                render: (r) => (
                  <button
                    type="button"
                    className="text-xs font-medium text-admin-primary hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDrawerDeliverable(r);
                    }}
                  >
                    Open
                  </button>
                ),
              },
            ]}
            data={project.deliverables || []}
            emptyMessage="No deliverables yet"
          />
        </Card>
      )}

      {tab === "payments" && (
        <Card
          title="Payment history"
          action={
            <Button size="sm" onClick={() => setPaymentModalOpen(true)}>
              <Plus size={14} /> Add payment
            </Button>
          }
        >
          <Table
            columns={[
              { key: "type", label: "Type" },
              { key: "amount", label: "Amount", render: (r) => formatCurrency(r.amount) },
              { key: "paymentDate", label: "Date", render: (r) => formatDate(r.paymentDate) },
              { key: "method", label: "Method" },
              { key: "reference", label: "Reference", render: (r) => r.reference || "—" },
              { key: "notes", label: "Notes", render: (r) => r.notes || "—" },
              {
                key: "actions",
                label: "",
                render: (r) => (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => setDeletePaymentId(r._id)}
                  >
                    Delete
                  </button>
                ),
              },
            ]}
            data={project.payments || []}
            emptyMessage="No payments recorded"
          />
          <p className="mt-4 text-sm text-admin-textMuted">
            Remaining: <span className="font-semibold text-admin-text">{formatCurrency(remaining)}</span>
          </p>
        </Card>
      )}

      {tab === "expenses" && (
        <Card
          title="Project expenses"
          action={
            <Button size="sm" onClick={() => setExpenseModalOpen(true)}>
              <Plus size={14} /> Add expense
            </Button>
          }
        >
          <Table
            columns={[
              { key: "title", label: "Title" },
              { key: "category", label: "Category" },
              { key: "amount", label: "Amount", render: (r) => formatCurrency(r.amount) },
              { key: "expenseDate", label: "Date", render: (r) => formatDate(r.expenseDate) },
              { key: "paidVia", label: "Paid via" },
            ]}
            data={project.expenses || []}
            emptyMessage="No project-linked expenses"
          />
        </Card>
      )}

      {tab === "files" && <ProjectFilesPanel projectId={id} />}

      {tab === "notes" && (
        <Card title="Links & notes">
          <div className="space-y-4">
            {project.googleDriveLink && (
              <DetailRow label="Google Drive" value="Open folder" href={project.googleDriveLink} />
            )}
            <div className="rounded-lg bg-admin-muted/60 px-4 py-3">
              <span className="text-xs font-medium uppercase tracking-wide text-admin-textMuted">Notes</span>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-admin-text">
                {project.notes || "No notes yet."}
              </p>
            </div>
          </div>
        </Card>
      )}

      <DeliverableDrawer
        open={!!drawerDeliverable}
        deliverable={drawerDeliverable}
        projectId={id}
        onClose={() => setDrawerDeliverable(null)}
        onSave={handleSaveDeliverable}
        onDelete={() => setDeleteDeliverableId(drawerDeliverable?._id)}
      />

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Project" size="xl">
        <ProjectEditForm
          initial={project}
          onSubmit={handleUpdate}
          loading={submitting}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      <Modal open={addDeliverableOpen} onClose={() => setAddDeliverableOpen(false)} title="Add Deliverable">
        <Form onSubmit={handleAddDeliverable}>
          <FormSection>
            <FormGrid cols={2}>
              <Input
                label="Title"
                value={newDeliverable.title}
                onChange={(e) => setNewDeliverable((p) => ({ ...p, title: e.target.value }))}
                required
              />
              <Select
                label="Category"
                value={newDeliverable.category}
                onChange={(e) => setNewDeliverable((p) => ({ ...p, category: e.target.value }))}
                options={SERVICE_CATEGORIES}
              />
              <Input
                label="Selling price (₹)"
                type="number"
                min="0"
                value={newDeliverable.sellingPrice}
                onChange={(e) => setNewDeliverable((p) => ({ ...p, sellingPrice: e.target.value }))}
              />
              <Input
                label="Expected completion"
                type="date"
                value={newDeliverable.expectedCompletion}
                onChange={(e) => setNewDeliverable((p) => ({ ...p, expectedCompletion: e.target.value }))}
              />
              <Select
                label="Status"
                value={newDeliverable.status}
                onChange={(e) => setNewDeliverable((p) => ({ ...p, status: e.target.value }))}
                options={DELIVERABLE_STATUSES}
              />
            </FormGrid>
            <Textarea
              label="Description"
              value={newDeliverable.description}
              onChange={(e) => setNewDeliverable((p) => ({ ...p, description: e.target.value }))}
            />
          </FormSection>
          <FormFooter
            onCancel={() => setAddDeliverableOpen(false)}
            submitLabel="Add deliverable"
            loading={submitting}
          />
        </Form>
      </Modal>

      <Modal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Record payment">
        <Form onSubmit={handleAddPayment}>
          <FormSection>
            <FormGrid cols={2}>
              <Select
                label="Type"
                value={paymentForm.type}
                onChange={(e) => setPaymentForm((p) => ({ ...p, type: e.target.value }))}
                options={PROJECT_PAYMENT_TYPES}
              />
              <Input
                label="Amount (₹)"
                type="number"
                min="1"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                required
              />
              <Input
                label="Date"
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))}
                required
              />
              <Select
                label="Method"
                value={paymentForm.method}
                onChange={(e) => setPaymentForm((p) => ({ ...p, method: e.target.value }))}
                options={PAID_VIA}
              />
              <Input
                label="Reference"
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))}
              />
            </FormGrid>
            <Textarea
              label="Notes"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </FormSection>
          <FormFooter
            onCancel={() => setPaymentModalOpen(false)}
            submitLabel="Record payment"
            loading={submitting}
          />
        </Form>
      </Modal>

      <Modal open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title="Add project expense">
        <Form onSubmit={handleAddExpense}>
          <FormSection>
            <Input
              label="Title"
              value={expenseForm.title}
              onChange={(e) => setExpenseForm((p) => ({ ...p, title: e.target.value }))}
              required
            />
            <FormGrid cols={2}>
              <Input
                label="Amount (₹)"
                type="number"
                min="0"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                required
              />
              <Select
                label="Category"
                value={expenseForm.category}
                onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))}
                options={EXPENSE_CATEGORIES}
              />
              <Input
                label="Date"
                type="date"
                value={expenseForm.expenseDate}
                onChange={(e) => setExpenseForm((p) => ({ ...p, expenseDate: e.target.value }))}
              />
              <Select
                label="Paid via"
                value={expenseForm.paidVia}
                onChange={(e) => setExpenseForm((p) => ({ ...p, paidVia: e.target.value }))}
                options={PAID_VIA}
              />
            </FormGrid>
            <Textarea
              label="Notes"
              value={expenseForm.notes}
              onChange={(e) => setExpenseForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </FormSection>
          <FormFooter
            onCancel={() => setExpenseModalOpen(false)}
            submitLabel="Add expense"
            loading={submitting}
          />
        </Form>
      </Modal>

      <ConfirmDialog
        open={!!deleteDeliverableId}
        onClose={() => setDeleteDeliverableId(null)}
        onConfirm={handleDeleteDeliverable}
        message="Delete this deliverable?"
        danger
        loading={submitting}
      />

      <ConfirmDialog
        open={!!deletePaymentId}
        onClose={() => setDeletePaymentId(null)}
        onConfirm={handleDeletePayment}
        message="Delete this payment record?"
        danger
        loading={submitting}
      />
    </div>
  );
}
