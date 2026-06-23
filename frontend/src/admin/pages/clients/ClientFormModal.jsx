import Modal from "../../components/ui/Modal";
import { Form, FormSection, FormGrid, FormFooter } from "../../components/ui/Form";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { CLIENT_STATUSES } from "../../utils/constants";

export const emptyClient = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  notes: "",
  status: "Active",
};

export default function ClientFormModal({ open, onClose, form, setForm, onSubmit, editing, submitting }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Client" : "Add Client"}
      description="Store client contact and business information."
      size="lg"
    >
      <Form onSubmit={onSubmit}>
        <FormSection title="Contact details" description="Primary person and how to reach them.">
          <FormGrid cols={2}>
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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

        <FormSection title="Business details">
          <FormGrid cols={2}>
            <Input
              label="Website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={CLIENT_STATUSES}
            />
          </FormGrid>
          <Textarea
            label="Address"
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </FormSection>

        <FormSection title="Notes">
          <Textarea
            label="Internal notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </FormSection>

        <FormFooter
          onCancel={onClose}
          submitLabel={editing ? "Save changes" : "Add client"}
          loading={submitting}
        />
      </Form>
    </Modal>
  );
}
