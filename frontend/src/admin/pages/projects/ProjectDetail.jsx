import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, ExternalLink, FileDown } from "lucide-react";
import { getProject, updateProject, downloadProjectInvoice } from "../../api/services.api";
import {
  createDeliverable,
  updateDeliverable,
  deleteDeliverable,
  getDeliverables,
  getProjectPayments,
  getProjectExpenses,
  createProjectPayment,
  updateProjectPayment,
  deleteProjectPayment,
} from "../../api/deliverables.api";
import { createExpense } from "../../api/expenses.api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Tabs from "../../components/ui/Tabs";
import Table from "../../components/ui/Table";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DeliverableDrawer from "../../components/projects/DeliverableDrawer";
import ProjectFilesPanel from "../../components/projects/ProjectFilesPanel";
import ProjectEditForm from "./ProjectEditForm";
import RecurringProjectDetail from "./RecurringProjectDetail";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { Form, FormSection, FormGrid, FormFooter } from "../../components/ui/Form";
import {
  getProjectLabel,
  DELIVERABLE_STATUSES,
  SERVICE_CATEGORIES,
  PAID_VIA,
  EXPENSE_CATEGORIES,
  DELIVERABLE_AMOUNT_LABEL,
  normalizePaymentStatus,
} from "../../utils/constants";
import { formatCurrency, formatDate } from "../../utils/formatCurrency";
import { CardSkeleton } from "../../components/ui/Skeleton";
import toast from "react-hot-toast";
import { adminPath } from "../../utils/adminPaths";
import { adminQueryKeys } from "../../queryKeys";

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
  status: "Not Started",
};

const emptyPayment = {
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

const derivePaymentStatus = (totalPaid, total) => {
  const paid = Math.round((Number(totalPaid) || 0) * 100) / 100;
  const value = Math.round((Number(total) || 0) * 100) / 100;
  const remaining = Math.max(0, Math.round((value - paid) * 100) / 100);

  if (value > 0 && remaining === 0) return "Paid";
  if (paid > 0) return "Partial";
  return "Unpaid";
};

const enrichDeliverableRow = (d) => ({
  ...d,
  assignments: Array.isArray(d.assignments)
    ? d.assignments.map((a) => ({
        ...a,
        freelancerId: a.freelancerId
          ? typeof a.freelancerId === "object"
            ? { ...a.freelancerId }
            : a.freelancerId
          : a.freelancerId,
      }))
    : [],
  freelancerCost: d.freelancerCost ?? 0,
  profit: d.profit ?? (Number(d.sellingPrice) || 0),
});

const deliverableIdEquals = (a, b) => String(a ?? "") === String(b ?? "");

const sortPayments = (payments) =>
  [...payments].sort(
    (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  );

const sumDeliverableAmounts = (deliverables = []) =>
  deliverables.reduce((sum, d) => sum + (Number(d.sellingPrice) || 0), 0);

const applyPaymentTotals = (project, payments) => {
  const deliverableTotal = sumDeliverableAmounts(project.deliverables);
  const totalAmount =
    deliverableTotal > 0 ? deliverableTotal : Number(project.totalAmount) || 0;
  const totalReceived = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingAmount = Math.max(0, totalAmount - totalReceived);
  return {
    payments,
    totalReceived,
    advanceReceived: totalReceived,
    remainingAmount,
    paymentStatus: derivePaymentStatus(totalReceived, totalAmount),
  };
};

const TAB_DATA_KEY = {
  deliverables: "deliverables",
  payments: "payments",
  expenses: "expenses",
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [deleteDeliverableId, setDeleteDeliverableId] = useState(null);
  const [deletePaymentId, setDeletePaymentId] = useState(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const loadedTabsRef = useRef(new Set());

  const refreshFinancials = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() });
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.profitLoss() });
  }, [queryClient]);

  const loadSummary = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      return getProject(id)
        .then(({ data }) => {
          setProject((prev) => ({
            ...prev,
            ...data.data,
            deliverables: prev?.deliverables,
            payments: prev?.payments,
            expenses: prev?.expenses,
          }));
        })
        .catch(() => toast.error("Project not found"))
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [id]
  );

  const loadTabData = useCallback(
    async (tabId, { force = false } = {}) => {
      const key = TAB_DATA_KEY[tabId];
      if (!key || (!force && loadedTabsRef.current.has(tabId))) return;

      setTabLoading(true);
      try {
        if (tabId === "deliverables") {
          const { data } = await getDeliverables(id);
          const deliverables = (data.data || []).map(enrichDeliverableRow);
          loadedTabsRef.current.add("deliverables");
          setProject((prev) => ({ ...prev, deliverables }));
        } else if (tabId === "payments") {
          const { data } = await getProjectPayments(id);
          const payments = sortPayments(data.data || []);
          loadedTabsRef.current.add("payments");
          setProject((prev) => ({ ...prev, ...applyPaymentTotals(prev, payments) }));
        } else if (tabId === "expenses") {
          const { data } = await getProjectExpenses(id);
          loadedTabsRef.current.add("expenses");
          setProject((prev) => ({ ...prev, expenses: data.data || [] }));
        }
      } catch {
        toast.error("Failed to load tab data");
      } finally {
        setTabLoading(false);
      }
    },
    [id]
  );

  const patchDeliverable = useCallback((updated) => {
    setProject((prev) => {
      if (!prev) return prev;
      const list = prev.deliverables || [];
      const idx = list.findIndex((d) => deliverableIdEquals(d._id, updated._id));
      const deliverables =
        idx >= 0
          ? list.map((d, i) => (i === idx ? enrichDeliverableRow(updated) : d))
          : [...list, enrichDeliverableRow(updated)];
      return { ...prev, deliverables };
    });
    setDrawerDeliverable((current) =>
      deliverableIdEquals(current?._id, updated._id)
        ? enrichDeliverableRow(updated)
        : current
    );
  }, []);

  useEffect(() => {
    loadedTabsRef.current = new Set();
    setProject(null);
    loadSummary();
  }, [id, loadSummary]);

  useEffect(() => {
    if (!project || tab === "overview" || tab === "files" || tab === "notes") return;
    loadTabData(tab);
  }, [tab, project, loadTabData]);

  const handleUpdate = async (payload) => {
    setSubmitting(true);
    try {
      await updateProject(id, payload);
      toast.success("Project updated");
      setEditOpen(false);
      loadedTabsRef.current.delete("deliverables");
      loadedTabsRef.current.delete("payments");
      await loadSummary(true);
      if (tab !== "overview" && tab !== "files" && tab !== "notes") {
        await loadTabData(tab, { force: true });
      }
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
      const { data } = await createDeliverable(id, {
        ...newDeliverable,
        sellingPrice: Number(newDeliverable.sellingPrice) || 0,
      });
      toast.success("Deliverable added");
      setAddDeliverableOpen(false);
      setNewDeliverable(emptyDeliverable);
      const row = enrichDeliverableRow(data.data);
      if (loadedTabsRef.current.has("deliverables")) {
        setProject((prev) => ({
          ...prev,
          deliverables: [...(prev.deliverables || []), row],
        }));
      }
      await loadSummary(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add deliverable");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDeliverable = async (payload) => {
    const { data } = await updateDeliverable(id, drawerDeliverable._id, payload);
    const existing = drawerDeliverable;
    const updated = enrichDeliverableRow({
      ...existing,
      ...data.data,
      assignments: existing.assignments || [],
      freelancerCost: existing.freelancerCost,
      profit:
        (Number(data.data.sellingPrice) || 0) - (Number(existing.freelancerCost) || 0),
    });
    patchDeliverable(updated);
    await loadSummary(true);
  };

  const handleDeleteDeliverable = async () => {
    if (!deleteDeliverableId) return;
    setSubmitting(true);
    try {
      await deleteDeliverable(id, deleteDeliverableId);
      toast.success("Deliverable deleted");
      setDeleteDeliverableId(null);
      setDrawerDeliverable(null);
      if (loadedTabsRef.current.has("deliverables")) {
        setProject((prev) => ({
          ...prev,
          deliverables: (prev.deliverables || []).filter((d) => d._id !== deleteDeliverableId),
        }));
      }
      await loadSummary(true);
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
      const { data } = await createProjectPayment(id, {
        ...paymentForm,
        amount: Number(paymentForm.amount),
      });
      toast.success("Payment recorded");
      setPaymentModalOpen(false);
      setPaymentForm(emptyPayment);
      const payments = sortPayments([data.data, ...(project.payments || [])]);
      loadedTabsRef.current.add("payments");
      setProject((prev) => ({ ...prev, ...applyPaymentTotals(prev, payments) }));
      refreshFinancials();
      await loadSummary(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    if (!editingPayment) return;
    setSubmitting(true);
    try {
      const { data } = await updateProjectPayment(id, editingPayment._id, {
        ...paymentForm,
        amount: Number(paymentForm.amount),
      });
      toast.success("Payment updated");
      setEditingPayment(null);
      setPaymentForm(emptyPayment);
      const payments = sortPayments(
        (project.payments || []).map((p) => (p._id === data.data._id ? data.data : p))
      );
      setProject((prev) => ({ ...prev, ...applyPaymentTotals(prev, payments) }));
      refreshFinancials();
      await loadSummary(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditPayment = (payment) => {
    setEditingPayment(payment);
    setPaymentForm({
      amount: payment.amount ?? "",
      paymentDate: payment.paymentDate?.slice(0, 10) || "",
      method: payment.method || "UPI",
      reference: payment.reference || "",
      notes: payment.notes || "",
    });
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setEditingPayment(null);
    setPaymentForm(emptyPayment);
  };

  const handleDeletePayment = async () => {
    setSubmitting(true);
    try {
      await deleteProjectPayment(id, deletePaymentId);
      toast.success("Payment removed");
      setDeletePaymentId(null);
      const payments = (project.payments || []).filter((p) => p._id !== deletePaymentId);
      setProject((prev) => ({ ...prev, ...applyPaymentTotals(prev, payments) }));
      refreshFinancials();
      await loadSummary(true);
    } catch {
      toast.error("Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadInvoice = async () => {
    setDownloadingInvoice(true);
    try {
      const { data } = await downloadProjectInvoice(id);
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice-${getProjectLabel(project).replace(/[^a-zA-Z0-9._-]+/g, "-")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate invoice");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await createExpense({
        ...expenseForm,
        serviceId: id,
        amount: Number(expenseForm.amount),
      });
      toast.success("Expense added");
      setExpenseModalOpen(false);
      setExpenseForm(emptyExpense);
      if (loadedTabsRef.current.has("expenses")) {
        setProject((prev) => ({
          ...prev,
          expenses: [data.data, ...(prev.expenses || [])],
        }));
      }
      await loadSummary(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignmentsChange = async () => {
    try {
      const { data } = await getDeliverables(id);
      const deliverables = (data.data || []).map(enrichDeliverableRow);
      loadedTabsRef.current.add("deliverables");
      setProject((prev) => ({ ...prev, deliverables }));
      setDrawerDeliverable((current) => {
        if (!current?._id) return current;
        return (
          deliverables.find((d) => deliverableIdEquals(d._id, current._id)) || current
        );
      });
      await loadSummary(true);
    } catch {
      toast.error("Failed to refresh deliverables");
    }
  };

  if (loading) return <CardSkeleton />;
  if (!project) return null;

  if (project.billingModel === "recurring") {
    return <RecurringProjectDetail projectId={id} />;
  }

  const totalReceived = Number(project.totalReceived ?? project.advanceReceived) || 0;
  const deliverableTotal = sumDeliverableAmounts(project.deliverables);
  const projectValue =
    deliverableTotal > 0 ? deliverableTotal : Number(project.totalAmount) || 0;
  const remaining = Math.max(0, projectValue - totalReceived);
  const paymentStatus = normalizePaymentStatus(project.paymentStatus);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" onClick={() => navigate(adminPath("projects"))}>
          <ArrowLeft size={18} /> Back
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-admin-text">{getProjectLabel(project)}</h2>
          <p className="text-sm text-admin-textMuted">{project.clientName}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge status={project.overallStatus || project.workStatus} />
            <Badge status={paymentStatus} />
          </div>
        </div>
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          <Pencil size={16} /> Edit
        </Button>
        <Button variant="secondary" onClick={handleDownloadInvoice} loading={downloadingInvoice}>
          <FileDown size={16} /> Download invoice
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Project Value" value={formatCurrency(projectValue)} />
        <SummaryTile label="Total Received" value={formatCurrency(totalReceived)} />
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
                    to={adminPath("clients", project.clientId._id || project.clientId)}
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
              <DetailRow label="Project value" value={formatCurrency(projectValue)} />
              <DetailRow label="Total received" value={formatCurrency(totalReceived)} />
              <DetailRow label="Remaining" value={formatCurrency(remaining)} />
              <DetailRow label="Payment status" value={paymentStatus} />
            </div>
          </Card>

          <Card title="Profit breakdown">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Total amount" value={formatCurrency(project.totalAmount)} />
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
          {tabLoading && !project.deliverables ? (
            <p className="text-sm text-admin-textMuted">Loading deliverables…</p>
          ) : (
          <Table
            columns={[
              { key: "title", label: "Title" },
              { key: "category", label: "Category" },
              {
                key: "sellingPrice",
                label: "Amount",
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
              { key: "status", label: "Status", render: (r) => <Badge status={r.status} /> },
            ]}
            data={project.deliverables || []}
            emptyMessage="No deliverables yet"
            onRowClick={(r) => setDrawerDeliverable(r)}
          />
          )}
        </Card>
      )}

      {tab === "payments" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile label="Project Value" value={formatCurrency(projectValue)} />
            <SummaryTile label="Total Received" value={formatCurrency(totalReceived)} />
            <SummaryTile
              label="Remaining"
              value={formatCurrency(remaining)}
              accent={remaining > 0 ? "text-amber-700" : "text-emerald-700"}
            />
          </div>
          <Card
            title="Payment history"
            action={
              <Button size="sm" onClick={() => setPaymentModalOpen(true)}>
                <Plus size={14} /> Record payment
              </Button>
            }
          >
            {tabLoading && !project.payments ? (
              <p className="text-sm text-admin-textMuted">Loading payments…</p>
            ) : (
            <Table
              columns={[
                {
                  key: "paymentDate",
                  label: "Date",
                  render: (r) => formatDate(r.paymentDate),
                },
                { key: "amount", label: "Amount", render: (r) => formatCurrency(r.amount) },
                { key: "method", label: "Method" },
                { key: "reference", label: "Reference", render: (r) => r.reference || "—" },
                { key: "notes", label: "Notes", render: (r) => r.notes || "—" },
                {
                  key: "actions",
                  label: "",
                  render: (r) => (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs font-medium text-admin-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditPayment(r);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletePaymentId(r._id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ),
                },
              ]}
              data={project.payments || []}
              emptyMessage="No payments recorded yet"
            />
            )}
          </Card>
        </>
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
          {tabLoading && !project.expenses ? (
            <p className="text-sm text-admin-textMuted">Loading expenses…</p>
          ) : (
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
          )}
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
        key={drawerDeliverable?._id || "closed"}
        open={!!drawerDeliverable}
        deliverable={drawerDeliverable}
        projectId={id}
        onClose={() => setDrawerDeliverable(null)}
        onSave={handleSaveDeliverable}
        onDelete={() => setDeleteDeliverableId(drawerDeliverable?._id)}
        onAssignmentsChange={handleAssignmentsChange}
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
                label={DELIVERABLE_AMOUNT_LABEL}
                type="number"
                min="0"
                value={newDeliverable.sellingPrice}
                onChange={(e) => setNewDeliverable((p) => ({ ...p, sellingPrice: e.target.value }))}
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

      <Modal
        open={paymentModalOpen || !!editingPayment}
        onClose={closePaymentModal}
        title={editingPayment ? "Edit payment" : "Record payment"}
      >
        <Form onSubmit={editingPayment ? handleUpdatePayment : handleAddPayment}>
          <FormSection>
            <FormGrid cols={2}>
              <Input
                label="Amount (₹)"
                type="number"
                min="1"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                required
              />
              <Input
                label="Payment date"
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
                placeholder="Optional"
              />
            </FormGrid>
            <Textarea
              label="Notes"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </FormSection>
          <FormFooter
            onCancel={closePaymentModal}
            submitLabel={editingPayment ? "Save payment" : "Record payment"}
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
