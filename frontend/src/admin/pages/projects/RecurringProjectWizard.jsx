import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Form, FormSection, FormGrid } from "../../components/ui/Form";
import { Input, Textarea, Select } from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { SERVICE_CATEGORIES } from "../../utils/constants";
import { getClients, getClientBrands } from "../../api/clients.api";
import { formatCurrency } from "../../utils/formatCurrency";
import toast from "react-hot-toast";

const emptyTemplate = () => ({
  title: "",
  description: "",
});

const emptyProject = {
  clientId: "",
  brandId: "",
  clientName: "",
  businessName: "",
  contactNumber: "",
  email: "",
  category: "",
  projectDescription: "",
  dateOfOnboarding: "",
  billingModel: "recurring",
};

const emptyConfig = {
  startDate: new Date().toISOString().slice(0, 10),
  billingDay: 2,
  monthlyClientAmount: "",
  monthlyFreelancerCost: "",
  generationLeadDays: 5,
  status: "active",
};

const STEPS = ["Project Info", "Billing Config", "Template Deliverables"];

export default function RecurringProjectWizard({
  initial,
  onSubmit,
  loading,
  onCancel,
  submitLabel = "Create recurring project",
}) {
  const [step, setStep] = useState(0);
  const [project, setProject] = useState({ ...emptyProject });
  const [config, setConfig] = useState({ ...emptyConfig });
  const [templates, setTemplates] = useState([emptyTemplate()]);
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

  const setProjectField = (key, value) => setProject((p) => ({ ...p, [key]: value }));
  const setConfigField = (key, value) => setConfig((c) => ({ ...c, [key]: value }));

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

  const setTemplate = (index, key, value) => {
    setTemplates((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const addTemplate = () => setTemplates((rows) => [...rows, emptyTemplate()]);
  const removeTemplate = (index) => {
    if (templates.length <= 1) return;
    setTemplates((rows) => rows.filter((_, i) => i !== index));
  };

  const validateStep = () => {
    if (step === 0) {
      if (!project.clientId) {
        toast.error("Select a client");
        return false;
      }
      if (!project.brandId) {
        toast.error("Select a brand");
        return false;
      }
      if (!project.category) {
        toast.error("Select a service");
        return false;
      }
    }
    if (step === 1) {
      if (!config.startDate) {
        toast.error("Start date is required");
        return false;
      }
      if (!config.monthlyClientAmount || Number(config.monthlyClientAmount) < 0) {
        toast.error("Monthly client amount is required");
        return false;
      }
    }
    if (step === 2) {
      if (!templates.every((t) => t.title?.trim())) {
        toast.error("Each template deliverable needs a title");
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    onSubmit({
      project: {
        ...project,
        brandId: project.brandId || undefined,
        name: project.category,
        category: project.category,
        projectTitle: project.category,
        projectType: project.category,
        billingModel: "recurring",
        dateOfOnboarding: project.dateOfOnboarding || config.startDate,
      },
      config: {
        ...config,
        monthlyClientAmount: Number(config.monthlyClientAmount) || 0,
        monthlyFreelancerCost: Number(config.monthlyFreelancerCost) || 0,
        billingDay: Number(config.billingDay) || 2,
        generationLeadDays: Number(config.generationLeadDays) || 5,
      },
      templateDeliverables: templates.map((t, index) => ({
        title: t.title.trim(),
        description: t.description || "",
        sortOrder: index,
      })),
    });
  };

  return (
    <Form onSubmit={step === STEPS.length - 1 ? handleSubmit : (e) => e.preventDefault()}>
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                i === step ? "bg-admin-primary text-white" : "bg-admin-muted text-admin-textMuted"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="text-admin-textMuted">→</span>}
          </div>
        ))}
      </div>

      {step === 0 && (
        <FormSection title="Service details">
          <FormGrid>
            <Select
              label="Client"
              value={project.clientId}
              onChange={(e) => onClientChange(e.target.value)}
              required
              options={[
                { value: "", label: "Select client…" },
                ...clients.map((c) => ({
                  value: c._id,
                  label: c.companyName ? `${c.name} — ${c.companyName}` : c.name,
                })),
              ]}
            />
            <Select
              label="Brand"
              value={project.brandId}
              onChange={(e) => setProjectField("brandId", e.target.value)}
              required
              options={[
                { value: "", label: "Select brand…" },
                ...brands.map((b) => ({ value: b._id, label: b.name })),
              ]}
            />
            <Select
              label="Service"
              value={project.category}
              onChange={(e) => setProjectField("category", e.target.value)}
              required
              options={[
                { value: "", label: "Select service…" },
                ...SERVICE_CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
            />
            <Input
              label="Onboarding date"
              type="date"
              value={project.dateOfOnboarding}
              onChange={(e) => setProjectField("dateOfOnboarding", e.target.value)}
            />
          </FormGrid>
          <Textarea
            label="Description"
            value={project.projectDescription}
            onChange={(e) => setProjectField("projectDescription", e.target.value)}
          />
        </FormSection>
      )}

      {step === 1 && (
        <FormSection title="Recurring billing">
          <FormGrid>
            <Input
              label="Start date"
              type="date"
              value={config.startDate}
              onChange={(e) => setConfigField("startDate", e.target.value)}
              required
            />
            <Input
              label="Billing day (1–28)"
              type="number"
              min={1}
              max={28}
              value={config.billingDay}
              onChange={(e) => setConfigField("billingDay", e.target.value)}
              required
            />
            <Input
              label="Monthly client amount (₹)"
              type="number"
              min={0}
              value={config.monthlyClientAmount}
              onChange={(e) => setConfigField("monthlyClientAmount", e.target.value)}
              required
            />
            <Input
              label="Monthly freelancer cost (₹)"
              type="number"
              min={0}
              value={config.monthlyFreelancerCost}
              onChange={(e) => setConfigField("monthlyFreelancerCost", e.target.value)}
            />
            <Input
              label="Generate cycles (days before billing)"
              type="number"
              min={3}
              max={7}
              value={config.generationLeadDays}
              onChange={(e) => setConfigField("generationLeadDays", e.target.value)}
            />
          </FormGrid>
          <p className="text-sm text-admin-textMuted">
            Monthly retainer: {formatCurrency(Number(config.monthlyClientAmount) || 0)} · Cycles
            generate {config.generationLeadDays || 5} days before each billing date.
          </p>
        </FormSection>
      )}

      {step === 2 && (
        <FormSection title="Default monthly deliverables">
          <p className="mb-4 text-sm text-admin-textMuted">
            These checklist items are copied into each billing cycle. Edits here affect future months
            only.
          </p>
          {templates.map((tpl, index) => (
            <div key={index} className="mb-4 rounded-xl border border-admin-border p-4">
              <FormGrid>
                <Input
                  label="Title"
                  value={tpl.title}
                  onChange={(e) => setTemplate(index, "title", e.target.value)}
                  required
                />
              </FormGrid>
              <Textarea
                label="Description"
                value={tpl.description}
                onChange={(e) => setTemplate(index, "description", e.target.value)}
              />
              {templates.length > 1 && (
                <Button type="button" variant="ghost" onClick={() => removeTemplate(index)}>
                  <Trash2 size={16} /> Remove
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={addTemplate}>
            <Plus size={16} /> Add template item
          </Button>
        </FormSection>
      )}

      <div className="mt-6 flex justify-between">
        <div className="flex gap-2">
          {step > 0 && (
            <Button type="button" variant="secondary" onClick={back}>
              <ChevronLeft size={16} /> Back
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next}>
            Next <ChevronRight size={16} />
          </Button>
        ) : (
          <Button type="submit" loading={loading}>
            {submitLabel}
          </Button>
        )}
      </div>
    </Form>
  );
}
