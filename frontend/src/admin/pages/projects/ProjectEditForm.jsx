import { useState, useEffect } from "react";
import { Form, FormSection, FormGrid, FormFooter } from "../../components/ui/Form";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { WORK_STATUSES } from "../../utils/constants";
import { getClients, getClientBrands } from "../../api/clients.api";

const dateFields = [
  "dateOfOnboarding",
  "expectedCompletionDate",
  "actualCompletionDate",
];

const empty = {
  clientId: "",
  brandId: "",
  clientName: "",
  businessName: "",
  contactNumber: "",
  email: "",
  projectDescription: "",
  dateOfOnboarding: "",
  expectedCompletionDate: "",
  actualCompletionDate: "",
  workStatus: "Not Started",
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
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    if (initial) {
      const mapped = { ...empty, ...initial };
      dateFields.forEach((k) => {
        if (mapped[k]) mapped[k] = mapped[k].slice(0, 10);
      });
      if (mapped.clientId?._id) mapped.clientId = mapped.clientId._id;
      if (mapped.brandId?._id) mapped.brandId = mapped.brandId._id;
      setForm(mapped);
    }
  }, [initial]);

  useEffect(() => {
    getClients({ limit: 100 })
      .then(({ data }) => setClients(data.data))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (!form.clientId) {
      setBrands([]);
      return;
    }
    getClientBrands(form.clientId)
      .then(({ data }) => setBrands(data.data || []))
      .catch(() => setBrands([]));
  }, [form.clientId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onClientChange = (clientId) => {
    const client = clients.find((c) => c._id === clientId);
    if (client) {
      setForm((f) => ({
        ...f,
        clientId,
        brandId: "",
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
    const selectedBrand = brands.find((b) => b._id === form.brandId);
    const brandName = selectedBrand?.name?.trim() || "";
    const payload = {
      ...form,
      brandId: form.brandId || undefined,
      projectTitle: brandName,
      name: brandName,
      businessName: brandName || form.businessName,
    };
    if (!payload.clientId) delete payload.clientId;
    delete payload.totalAmount;
    delete payload.totalAmountOverride;
    delete payload.totalPrice;
    delete payload.advanceReceived;
    delete payload.remainingAmount;
    delete payload.paymentStatus;
    delete payload.totalReceived;
    delete payload.projectProfit;
    delete payload.serviceProfit;
    delete payload.deliverables;
    delete payload.payments;
    delete payload.expenses;
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
          <Select
            label="Brand"
            required
            value={form.brandId}
            onChange={(e) => set("brandId", e.target.value)}
            options={[
              { value: "", label: brands.length ? "Select brand…" : "No brands for this client" },
              ...brands.map((b) => ({ value: b._id, label: b.name })),
            ]}
          />
        </FormGrid>
        <Textarea
          label="Description"
          value={form.projectDescription || form.description || ""}
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
        </FormGrid>
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
