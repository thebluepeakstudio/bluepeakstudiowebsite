import { useState, useEffect } from "react";
import { Form, FormSection, FormGrid, FormFooter } from "../../components/ui/Form";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { WORK_STATUSES, PAYMENT_STATUSES } from "../../utils/constants";
import { getClients } from "../../api/clients.api";

const dateFields = [
  "dateOfOnboarding",
  "expectedCompletionDate",
  "actualCompletionDate",
];

const empty = {
  clientId: "",
  clientName: "",
  businessName: "",
  contactNumber: "",
  email: "",
  projectTitle: "",
  projectDescription: "",
  dateOfOnboarding: "",
  expectedCompletionDate: "",
  actualCompletionDate: "",
  totalAmountOverride: false,
  totalAmount: 0,
  workStatus: "Not Started",
  paymentStatus: "Pending",
  notes: "",
  googleDriveLink: "",
};

export default function ProjectEditForm({
  initial,
  onSubmit,
  loading,
  onCancel,
  submitLabel = "Save changes",
}) {
  const [form, setForm] = useState({ ...empty, ...initial });
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (initial) {
      const mapped = { ...empty, ...initial };
      dateFields.forEach((k) => {
        if (mapped[k]) mapped[k] = mapped[k].slice(0, 10);
      });
      if (mapped.clientId?._id) mapped.clientId = mapped.clientId._id;
      setForm(mapped);
    }
  }, [initial]);

  useEffect(() => {
    getClients({ limit: 100 })
      .then(({ data }) => setClients(data.data))
      .catch(() => setClients([]));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onClientChange = (clientId) => {
    const client = clients.find((c) => c._id === clientId);
    if (client) {
      setForm((f) => ({
        ...f,
        clientId,
        clientName: client.name,
        businessName: client.companyName || "",
        contactNumber: client.phone || "",
        email: client.email || "",
      }));
    } else {
      set("clientId", clientId);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    payload.totalAmount = Number(payload.totalAmount) || 0;
    if (!payload.clientId) delete payload.clientId;
    onSubmit(payload);
  };

  return (
    <Form id="project-edit-form" onSubmit={handleSubmit}>
      <FormSection title="Project information">
        <FormGrid cols={2}>
          <Select
            label="Client"
            value={form.clientId}
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
            value={form.projectTitle}
            onChange={(e) => set("projectTitle", e.target.value)}
          />
        </FormGrid>
        <Textarea
          label="Description"
          value={form.projectDescription}
          onChange={(e) => set("projectDescription", e.target.value)}
        />
      </FormSection>

      <FormSection title="Timeline & status">
        <FormGrid cols={3}>
          <Input
            label="Onboarding"
            type="date"
            value={form.dateOfOnboarding}
            onChange={(e) => set("dateOfOnboarding", e.target.value)}
          />
          <Input
            label="Expected completion"
            type="date"
            value={form.expectedCompletionDate}
            onChange={(e) => set("expectedCompletionDate", e.target.value)}
          />
          <Input
            label="Actual completion"
            type="date"
            value={form.actualCompletionDate}
            onChange={(e) => set("actualCompletionDate", e.target.value)}
          />
        </FormGrid>
        <FormGrid cols={2}>
          <Select
            label="Overall status"
            value={form.workStatus}
            onChange={(e) => set("workStatus", e.target.value)}
            options={WORK_STATUSES}
          />
          <Select
            label="Payment status"
            value={form.paymentStatus}
            onChange={(e) => set("paymentStatus", e.target.value)}
            options={PAYMENT_STATUSES}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Value override">
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.totalAmountOverride}
            onChange={(e) => set("totalAmountOverride", e.target.checked)}
          />
          Override auto-calculated total from deliverables
        </label>
        {form.totalAmountOverride && (
          <Input
            label="Total amount (₹)"
            type="number"
            min="0"
            value={form.totalAmount}
            onChange={(e) => set("totalAmount", e.target.value)}
          />
        )}
      </FormSection>

      <FormSection title="Links & notes">
        <Input
          label="Google Drive link"
          value={form.googleDriveLink}
          onChange={(e) => set("googleDriveLink", e.target.value)}
        />
        <Textarea label="Notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </FormSection>

      {onCancel && (
        <FormFooter onCancel={onCancel} submitLabel={submitLabel} loading={loading} />
      )}
    </Form>
  );
}
