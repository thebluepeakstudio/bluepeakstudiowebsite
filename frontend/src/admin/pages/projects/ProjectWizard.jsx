import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Form, FormSection, FormGrid } from "../../components/ui/Form";
import { Input, Textarea, Select } from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import {
  SERVICE_CATEGORIES,
  DELIVERABLE_STATUSES,
  PAID_VIA,
  DELIVERABLE_AMOUNT_LABEL,
} from "../../utils/constants";
import { getClients, getClientBrands } from "../../api/clients.api";
import { formatCurrency } from "../../utils/formatCurrency";
import toast from "react-hot-toast";

const emptyDeliverable = () => ({
  title: "",
  category: "Website",
  description: "",
  sellingPrice: 0,
  status: "Not Started",
});

const emptyProject = {
  clientId: "",
  brandId: "",
  clientName: "",
  businessName: "",
  contactNumber: "",
  email: "",
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
  const [initialPayment, setInitialPayment] = useState({
    enabled: false,
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    method: "UPI",
    reference: "",
    notes: "",
  });
  const [clients, setClients] = useState([]);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    getClients({ limit: 100 })
      .then(({ data }) => setClients(data.data))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (!project.clientId) {
      setBrands([]);
      return;
    }
    getClientBrands(project.clientId)
      .then(({ data }) => {
        const list = data.data || [];
        setBrands(list);
        if (!project.brandId && list.length === 1) {
          setProject((p) => ({ ...p, brandId: list[0]._id }));
        }
      })
      .catch(() => setBrands([]));
  }, [project.clientId]);

  useEffect(() => {
    if (initial?.clientId) {
      const clientId = initial.clientId._id || initial.clientId;
      const brandId = initial.brandId?._id || initial.brandId || "";
      setProject((p) => ({ ...p, clientId, brandId: brandId || p.brandId }));
    }
  }, [initial]);

  const calculatedTotal = deliverables.reduce(
    (sum, d) => sum + (Number(d.sellingPrice) || 0),
    0
  );

  const setProjectField = (key, value) => setProject((p) => ({ ...p, [key]: value }));

  const onClientChange = (clientId) => {
    const client = clients.find((c) => c._id === clientId);
    if (client) {
      setProject((p) => ({
        ...p,
        clientId,
        brandId: "",
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

  const validateStep = (stepIndex = step) => {
    if (stepIndex === 0) {
      if (!project.clientId) return "Select a client";
      if (!project.brandId) return "Select a brand";
      if (!brands.length) return "This client has no brands — add one in the client profile first";
    }
    if (stepIndex === 1) {
      if (!deliverables.length) return "Add at least one deliverable";
      for (const d of deliverables) {
        if (!d.title?.trim()) return "Each deliverable needs a title";
        if (!d.category) return "Each deliverable needs a category";
      }
    }
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (step < STEPS.length - 1) {
      const err = validateStep();
      if (err) {
        toast.error(err);
        return;
      }
      setStep((s) => s + 1);
      return;
    }

    const err = validateStep(0) || validateStep(1);
    if (err) {
      toast.error(err);
      return;
    }

    const payments = [];
    if (initialPayment.enabled && Number(initialPayment.amount) > 0) {
      payments.push({
        amount: Number(initialPayment.amount),
        paymentDate: initialPayment.paymentDate,
        method: initialPayment.method,
        reference: initialPayment.reference,
        notes: initialPayment.notes,
      });
    }

    const selectedBrand = brands.find((b) => b._id === project.brandId);
    const brandName = selectedBrand?.name?.trim() || "";

    onSubmit({
      project: {
        ...project,
        clientId: project.clientId || undefined,
        brandId: project.brandId || undefined,
        projectTitle: brandName,
        name: brandName,
        businessName: brandName,
        totalPrice: calculatedTotal,
      },
      deliverables: deliverables.map((d) => ({
        title: d.title,
        category: d.category,
        description: d.description,
        sellingPrice: Number(d.sellingPrice) || 0,
        status: d.status,
      })),
      payments,
    });
  };

  return (
    <Form id="project-wizard" onSubmit={handleSubmit} noValidate>
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
        <FormSection title="Project information" description="Link to a client and select the brand for this engagement.">
          <FormGrid cols={2}>
            <Select
              label="Client"
              required
              value={project.clientId}
              onChange={(e) => onClientChange(e.target.value)}
              options={[
                { value: "", label: "Select client…" },
                ...clients.map((c) => ({
                  value: c._id,
                  label: c.name,
                })),
              ]}
            />
            <Select
              label="Brand"
              required
              value={project.brandId}
              onChange={(e) => setProjectField("brandId", e.target.value)}
              options={[
                { value: "", label: brands.length ? "Select brand…" : "No brands for this client" },
                ...brands.map((b) => ({ value: b._id, label: b.name })),
              ]}
            />
          </FormGrid>
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
                    label={DELIVERABLE_AMOUNT_LABEL}
                    type="number"
                    min="0"
                    value={row.sellingPrice}
                    onChange={(e) => setDeliverable(index, "sellingPrice", e.target.value)}
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
              Project value: <span className="font-semibold text-admin-text">{formatCurrency(calculatedTotal)}</span>
            </p>
          </div>
        </FormSection>
      )}

      {step === 2 && (
        <FormSection title="Payment" description="Project value is calculated from deliverables. Optionally record an initial payment.">
          <div className="rounded-xl border border-admin-border bg-admin-surface p-4">
            <p className="text-sm text-admin-textMuted">Project value</p>
            <p className="text-2xl font-bold text-admin-text">{formatCurrency(calculatedTotal)}</p>
          </div>

          <div className="mt-6 rounded-xl border border-admin-border p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={initialPayment.enabled}
                onChange={(e) => setInitialPayment((p) => ({ ...p, enabled: e.target.checked }))}
              />
              Record initial payment (optional)
            </label>
            {initialPayment.enabled && (
              <FormGrid cols={2} className="mt-3">
                <Input
                  label="Amount (₹)"
                  type="number"
                  min="0"
                  max={calculatedTotal}
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
                  placeholder="Optional"
                />
                <Input
                  label="Notes"
                  value={initialPayment.notes}
                  onChange={(e) => setInitialPayment((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional"
                  className="sm:col-span-2"
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
            <Button type="submit">
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
