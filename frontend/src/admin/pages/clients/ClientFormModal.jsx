import Modal from "../../components/ui/Modal";
import { Form, FormSection, FormGrid, FormFooter } from "../../components/ui/Form";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { CLIENT_STATUSES } from "../../utils/constants";

export const emptyClient = {
  name: "",
  email: "",
  phone: "",
  notes: "",
  status: "Active",
};

export default function ClientFormModal({ open, onClose, form, setForm, onSubmit, editing, submitting }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Client" : "Add Client"}
      description="Store client contact information."
      size="lg"
    >
      <Form onSubmit={onSubmit}>
        <FormSection title="Basic Details" description="Primary contact and account information.">
          <FormGrid cols={2}>
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={CLIENT_STATUSES}
            />
          </FormGrid>
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
