import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileDown, Plus, Trash2 } from "lucide-react";
import {
  getProject,
  patchRecurringConfig,
  createTemplateDeliverable,
  updateTemplateDeliverable,
  deleteTemplateDeliverable,
  updateCycleDeliverable,
  payCycleFreelancerDue,
  downloadCycleInvoice,
} from "../../api/projects.api";
import { getFreelancers } from "../../api/freelancers.api";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Tabs from "../../components/ui/Tabs";
import Table from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import WalletPanel from "../../components/projects/WalletPanel";
import PaymentAllocationModal from "../../components/projects/PaymentAllocationModal";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { Form, FormGrid, FormSection } from "../../components/ui/Form";
import {
  DELIVERABLE_STATUSES,
  RECURRING_STATUSES,
  PAID_VIA,
  getProjectLabel,
} from "../../utils/constants";
import { formatCurrency, formatDate } from "../../utils/formatCurrency";
import { CardSkeleton } from "../../components/ui/Skeleton";
import toast from "react-hot-toast";
import { adminPath } from "../../utils/adminPaths";

const TABS = [
  { id: "template", label: "Template" },
  { id: "billing", label: "Billing history" },
  { id: "wallet", label: "Wallet" },
  { id: "deliverables", label: "Monthly deliverables" },
  { id: "freelancer", label: "Freelancer dues" },
];

export default function RecurringProjectDetail({ projectId }) {
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState("template");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configForm, setConfigForm] = useState(null);
  const [templateModal, setTemplateModal] = useState(null);
  const [cycleFilter, setCycleFilter] = useState("");
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [payDueModal, setPayDueModal] = useState(null);
  const [freelancers, setFreelancers] = useState([]);

  useEffect(() => {
    getFreelancers({ lite: true, limit: 100 })
      .then(({ data }) => setFreelancers(data.data || []))
      .catch(() => setFreelancers([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
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
      }
    } catch {
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await patchRecurringConfig(projectId, {
        ...configForm,
        monthlyClientAmount: Number(configForm.monthlyClientAmount),
        billingDay: Number(configForm.billingDay),
        generationLeadDays: Number(configForm.generationLeadDays),
      });
      toast.success("Template config saved");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (templateModal._id) {
        await updateTemplateDeliverable(projectId, templateModal._id, templateModal);
      } else {
        await createTemplateDeliverable(projectId, templateModal);
      }
      toast.success("Template item saved");
      setTemplateModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeTemplate = async (templateId) => {
    if (!confirm("Remove this template item? Future cycles only.")) return;
    try {
      await deleteTemplateDeliverable(projectId, templateId);
      toast.success("Removed");
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const updateDeliverableStatus = async (cycleId, deliverableId, status) => {
    try {
      await updateCycleDeliverable(projectId, cycleId, deliverableId, { status });
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  const updateCycleFreelancer = async (cycleId, deliverableId, freelancerId, freelancerFee) => {
    try {
      await updateCycleDeliverable(projectId, cycleId, deliverableId, {
        freelancerId: freelancerId || null,
        freelancerFee: Number(freelancerFee) || 0,
      });
      load();
    } catch {
      toast.error("Freelancer assignment failed");
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
    } catch {
      toast.error("Invoice download failed");
    }
  };

  const submitFreelancerPay = async (e) => {
    e.preventDefault();
    if (!payDueModal) return;
    setSaving(true);
    try {
      await payCycleFreelancerDue(projectId, payDueModal.cycleId, payDueModal.due._id, {
        amount: Number(payDueModal.amount),
        paymentDate: payDueModal.paymentDate,
        paidVia: payDueModal.paidVia,
        notes: payDueModal.notes,
      });
      toast.success("Freelancer due paid");
      setPayDueModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !project) return <CardSkeleton rows={6} />;

  const cycles = project.billingCycles || [];
  const filteredCycles = cycleFilter
    ? cycles.filter((c) => c._id === cycleFilter)
    : cycles;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(adminPath("services"))}
          className="inline-flex items-center gap-1 text-sm text-admin-textMuted hover:text-admin-text"
        >
          <ArrowLeft size={16} /> Projects
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
        <Button onClick={() => setAllocateOpen(true)}>Receive payment</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-admin-textMuted">Monthly amount</p>
          <p className="text-xl font-bold">{formatCurrency(project.monthlyClientAmount)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-admin-textMuted">Wallet balance</p>
          <p className="text-xl font-bold">{formatCurrency(project.wallet?.balance || 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-admin-textMuted">Outstanding</p>
          <p className="text-xl font-bold">{formatCurrency(project.remainingAmount)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-admin-textMuted">Billing cycles</p>
          <p className="text-xl font-bold">{cycles.length}</p>
        </Card>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "template" && configForm && (
        <div className="space-y-6">
          <FormSection title="Billing configuration">
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
                label="Monthly client amount"
                type="number"
                value={configForm.monthlyClientAmount}
                onChange={(e) =>
                  setConfigForm((c) => ({ ...c, monthlyClientAmount: e.target.value }))
                }
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
            <Button onClick={saveConfig} loading={saving}>
              Save config
            </Button>
          </FormSection>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Template deliverables</h3>
              <Button
                size="sm"
                onClick={() => setTemplateModal({ title: "", description: "" })}
              >
                <Plus size={16} /> Add item
              </Button>
            </div>
            <Table
              columns={[
                { key: "title", label: "Title" },
                {
                  key: "actions",
                  label: "",
                  render: (r) => (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs text-admin-primary"
                        onClick={() => setTemplateModal(r)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-600"
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
        <Table
          columns={[
            { key: "periodLabel", label: "Period", render: (r) => r.periodLabel },
            { key: "phase", label: "Phase", render: (r) => <Badge status={r.phase} /> },
            {
              key: "amount",
              label: "Amount",
              render: (r) => formatCurrency(r.clientAmountSnapshot),
            },
            {
              key: "invoice",
              label: "Invoice",
              render: (r) =>
                r.invoice ? (
                  <Badge status={r.invoice.status} />
                ) : (
                  "—"
                ),
            },
            {
              key: "due",
              label: "Due date",
              render: (r) => formatDate(r.billingDate),
            },
            {
              key: "actions",
              label: "",
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
      )}

      {tab === "wallet" && (
        <WalletPanel
          wallet={project.wallet}
          onAllocate={() => setAllocateOpen(true)}
        />
      )}

      {tab === "deliverables" && (
        <div className="space-y-4">
          <Select
            label="Filter by month"
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
            options={[
              { value: "", label: "All months" },
              ...cycles.map((c) => ({ value: String(c._id), label: c.periodLabel })),
            ]}
          />
          {filteredCycles.map((cycle) => (
            <Card key={cycle._id} className="p-4">
              <h3 className="mb-3 font-semibold">{cycle.periodLabel}</h3>
              <Table
                columns={[
                  { key: "title", label: "Item" },
                  {
                    key: "status",
                    label: "Status",
                    render: (r) => (
                      <Select
                        value={r.status}
                        onChange={(e) =>
                          updateDeliverableStatus(cycle._id, r._id, e.target.value)
                        }
                        options={DELIVERABLE_STATUSES.filter((s) => s !== "Cancelled").map((s) => ({
                          value: s,
                          label: s,
                        }))}
                      />
                    ),
                  },
                  {
                    key: "freelancer",
                    label: "Freelancer",
                    render: (r) => (
                      <Select
                        value={r.freelancerId?._id || r.freelancerId || ""}
                        onChange={(e) =>
                          updateCycleFreelancer(
                            cycle._id,
                            r._id,
                            e.target.value,
                            r.freelancerFee || 0
                          )
                        }
                        options={[
                          { value: "", label: "In-house" },
                          ...freelancers.map((f) => ({ value: f._id, label: f.name })),
                        ]}
                      />
                    ),
                  },
                  {
                    key: "fee",
                    label: "Agreed fee",
                    render: (r) => (
                      <Input
                        type="number"
                        min="0"
                        value={r.freelancerFee || ""}
                        onChange={(e) =>
                          updateCycleFreelancer(
                            cycle._id,
                            r._id,
                            r.freelancerId?._id || r.freelancerId || "",
                            e.target.value
                          )
                        }
                        placeholder="0"
                      />
                    ),
                  },
                ]}
                data={cycle.deliverables || []}
              />
            </Card>
          ))}
        </div>
      )}

      {tab === "freelancer" && (
        <Table
          columns={[
            { key: "periodLabel", label: "Month", render: (r) => r.periodLabel },
            { key: "deliverableTitle", label: "Deliverable" },
            { key: "clientName", label: "Client" },
            {
              key: "amount",
              label: "Amount",
              render: (r) => formatCurrency(r.amount),
            },
            {
              key: "paid",
              label: "Paid",
              render: (r) => formatCurrency(r.amountPaid),
            },
            {
              key: "status",
              label: "Status",
              render: (r) => <Badge status={r.status} />,
            },
            {
              key: "actions",
              label: "",
              render: (r) => {
                const open = (r.amount || 0) - (r.amountPaid || 0);
                if (open <= 0) return null;
                return (
                  <button
                    type="button"
                    className="text-xs text-admin-primary"
                    onClick={() =>
                      setPayDueModal({
                        cycleId: r.billingCycleId,
                        due: r,
                        amount: String(open),
                        paymentDate: new Date().toISOString().slice(0, 10),
                        paidVia: "UPI",
                        notes: "",
                      })
                    }
                  >
                    Pay
                  </button>
                );
              },
            },
          ]}
          data={cycles.flatMap((c) =>
            (c.freelancerDues || []).map((due) => ({
              ...due,
              periodLabel: c.periodLabel,
              billingCycleId: c._id,
            }))
          )}
        />
      )}

      <Modal
        open={!!templateModal}
        onClose={() => setTemplateModal(null)}
        title={templateModal?._id ? "Edit template item" : "Add template item"}
      >
        {templateModal && (
          <Form onSubmit={saveTemplate}>
            <FormGrid>
              <Input
                label="Title"
                value={templateModal.title}
                onChange={(e) => setTemplateModal((t) => ({ ...t, title: e.target.value }))}
                required
              />
            </FormGrid>
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
                Save
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      <Modal open={!!payDueModal} onClose={() => setPayDueModal(null)} title="Pay freelancer due">
        {payDueModal && (
          <Form onSubmit={submitFreelancerPay}>
            <Input
              label="Amount"
              type="number"
              value={payDueModal.amount}
              onChange={(e) => setPayDueModal((p) => ({ ...p, amount: e.target.value }))}
            />
            <Input
              label="Payment date"
              type="date"
              value={payDueModal.paymentDate}
              onChange={(e) => setPayDueModal((p) => ({ ...p, paymentDate: e.target.value }))}
            />
            <Select
              label="Paid via"
              value={payDueModal.paidVia}
              onChange={(e) => setPayDueModal((p) => ({ ...p, paidVia: e.target.value }))}
              options={PAID_VIA.map((m) => ({ value: m, label: m }))}
            />
            <Textarea
              label="Notes"
              value={payDueModal.notes}
              onChange={(e) => setPayDueModal((p) => ({ ...p, notes: e.target.value }))}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPayDueModal(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Record payment
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
