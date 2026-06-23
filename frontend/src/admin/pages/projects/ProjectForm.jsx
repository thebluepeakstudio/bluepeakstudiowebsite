import { useState, useEffect } from "react";
import { Form, FormSection, FormGrid, FormFooter, FormCheckbox } from "../../components/ui/Form";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { PROJECT_TYPES, PAYMENT_STATUSES, WORK_STATUSES } from "../../utils/constants";
import { getFreelancers } from "../../api/freelancers.api";
import { getClients } from "../../api/clients.api";

const dateFields = [
  "dateOfOnboarding",
  "expectedCompletionDate",
  "actualCompletionDate",
  "advancePaymentDate",
  "fullPaymentDate",
];

const empty = {
  clientId: "",
  clientName: "",
  businessName: "",
  contactNumber: "",
  email: "",
  projectType: "Website",
  projectDescription: "",
  dateOfOnboarding: "",
  expectedCompletionDate: "",
  actualCompletionDate: "",
  totalAmount: 0,
  advanceReceived: 0,
  advancePaymentDate: "",
  fullPaymentDate: "",
  paymentStatus: "Pending",
  isOutsourced: false,
  freelancerId: "",
  freelancerAssigned: "",
  outsourcingCost: 0,
  amountPaidToFreelancer: 0,
  freelancerPaymentStatus: "Pending",
  workStatus: "Not Started",
  notes: "",
  googleDriveLink: "",
};

export default function ProjectForm({
  initial,
  onSubmit,
  loading,
  onCancel,
  submitLabel = "Save project",
}) {
  const [form, setForm] = useState({ ...empty, ...initial });
  const [freelancers, setFreelancers] = useState([]);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (initial) {
      const mapped = { ...empty, ...initial };
      dateFields.forEach((k) => {
        if (mapped[k]) mapped[k] = mapped[k].slice(0, 10);
      });
      if (mapped.freelancerId?._id) mapped.freelancerId = mapped.freelancerId._id;
      if (mapped.clientId?._id) mapped.clientId = mapped.clientId._id;
      setForm(mapped);
    }
  }, [initial]);

  useEffect(() => {
    if (!form.isOutsourced || !form.projectType) {
      setFreelancers([]);
      return;
    }
    getFreelancers({ limit: 50, skill: form.projectType, lite: 1 })
      .then(({ data }) => setFreelancers(data.data))
      .catch(() => setFreelancers([]));
  }, [form.isOutsourced, form.projectType]);

  useEffect(() => {
    getClients({ limit: 100 })
      .then(({ data }) => {
        setClients(data.data);
        if (form.clientId && data.data.length) {
          const client = data.data.find((c) => c._id === form.clientId);
          if (client) {
            setForm((f) => ({
              ...f,
              clientName: client.name,
              businessName: client.companyName || "",
              contactNumber: client.phone || "",
              email: client.email || "",
            }));
          }
        }
      })
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

  const remaining =
    form.paymentStatus === "Paid"
      ? 0
      : Math.max(0, (Number(form.totalAmount) || 0) - (Number(form.advanceReceived) || 0));

  const handlePaymentStatusChange = (status) => {
    setForm((f) => {
      const total = Number(f.totalAmount) || 0;
      if (status === "Paid") {
        return {
          ...f,
          paymentStatus: status,
          advanceReceived: total > 0 ? total : f.advanceReceived,
        };
      }
      return { ...f, paymentStatus: status };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    ["totalAmount", "advanceReceived", "outsourcingCost"].forEach(
      (k) => (payload[k] = Number(payload[k]) || 0)
    );
    delete payload.amountPaidToFreelancer;
    delete payload.freelancerPaymentStatus;
    if (payload.paymentStatus === "Paid") payload.remainingAmount = 0;
    if (!payload.freelancerId) delete payload.freelancerId;
    if (!payload.clientId) delete payload.clientId;
    delete payload.projectTitle;
    onSubmit(payload);
  };

  return (
    <Form id="project-form" onSubmit={handleSubmit}>
      <FormSection title="Client & project" description="Link to an existing client or enter details manually.">
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
            label="Project type"
            required
            value={form.projectType}
            onChange={(e) => {
              const projectType = e.target.value;
              setForm((f) => ({
                ...f,
                projectType,
                ...(f.isOutsourced ? { freelancerId: "", freelancerAssigned: "" } : {}),
              }));
            }}
            options={PROJECT_TYPES}
          />
        </FormGrid>

        {!form.clientId && (
          <FormGrid cols={2}>
            <Input
              label="Client name"
              value={form.clientName}
              onChange={(e) => set("clientName", e.target.value)}
              required
            />
            <Input
              label="Business name"
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
            />
            <Input
              label="Contact number"
              value={form.contactNumber}
              onChange={(e) => set("contactNumber", e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </FormGrid>
        )}

        <Textarea
          label="Project description"
          value={form.projectDescription}
          onChange={(e) => set("projectDescription", e.target.value)}
        />
      </FormSection>

      <FormSection title="Timeline" description="Track onboarding and delivery dates.">
        <FormGrid cols={3}>
          <Input
            label="Onboarding date"
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
      </FormSection>

      <FormSection title="Payment" description="Amounts and payment tracking.">
        <FormGrid cols={3}>
          <Input
            label="Total amount (₹)"
            type="number"
            min="0"
            value={form.totalAmount}
            onChange={(e) => set("totalAmount", e.target.value)}
          />
          <Input
            label="Advance received (₹)"
            type="number"
            min="0"
            value={form.advanceReceived}
            onChange={(e) => set("advanceReceived", e.target.value)}
          />
          <Input
            label="Remaining"
            type="number"
            value={remaining}
            disabled
          />
        </FormGrid>
        <FormGrid cols={2}>
          <Input
            label="Advance payment date"
            type="date"
            value={form.advancePaymentDate}
            onChange={(e) => set("advancePaymentDate", e.target.value)}
          />
          <Input
            label="Full payment date"
            type="date"
            value={form.fullPaymentDate}
            onChange={(e) => set("fullPaymentDate", e.target.value)}
          />
        </FormGrid>
        <FormGrid cols={2}>
          <Select
            label="Payment status"
            value={form.paymentStatus}
            onChange={(e) => handlePaymentStatusChange(e.target.value)}
            options={PAYMENT_STATUSES}
          />
          <Select
            label="Work status"
            value={form.workStatus}
            onChange={(e) => set("workStatus", e.target.value)}
            options={WORK_STATUSES}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Outsourcing" variant="muted">
        <FormCheckbox
          label="Outsourced project"
          description="Assign work to a freelancer and track outsourcing cost."
          checked={form.isOutsourced}
          onChange={(e) => set("isOutsourced", e.target.checked)}
        >
          <FormGrid cols={2}>
            <Select
              label="Freelancer"
              value={form.freelancerId}
              onChange={(e) => {
                const id = e.target.value;
                const selected = freelancers.find((f) => f._id === id);
                setForm((f) => ({
                  ...f,
                  freelancerId: id,
                  freelancerAssigned: selected?.name || "",
                }));
              }}
              options={[
                { value: "", label: "Select freelancer…" },
                ...freelancers.map((f) => ({ value: f._id, label: f.name })),
              ]}
            />
            <Input
              label="Freelancer name"
              value={form.freelancerAssigned}
              onChange={(e) => set("freelancerAssigned", e.target.value)}
            />
            <Input
              label="Outsourcing cost (₹)"
              type="number"
              min="0"
              value={form.outsourcingCost}
              onChange={(e) => set("outsourcingCost", e.target.value)}
            />
          </FormGrid>
          {freelancers.length === 0 && (
            <p className="text-xs text-amber-700">
              No freelancers with skill &quot;{form.projectType}&quot;. Add one in Freelancers with this skill selected.
            </p>
          )}
          <p className="text-xs text-admin-textMuted">
            Record freelancer payments from the Freelancers page. Amount paid and status update automatically per project.
          </p>
        </FormCheckbox>
      </FormSection>

      <FormSection title="Links & notes">
        <Input
          label="Google Drive link"
          value={form.googleDriveLink}
          onChange={(e) => set("googleDriveLink", e.target.value)}
        />
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </FormSection>

      {onCancel && (
        <FormFooter onCancel={onCancel} submitLabel={submitLabel} loading={loading} />
      )}
    </Form>
  );
}
