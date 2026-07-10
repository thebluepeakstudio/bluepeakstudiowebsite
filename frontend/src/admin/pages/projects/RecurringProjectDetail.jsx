import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileDown, Pencil, Plus } from "lucide-react";
import {
  getProject,
  patchRecurringConfig,
  createTemplateDeliverable,
  updateTemplateDeliverable,
  deleteTemplateDeliverable,
  updateCycleDeliverable,
  downloadCycleInvoice,
} from "../../api/services.api";
import { getFreelancers } from "../../api/freelancers.api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Tabs from "../../components/ui/Tabs";
import Table from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import WalletPanel from "../../components/projects/WalletPanel";
import PaymentAllocationModal from "../../components/projects/PaymentAllocationModal";
import ProjectFilesPanel from "../../components/projects/ProjectFilesPanel";
import CycleDeliverableFreelancerModal, {
  buildDeliverableDraft,
  getFreelancerAssignments,
} from "../../components/projects/CycleDeliverableFreelancerModal";
import RecurringApplyScopeModal from "../../components/projects/RecurringApplyScopeModal";
import { Input, Textarea, Select } from "../../components/ui/Input";
import FilterSelect from "../../components/ui/FilterSelect";
import { Form, FormGrid, FormSection } from "../../components/ui/Form";
import {
  DELIVERABLE_STATUSES,
  RECURRING_STATUSES,
  getProjectLabel,
  formatInvoiceStatus,
  getInvoiceOpenAmount,
} from "../../utils/constants";
import { formatCurrency, formatDate } from "../../utils/formatCurrency";
import { CardSkeleton } from "../../components/ui/Skeleton";
import toast from "react-hot-toast";
import { adminPath } from "../../utils/adminPaths";

const TABS = [
  { id: "template", label: "Template" },
  { id: "billing", label: "Monthly Invoices" },
  { id: "payments", label: "Payment History" },
  { id: "credit", label: "Prepaid Credit" },
  { id: "deliverables", label: "Monthly deliverables" },
  { id: "files", label: "Files" },
];

const draftKey = (cycleId, deliverableId) => `${cycleId}:${deliverableId}`;

const isDeliveredStatus = (status) => status === "Delivered";
const isClosedStatus = (status) => status === "Delivered" || status === "Cancelled";

export default function RecurringProjectDetail({ projectId }) {
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState("template");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configForm, setConfigForm] = useState(null);
  const [templateModal, setTemplateModal] = useState(null);
  const [cycleFilter, setCycleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deliverableFilter, setDeliverableFilter] = useState("");
  const [editDeliverable, setEditDeliverable] = useState(null);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [freelancerModal, setFreelancerModal] = useState(null);
  const [savingFreelancerModal, setSavingFreelancerModal] = useState(false);
  const [updatingStatusKey, setUpdatingStatusKey] = useState(null);
  const [freelancers, setFreelancers] = useState([]);
  const [savedMonthlyAmount, setSavedMonthlyAmount] = useState(null);
  const [applyScopeModal, setApplyScopeModal] = useState(null);
  const [pendingTemplateSubmit, setPendingTemplateSubmit] = useState(null);
  const [configEditOpen, setConfigEditOpen] = useState(false);

  useEffect(() => {
    getFreelancers({ lite: true, limit: 100 })
      .then(({ data }) => setFreelancers(data.data || []))
      .catch(() => setFreelancers([]));
  }, []);

  const load = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!silent) setLoading(true);
    try {
      const { data } = await getProject(projectId);
      setProject(data.data);
      const cfg = data.data.recurringConfig;
      if (cfg) {
        setConfigForm({
          startDate: cfg.startDate?.slice(0, 10) || "",
          billingDay: cfg.billingDay,
          monthlyClientAmount: cfg.monthlyClientAmount,
          generationLeadDays: cfg.generationLeadDays,
          status: cfg.status,
        });
        setSavedMonthlyAmount(Number(cfg.monthlyClientAmount));
      }
    } catch {
      toast.error("Failed to load project");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const persistConfig = async (applyScope = "future_only") => {
    setSaving(true);
    try {
      await patchRecurringConfig(projectId, {
        ...configForm,
        monthlyClientAmount: Number(configForm.monthlyClientAmount),
        billingDay: Number(configForm.billingDay),
        generationLeadDays: Number(configForm.generationLeadDays),
        applyScope,
      });
      toast.success("Billing configuration saved");
      setApplyScopeModal(null);
      setConfigEditOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = () => {
    const amountChanged =
      savedMonthlyAmount !== null &&
      Number(configForm.monthlyClientAmount) !== savedMonthlyAmount;

    if (amountChanged) {
      setApplyScopeModal({
        type: "config",
        title: "Apply monthly fee change",
        description: "Choose how this recurring amount change should be applied.",
      });
      return;
    }

    persistConfig();
  };

  const persistTemplate = async (templateData, applyScope = "future_only") => {
    setSaving(true);
    try {
      if (templateData._id) {
        await updateTemplateDeliverable(projectId, templateData._id, {
          title: templateData.title,
          description: templateData.description,
          applyScope,
        });
      } else {
        await createTemplateDeliverable(projectId, {
          title: templateData.title,
          description: templateData.description,
          applyScope,
        });
      }
      toast.success("Template item saved");
      setTemplateModal(null);
      setPendingTemplateSubmit(null);
      setApplyScopeModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    if (!templateModal?.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    const payload = templateModal;
    setPendingTemplateSubmit(payload);
    setTemplateModal(null);
    setApplyScopeModal({
      type: "template_save",
      title: payload._id ? "Apply template changes" : "Add template deliverable",
      description: "Choose whether to update only future months or include the current billing cycle.",
    });
  };

  const openConfigEdit = () => {
    const cfg = project?.recurringConfig;
    if (cfg) {
      setConfigForm({
        startDate: cfg.startDate?.slice(0, 10) || "",
        billingDay: cfg.billingDay,
        monthlyClientAmount: cfg.monthlyClientAmount,
        generationLeadDays: cfg.generationLeadDays,
        status: cfg.status,
      });
    }
    setConfigEditOpen(true);
  };

  const removeTemplate = (templateId) => {
    setApplyScopeModal({
      type: "template_delete",
      title: "Remove template deliverable",
      description: "Choose whether to remove this from future months only or also from the current billing cycle.",
      templateId,
    });
  };

  const handleApplyScopeConfirm = async (applyScope) => {
    if (!applyScopeModal) return;

    if (applyScopeModal.type === "config") {
      await persistConfig(applyScope);
      return;
    }

    if (applyScopeModal.type === "template_save" && pendingTemplateSubmit) {
      await persistTemplate(pendingTemplateSubmit, applyScope);
      return;
    }

    if (applyScopeModal.type === "template_delete") {
      setSaving(true);
      try {
        await deleteTemplateDeliverable(projectId, applyScopeModal.templateId, applyScope);
        toast.success("Template item removed");
        setApplyScopeModal(null);
        load();
      } catch (err) {
        toast.error(err.response?.data?.message || "Delete failed");
      } finally {
        setSaving(false);
      }
    }
  };

  const getFreelancerName = (freelancerId) => {
    const id = String(freelancerId?._id || freelancerId || "");
    return freelancers.find((f) => String(f._id) === id)?.name || "Freelancer";
  };

  const openFreelancerModal = (cycleId, deliverable, periodLabel) => {
    setFreelancerModal({
      cycleId,
      deliverable,
      periodLabel,
      draft: buildDeliverableDraft(deliverable),
    });
  };

  const saveFreelancerModal = async () => {
    if (!freelancerModal) return;
    const { cycleId, deliverable, draft } = freelancerModal;
    setSavingFreelancerModal(true);
    try {
      await updateCycleDeliverable(projectId, cycleId, deliverable._id, {
        freelancerAssignments: draft.assignments
          .filter((row) => row.freelancerId)
          .map((row) => ({
            freelancerId: row.freelancerId,
            fee: Number(row.fee) || 0,
          })),
      });
      toast.success("Freelancers saved");
      setFreelancerModal(null);
      await load({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSavingFreelancerModal(false);
    }
  };

  const updateDeliverableStatus = async (cycleId, deliverable, status) => {
    const key = draftKey(cycleId, deliverable._id);
    setUpdatingStatusKey(key);
    try {
      await updateCycleDeliverable(projectId, cycleId, deliverable._id, { status });
      await load({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Status update failed");
    } finally {
      setUpdatingStatusKey(null);
    }
  };

  const saveEditDeliverable = async (e) => {
    e.preventDefault();
    if (!editDeliverable) return;
    setSaving(true);
    try {
      await updateCycleDeliverable(projectId, editDeliverable.cycleId, editDeliverable._id, {
        status: editDeliverable.status,
        description: editDeliverable.description,
      });
      toast.success("Deliverable updated");
      setEditDeliverable(null);
      await load({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadInvoice = async (cycleId, periodLabel) => {
    try {
      const { data } = await downloadCycleInvoice(projectId, cycleId);
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${periodLabel}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invoice download failed");
    }
  };

  const cycles = project?.billingCycles || [];

  const deliverableTitleOptions = useMemo(() => {
    const titles = new Set();
    (project?.templateDeliverables || []).forEach((item) => {
      if (item.title) titles.add(item.title);
    });
    cycles.forEach((cycle) => {
      (cycle.deliverables || []).forEach((item) => {
        if (item.title) titles.add(item.title);
      });
    });
    return [...titles].sort().map((title) => ({ value: title, label: title }));
  }, [project?.templateDeliverables, cycles]);

  const filteredDeliverableRows = useMemo(() => {
    const sourceCycles = cycleFilter ? cycles.filter((c) => c._id === cycleFilter) : cycles;
    const rows = sourceCycles.flatMap((cycle) =>
      (cycle.deliverables || []).map((deliverable) => ({
        ...deliverable,
        _rowId: `${cycle._id}:${deliverable._id}`,
        cycleId: cycle._id,
        periodLabel: cycle.periodLabel,
        isHistorical: cycle.isHistorical,
        isCurrent: cycle.isCurrent,
      }))
    );

    return rows.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (deliverableFilter && row.title !== deliverableFilter) return false;
      return true;
    });
  }, [cycles, cycleFilter, statusFilter, deliverableFilter]);

  const activeDeliverableRows = filteredDeliverableRows.filter((row) => !isClosedStatus(row.status));
  const deliveredDeliverableRows = filteredDeliverableRows.filter((row) => isDeliveredStatus(row.status));

  if (loading || !project) return <CardSkeleton rows={6} />;

  const renderDeliverableCell = (r) => {
    const assignments = getFreelancerAssignments(r);
    return (
      <div>
        <p className="font-medium text-admin-text">{r.title}</p>
        {r.description && <p className="text-xs text-admin-textMuted">{r.description}</p>}
        <p className="mt-1 text-xs text-admin-textMuted">
          {assignments.length === 0
            ? "In-house"
            : assignments
                .map(
                  (row) => `${getFreelancerName(row.freelancerId)} · ${formatCurrency(row.fee)}`
                )
                .join(", ")}
        </p>
      </div>
    );
  };

  const renderPeriodCell = (r) => (
    <div className="flex items-center gap-2">
      <span>{r.periodLabel}</span>
      {r.isCurrent && <Badge status="Current" />}
      {r.isHistorical && <Badge status="Snapshot" />}
    </div>
  );

  const deliverableTableColumns = ({ showStatusSelect = true, showEdit = false } = {}) => [
    { key: "periodLabel", label: "Date", render: renderPeriodCell },
    { key: "title", label: "Deliverable", render: renderDeliverableCell },
    showStatusSelect
      ? {
          key: "status",
          label: "Status",
          render: (r) => (
            <div className="min-w-[128px]" onClick={(e) => e.stopPropagation()}>
              <Select
                value={r.status}
                onChange={(e) => updateDeliverableStatus(r.cycleId, r, e.target.value)}
                disabled={updatingStatusKey === draftKey(r.cycleId, r._id)}
                options={DELIVERABLE_STATUSES.filter((s) => s !== "Cancelled").map((s) => ({
                  value: s,
                  label: s,
                }))}
              />
            </div>
          ),
        }
      : {
          key: "status",
          label: "Status",
          render: (r) => <Badge status={r.status} />,
        },
    {
      key: "actions",
      label: showEdit ? "Actions" : "Freelancers",
      render: (r) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {showEdit && (
            <button
              type="button"
              onClick={() =>
                setEditDeliverable({
                  ...r,
                  description: r.description || "",
                })
              }
              className="inline-flex items-center gap-1 text-xs font-medium text-admin-primary hover:underline"
            >
              <Pencil size={13} /> Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => openFreelancerModal(r.cycleId, r, r.periodLabel)}
            className="hidden items-center gap-1 text-xs font-medium text-admin-primary hover:underline md:inline-flex"
          >
            <Plus size={13} />
            {getFreelancerAssignments(r).length ? "Freelancers" : "Add freelancer"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(adminPath("projects"))}
          className="inline-flex items-center gap-1 text-sm text-admin-textMuted hover:text-admin-text"
        >
          <ArrowLeft size={16} /> Services
        </button>
        <Badge status="Recurring" />
        {project.recurringConfig?.status && (
          <Badge status={project.recurringConfig.status} />
        )}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-admin-text">{getProjectLabel(project)}</h1>
          <p className="text-sm text-admin-textMuted">
            {project.clientName}
            {project.businessName ? ` · ${project.businessName}` : ""} · MRR{" "}
            {formatCurrency(project.monthlyClientAmount)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={openConfigEdit}>
            <Pencil size={16} /> Edit
          </Button>
          <Button onClick={() => setAllocateOpen(true)}>Receive payment</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="p-4">
          <p className="text-xs text-admin-textMuted">Current Recurring Amount</p>
          <p className="text-xl font-bold">
            {formatCurrency(project.currentRecurringAmount ?? project.monthlyFee ?? project.monthlyClientAmount)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-admin-textMuted">Next Billing Date</p>
          <p className="text-xl font-bold">
            {project.nextBillingDate ? formatDate(project.nextBillingDate) : "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-admin-textMuted">Prepaid Credit</p>
          <p className="text-xl font-bold">
            {formatCurrency(project.prepaidCredit ?? project.wallet?.balance ?? 0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-admin-textMuted">Outstanding</p>
          <p className="text-xl font-bold">
            {formatCurrency(project.outstandingAmount ?? project.remainingAmount)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-admin-textMuted">Total Paid</p>
          <p className="text-xl font-bold">{formatCurrency(project.totalPaid ?? 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-admin-textMuted">Lifetime Revenue</p>
          <p className="text-xl font-bold">{formatCurrency(project.lifetimeRevenue ?? 0)}</p>
        </Card>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "template" && configForm && (
        <div className="space-y-6">
          <p className="text-sm text-admin-textMuted">
            The deliverable template and recurring amount define what gets copied into each new billing
            cycle. Past months remain frozen snapshots.
          </p>
          <FormSection title="Billing configuration">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs text-admin-textMuted">Start date</dt>
                <dd className="mt-1 text-sm font-medium text-admin-text">
                  {configForm.startDate ? formatDate(configForm.startDate) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-admin-textMuted">Billing day</dt>
                <dd className="mt-1 text-sm font-medium text-admin-text">{configForm.billingDay}</dd>
              </div>
              <div>
                <dt className="text-xs text-admin-textMuted">Current Recurring Amount</dt>
                <dd className="mt-1 text-sm font-medium text-admin-text">
                  {formatCurrency(configForm.monthlyClientAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-admin-textMuted">Lead days</dt>
                <dd className="mt-1 text-sm font-medium text-admin-text">
                  {configForm.generationLeadDays}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-admin-textMuted">Status</dt>
                <dd className="mt-1">
                  <Badge status={configForm.status} />
                </dd>
              </div>
            </dl>
            <p className="text-xs text-admin-textMuted">
              Use the Edit button above to change billing configuration.
            </p>
          </FormSection>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Deliverable Template</h3>
                <p className="text-xs text-admin-textMuted">
                  Master list copied into each new billing cycle. Changes affect future months by default.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setTemplateModal({ title: "", description: "" })}
              >
                <Plus size={16} /> Add item
              </Button>
            </div>
            <Table
              actionsAlign="end"
              columns={[
                { key: "title", label: "Title" },
                {
                  key: "actions",
                  label: "",
                  render: (r) => (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="text-xs text-admin-primary hover:underline"
                        onClick={() => setTemplateModal(r)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => removeTemplate(r._id)}
                      >
                        Remove
                      </button>
                    </div>
                  ),
                },
              ]}
              data={project.templateDeliverables || []}
            />
          </div>
        </div>
      )}

      {tab === "billing" && (
        <div className="space-y-3">
          <p className="text-sm text-admin-textMuted">
            Past months are frozen records. Edit the Template tab to change future months.
          </p>
          <Table
            columns={[
              {
                key: "periodLabel",
                label: "Billing Period",
                render: (r) => (
                  <div className="flex items-center gap-2">
                    <span>{r.periodLabel}</span>
                    {r.isCurrent && <Badge status="Current" />}
                    {r.isHistorical && <Badge status="Snapshot" />}
                  </div>
                ),
              },
            {
              key: "amount",
              label: "Amount",
              render: (r) => formatCurrency(r.invoice?.amountDue ?? r.clientAmountSnapshot),
            },
            {
              key: "paid",
              label: "Paid",
              render: (r) =>
                formatCurrency(
                  (Number(r.invoice?.amountPaid) || 0) + (Number(r.invoice?.creditApplied) || 0)
                ),
            },
            {
              key: "remaining",
              label: "Remaining",
              render: (r) => formatCurrency(getInvoiceOpenAmount(r.invoice)),
            },
            {
              key: "status",
              label: "Status",
              render: (r) =>
                r.invoice ? (
                  <Badge status={formatInvoiceStatus(r.invoice.status)} />
                ) : (
                  "—"
                ),
            },
            {
              key: "generated",
              label: "Generated Date",
              render: (r) => formatDate(r.generatedAt || r.invoice?.createdAt),
            },
            {
              key: "paidDate",
              label: "Paid Date",
              render: (r) => (r.invoice?.paidAt ? formatDate(r.invoice.paidAt) : "—"),
            },
            {
              key: "actions",
              label: "Actions",
              render: (r) => (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-admin-primary"
                  onClick={() => handleDownloadInvoice(r._id, r.periodLabel)}
                >
                  <FileDown size={14} /> PDF
                </button>
              ),
            },
          ]}
          data={cycles}
        />
        </div>
      )}

      {tab === "payments" && (
        <Table
          columns={[
            {
              key: "date",
              label: "Date",
              render: (r) => formatDate(r.paymentDate),
            },
            {
              key: "amount",
              label: "Amount",
              render: (r) => formatCurrency(r.totalAmount),
            },
            { key: "method", label: "Method", render: (r) => r.method || "—" },
            { key: "notes", label: "Notes", render: (r) => r.notes || "—" },
            {
              key: "allocations",
              label: "Allocation Details",
              render: (r) => (
                <ul className="space-y-1 text-xs">
                  {(r.allocations || []).map((row) => (
                    <li key={row._id}>
                      {row.targetTypeLabel}
                      {row.periodLabel ? ` · ${row.periodLabel}` : ""}
                      {": "}
                      {formatCurrency(row.amount)}
                    </li>
                  ))}
                </ul>
              ),
            },
          ]}
          data={project.paymentHistory || []}
          emptyMessage="No payments recorded yet."
        />
      )}

      {tab === "credit" && (
        <WalletPanel
          wallet={project.wallet}
          onAllocate={() => setAllocateOpen(true)}
        />
      )}

      {tab === "deliverables" && (
        <div className="space-y-5">
          <p className="text-sm text-admin-textMuted">
            Past months are frozen records. Edit the Template tab to change future months.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <FilterSelect
              label="Month"
              value={cycleFilter}
              onChange={setCycleFilter}
              className="w-[168px]"
              options={[
                { value: "", label: "All months" },
                ...cycles.map((c) => ({ value: String(c._id), label: c.periodLabel })),
              ]}
            />
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-[168px]"
              options={[
                { value: "", label: "All statuses" },
                ...DELIVERABLE_STATUSES.filter((s) => s !== "Cancelled").map((s) => ({
                  value: s,
                  label: s,
                })),
              ]}
            />
            <FilterSelect
              label="Deliverable"
              value={deliverableFilter}
              onChange={setDeliverableFilter}
              className="w-[200px]"
              options={[{ value: "", label: "All deliverables" }, ...deliverableTitleOptions]}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-admin-text">Active deliverables</h3>
            <Table
              hideMobileActions
              actionsAlign="end"
              columns={deliverableTableColumns({ showStatusSelect: true, showEdit: false })}
              data={activeDeliverableRows}
              emptyMessage="No active deliverables for this filter."
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-admin-text">Delivered</h3>
            <Table
              actionsAlign="end"
              columns={deliverableTableColumns({ showStatusSelect: false, showEdit: true })}
              data={deliveredDeliverableRows}
              emptyMessage="No delivered deliverables for this filter."
            />
          </div>
        </div>
      )}

      {tab === "files" && <ProjectFilesPanel projectId={projectId} />}

      <RecurringApplyScopeModal
        open={!!applyScopeModal}
        title={applyScopeModal?.title}
        description={applyScopeModal?.description}
        currentPeriodLabel={project.currentPeriodLabel}
        saving={saving}
        onClose={() => {
          setApplyScopeModal(null);
          setPendingTemplateSubmit(null);
        }}
        onConfirm={handleApplyScopeConfirm}
      />

      <CycleDeliverableFreelancerModal
        open={!!freelancerModal}
        deliverable={freelancerModal?.deliverable}
        periodLabel={freelancerModal?.periodLabel}
        draft={freelancerModal?.draft}
        freelancers={freelancers}
        saving={savingFreelancerModal}
        onClose={() => setFreelancerModal(null)}
        onDraftChange={(draft) =>
          setFreelancerModal((current) => (current ? { ...current, draft } : current))
        }
        onSave={saveFreelancerModal}
      />

      <Modal
        open={!!editDeliverable}
        onClose={() => setEditDeliverable(null)}
        title="Edit deliverable"
        description={editDeliverable ? `${editDeliverable.title} · ${editDeliverable.periodLabel}` : ""}
      >
        {editDeliverable && (
          <Form onSubmit={saveEditDeliverable}>
            <Select
              label="Status"
              value={editDeliverable.status}
              onChange={(e) =>
                setEditDeliverable((current) => ({ ...current, status: e.target.value }))
              }
              options={DELIVERABLE_STATUSES.filter((s) => s !== "Cancelled").map((s) => ({
                value: s,
                label: s,
              }))}
            />
            <Textarea
              label="Description"
              value={editDeliverable.description || ""}
              onChange={(e) =>
                setEditDeliverable((current) => ({ ...current, description: e.target.value }))
              }
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  openFreelancerModal(
                    editDeliverable.cycleId,
                    editDeliverable,
                    editDeliverable.periodLabel
                  );
                  setEditDeliverable(null);
                }}
              >
                Manage freelancers
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditDeliverable(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      <Modal
        open={configEditOpen}
        onClose={() => setConfigEditOpen(false)}
        title="Edit billing configuration"
        size="lg"
      >
        {configForm && (
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveConfig();
            }}
          >
            <FormGrid>
              <Input
                label="Start date"
                type="date"
                value={configForm.startDate}
                onChange={(e) => setConfigForm((c) => ({ ...c, startDate: e.target.value }))}
              />
              <Input
                label="Billing day"
                type="number"
                min={1}
                max={28}
                value={configForm.billingDay}
                onChange={(e) => setConfigForm((c) => ({ ...c, billingDay: e.target.value }))}
              />
              <Input
                label="Current Recurring Amount (Monthly Fee)"
                type="number"
                value={configForm.monthlyClientAmount}
                onChange={(e) =>
                  setConfigForm((c) => ({ ...c, monthlyClientAmount: e.target.value }))
                }
                hint="Applies to future billing cycles. Past invoices keep their original amount."
              />
              <Input
                label="Lead days"
                type="number"
                min={3}
                max={7}
                value={configForm.generationLeadDays}
                onChange={(e) =>
                  setConfigForm((c) => ({ ...c, generationLeadDays: e.target.value }))
                }
              />
              <Select
                label="Status"
                value={configForm.status}
                onChange={(e) => setConfigForm((c) => ({ ...c, status: e.target.value }))}
                options={RECURRING_STATUSES.map((s) => ({ value: s, label: s }))}
              />
            </FormGrid>
            <div className="flex justify-end gap-2 border-t border-admin-border pt-4">
              <Button type="button" variant="ghost" onClick={() => setConfigEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save config
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      <Modal
        open={!!templateModal}
        onClose={() => setTemplateModal(null)}
        title={templateModal?._id ? "Edit template item" : "Add template item"}
      >
        {templateModal && (
          <Form onSubmit={saveTemplate}>
            <Input
              label="Title"
              value={templateModal.title}
              onChange={(e) => setTemplateModal((t) => ({ ...t, title: e.target.value }))}
              required
            />
            <Textarea
              label="Description"
              value={templateModal.description || ""}
              onChange={(e) => setTemplateModal((t) => ({ ...t, description: e.target.value }))}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setTemplateModal(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Next
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      <PaymentAllocationModal
        open={allocateOpen}
        onClose={() => setAllocateOpen(false)}
        clientId={project.clientId?._id || project.clientId}
        clientName={project.clientName}
        fixedServiceId={projectId}
        fixedServiceName={getProjectLabel(project)}
        fixedBillingModel="recurring"
        onSuccess={load}
      />
    </div>
  );
}
