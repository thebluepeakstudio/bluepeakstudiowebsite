import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Form, FormSection, FormGrid, FormFooter } from "../../components/ui/Form";
import { Input, Textarea, Select } from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import {
  SERVICE_CATEGORIES,
  DELIVERABLE_STATUSES,
  PROJECT_PAYMENT_TYPES,
  PAID_VIA,
} from "../../utils/constants";
import { getClients } from "../../api/clients.api";
import { formatCurrency } from "../../utils/formatCurrency";

const emptyDeliverable = () => ({
  title: "",
  category: "Website",
  description: "",
  sellingPrice: 0,
  expectedCompletion: "",
  status: "Not Started",
});

const emptyProject = {
  clientId: "",
  clientName: "",
  businessName: "",
  contactNumber: "",
  email: "",
  projectTitle: "",
  projectDescription: "",
  dateOfOnboarding: "",
  expectedCompletionDate: "",
  googleDriveLink: "",
  notes: "",
};

const STEPS = ["Project Info", "Deliverables", "Payment"];

export default function ProjectWizard({ initial, onSubmit, loading, onCancel, submitLabel = "Create project" }) {
  const [step, setStep] = useState(0);
  const [project, setProject] = useState({ ...emptyProject });
  const [deliverables, setDeliverables] = useState([emptyDeliverable()]);
  const [totalAmountOverride, setTotalAmountOverride] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState(0);
  const [initialPayment, setInitialPayment] = useState({
    enabled: false,
    type: "Advance",
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    method: "UPI",
    reference: "",
    notes: "",
  });
  const [clients, setClients] = useState([]);

  useEffect(() => {
    getClients({ limit: 100 })
      .then(({ data }) => setClients(data.data))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (initial?.clientId) {
      const clientId = initial.clientId._id || initial.clientId;
      setProject((p) => ({ ...p, clientId }));
    }
  }, [initial]);

  const calculatedTotal = deliverables.reduce(
    (sum, d) => sum + (Number(d.sellingPrice) || 0),
    0
  );
  const finalTotal = totalAmountOverride ? Number(overrideAmount) || 0 : calculatedTotal;

  const setProjectField = (key, value) => setProject((p) => ({ ...p, [key]: value }));

  const onClientChange = (clientId) => {
    const client = clients.find((c) => c._id === clientId);
    if (client) {
      setProject((p) => ({
        ...p,
        clientId,
        clientName: client.name,
        businessName: client.companyName || "",
        contactNumber: client.phone || "",
        email: client.email || "",
      }));
    } else {
      setProjectField("clientId", clientId);
    }
  };

  const setDeliverable = (index, key, value) => {
    setDeliverables((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const addDeliverable = () => setDeliverables((rows) => [...rows, emptyDeliverable()]);
  const removeDeliverable = (index) => {
    if (deliverables.length <= 1) return;
    setDeliverables((rows) => rows.filter((_, i) => i !== index));
  };

  const validateStep = () => {
    if (step === 0) {
      if (!project.clientId && !project.clientName?.trim()) return "Client is required";
      if (!project.projectTitle?.trim()) return "Project name is required";
    }
    if (step === 1) {
      if (!deliverables.length) return "Add at least one deliverable";
      for (const d of deliverables) {
        if (!d.title?.trim()) return "Each deliverable needs a title";
        if (!d.category) return "Each deliverable needs a category";
      }
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) return err;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validateStep();
    if (err) return;

    const payments = [];
    if (initialPayment.enabled && Number(initialPayment.amount) > 0) {
      payments.push({
        type: initialPayment.type,
        amount: Number(initialPayment.amount),
        paymentDate: initialPayment.paymentDate,
        method: initialPayment.method,
        reference: initialPayment.reference,
        notes: initialPayment.notes,
      });
    }

    onSubmit({
      project: {
        ...project,
        clientId: project.clientId || undefined,
        totalAmount: finalTotal,
      },
      deliverables: deliverables.map((d) => ({
        title: d.title,
        category: d.category,
        description: d.description,
        sellingPrice: Number(d.sellingPrice) || 0,
        expectedCompletion: d.expectedCompletion || undefined,
        status: d.status,
      })),
      payments,
      totalAmountOverride,
    });
  };

  return (
    <Form id="project-wizard" onSubmit={handleSubmit}>
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i <= step ? "bg-admin-primary text-white" : "bg-admin-muted text-admin-textMuted"
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-sm ${i === step ? "font-semibold text-admin-text" : "text-admin-textMuted"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 text-admin-textMuted">→</span>}
          </div>
        ))}
      </div>

      {step === 0 && (
        <FormSection title="Project information" description="Link to a client and name this engagement.">
          <FormGrid cols={2}>
            <Select
              label="Client"
              value={project.clientId}
              onChange={(e) => onClientChange(e.target.value)}
              options={[
                { value: "", label: "Select client…" },
                ...clients.map((c) => ({
                  value: c._id,
                  label: c.companyName ? `${c.name} — ${c.companyName}` : c.name,
                })),
              ]}
            />
            <Input
              label="Project name"
              required
              value={project.projectTitle}
              onChange={(e) => setProjectField("projectTitle", e.target.value)}
              placeholder="e.g. Homely Vibes PG"
            />
          </FormGrid>
          {!project.clientId && (
            <FormGrid cols={2}>
              <Input
                label="Client name"
                value={project.clientName}
                onChange={(e) => setProjectField("clientName", e.target.value)}
                required
              />
              <Input
                label="Business name"
                value={project.businessName}
                onChange={(e) => setProjectField("businessName", e.target.value)}
              />
            </FormGrid>
          )}
          <Textarea
            label="Description"
            value={project.projectDescription}
            onChange={(e) => setProjectField("projectDescription", e.target.value)}
          />
          <FormGrid cols={2}>
            <Input
              label="Onboarding date"
              type="date"
              value={project.dateOfOnboarding}
              onChange={(e) => setProjectField("dateOfOnboarding", e.target.value)}
            />
            <Input
              label="Expected completion"
              type="date"
              value={project.expectedCompletionDate}
              onChange={(e) => setProjectField("expectedCompletionDate", e.target.value)}
            />
          </FormGrid>
        </FormSection>
      )}

      {step === 1 && (
        <FormSection title="Deliverables" description="Add each service sold under this project.">
          <div className="space-y-4">
            {deliverables.map((row, index) => (
              <div key={index} className="rounded-xl border border-admin-border bg-admin-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-admin-text">Deliverable {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => removeDeliverable(index)}
                    disabled={deliverables.length <= 1}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
                <FormGrid cols={2}>
                  <Input
                    label="Title"
                    value={row.title}
                    onChange={(e) => setDeliverable(index, "title", e.target.value)}
                    required
                  />
                  <Select
                    label="Category"
                    value={row.category}
                    onChange={(e) => setDeliverable(index, "category", e.target.value)}
                    options={SERVICE_CATEGORIES}
                  />
                  <Input
                    label="Selling price (₹)"
                    type="number"
                    min="0"
                    value={row.sellingPrice}
                    onChange={(e) => setDeliverable(index, "sellingPrice", e.target.value)}
                  />
                  <Input
                    label="Expected completion"
                    type="date"
                    value={row.expectedCompletion}
                    onChange={(e) => setDeliverable(index, "expectedCompletion", e.target.value)}
                  />
                  <Select
                    label="Status"
                    value={row.status}
                    onChange={(e) => setDeliverable(index, "status", e.target.value)}
                    options={DELIVERABLE_STATUSES}
                  />
                </FormGrid>
                <Textarea
                  label="Description"
                  value={row.description}
                  onChange={(e) => setDeliverable(index, "description", e.target.value)}
                />
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addDeliverable}>
              <Plus size={16} /> Add deliverable
            </Button>
            <p className="text-sm text-admin-textMuted">
              Running total: <span className="font-semibold text-admin-text">{formatCurrency(calculatedTotal)}</span>
            </p>
          </div>
        </FormSection>
      )}

      {step === 2 && (
        <FormSection title="Payment" description="Project total is calculated from deliverables.">
          <div className="rounded-xl border border-admin-border bg-admin-surface p-4">
            <p className="text-sm text-admin-textMuted">Calculated total</p>
            <p className="text-2xl font-bold text-admin-text">{formatCurrency(calculatedTotal)}</p>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={totalAmountOverride}
              onChange={(e) => {
                setTotalAmountOverride(e.target.checked);
                if (e.target.checked) setOverrideAmount(calculatedTotal);
              }}
            />
            Override total amount
          </label>
          {totalAmountOverride && (
            <Input
              label="Override total (₹)"
              type="number"
              min="0"
              value={overrideAmount}
              onChange={(e) => setOverrideAmount(e.target.value)}
            />
          )}
          <p className="text-sm font-medium text-admin-text">
            Final project value: {formatCurrency(finalTotal)}
          </p>

          <div className="mt-6 rounded-xl border border-admin-border p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={initialPayment.enabled}
                onChange={(e) => setInitialPayment((p) => ({ ...p, enabled: e.target.checked }))}
              />
              Record initial payment
            </label>
            {initialPayment.enabled && (
              <FormGrid cols={2} className="mt-3">
                <Select
                  label="Type"
                  value={initialPayment.type}
                  onChange={(e) => setInitialPayment((p) => ({ ...p, type: e.target.value }))}
                  options={PROJECT_PAYMENT_TYPES}
                />
                <Input
                  label="Amount (₹)"
                  type="number"
                  min="0"
                  max={finalTotal}
                  value={initialPayment.amount}
                  onChange={(e) => setInitialPayment((p) => ({ ...p, amount: e.target.value }))}
                />
                <Input
                  label="Payment date"
                  type="date"
                  value={initialPayment.paymentDate}
                  onChange={(e) => setInitialPayment((p) => ({ ...p, paymentDate: e.target.value }))}
                />
                <Select
                  label="Method"
                  value={initialPayment.method}
                  onChange={(e) => setInitialPayment((p) => ({ ...p, method: e.target.value }))}
                  options={PAID_VIA}
                />
                <Input
                  label="Reference"
                  value={initialPayment.reference}
                  onChange={(e) => setInitialPayment((p) => ({ ...p, reference: e.target.value }))}
                />
              </FormGrid>
            )}
          </div>
        </FormSection>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-admin-border pt-4">
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {step > 0 && (
            <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft size={16} /> Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={() => {
                const err = validateStep();
                if (err) alert(err);
                else setStep((s) => s + 1);
              }}
            >
              Next <ChevronRight size={16} />
            </Button>
          ) : (
            <Button type="submit" loading={loading}>
              {submitLabel}
            </Button>
          )}
        </div>
      </div>
    </Form>
  );
}
