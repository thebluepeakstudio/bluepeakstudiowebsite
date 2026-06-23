import Modal from "../../components/ui/Modal";
import { Form, FormSection, FormGrid, FormFooter } from "../../components/ui/Form";
import CheckboxMultiSelect from "../../components/ui/CheckboxMultiSelect";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { LEAD_STAGES, LEAD_SOURCES, LEAD_REQUIREMENTS } from "../../utils/constants";

export const emptyLead = {
  fullName: "",
  companyName: "",
  email: "",
  phone: "",
  leadSource: "Other",
  status: "New",
  estimatedProjectValue: 0,
  requirements: [],
  notes: "",
  nextFollowUpDate: "",
  reminderNotes: "",
};

export default function LeadFormModal({ open, onClose, form, setForm, onSubmit, editing, submitting }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Lead" : "Add Lead"}
      description="Capture contact details and what the lead is looking for."
      size="lg"
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            ...form,
            estimatedProjectValue: Number(form.estimatedProjectValue) || 0,
            requirements: form.requirements || [],
            nextFollowUpDate: form.nextFollowUpDate || undefined,
          });
        }}
      >
        <FormSection title="Contact details" description="Who is this lead and how can you reach them?">
          <FormGrid cols={2}>
            <Input
              label="Full name"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
            <Input
              label="Company"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </FormGrid>
        </FormSection>

        <FormSection title="Lead details" description="Track where they came from and their current stage.">
          <FormGrid cols={3}>
            <Select
              label="Source"
              value={form.leadSource}
              onChange={(e) => setForm({ ...form, leadSource: e.target.value })}
              options={LEAD_SOURCES}
            />
            <Select
              label="Stage"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={LEAD_STAGES}
            />
            <Input
              label="Estimated value (₹)"
              type="number"
              min="0"
              value={form.estimatedProjectValue}
              onChange={(e) => setForm({ ...form, estimatedProjectValue: e.target.value })}
            />
          </FormGrid>
        </FormSection>

        <FormSection title="Requirements" description="Select all services they are interested in.">
          <CheckboxMultiSelect
            options={LEAD_REQUIREMENTS}
            value={form.requirements}
            onChange={(requirements) => setForm({ ...form, requirements })}
          />
        </FormSection>

        <FormSection title="Follow-up & notes">
          <FormGrid cols={2}>
            <Input
              label="Next follow-up"
              type="date"
              value={form.nextFollowUpDate}
              onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })}
            />
          </FormGrid>
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </FormSection>

        <FormFooter
          onCancel={onClose}
          submitLabel={editing ? "Save changes" : "Add lead"}
          loading={submitting}
        />
      </Form>
    </Modal>
  );
}
