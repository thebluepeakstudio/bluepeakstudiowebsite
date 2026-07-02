import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Wallet } from "lucide-react";
import {
  getFreelancers,
  createFreelancer,
  updateFreelancer,
  deleteFreelancer,
  getFreelancerPayments,
  getFreelancerProjects,
  recordFreelancerPayment,
} from "../api/freelancers.api";
import { useDebounce } from "../hooks/useDebounce";
import { usePaginatedQuery } from "../hooks/usePaginatedQuery";
import { adminQueryKeys } from "../queryKeys";
import Button from "../components/ui/Button";
import SearchInput from "../components/ui/SearchInput";
import Table from "../components/ui/Table";
import Pagination from "../components/ui/Pagination";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Card from "../components/ui/Card";
import { Input, Textarea, Select } from "../components/ui/Input";
import { Form, FormSection, FormGrid, FormFooter } from "../components/ui/Form";
import SkillsMultiSelect from "../components/ui/SkillsMultiSelect";
import { AVAILABILITY, PAID_VIA, getProjectLabel } from "../utils/constants";
import Badge from "../components/ui/Badge";
import { formatCurrency, formatDate } from "../utils/formatCurrency";
import { TableSkeleton } from "../components/ui/Skeleton";
import toast from "react-hot-toast";

const empty = {
  name: "",
  skills: [],
  contactNumber: "",
  email: "",
  address: "",
  pricing: "",
  availabilityStatus: "Available",
  notes: "",
};

const emptyPayment = {
  assignmentId: "",
  projectId: "",
  payMode: "full",
  amount: "",
  paymentDate: new Date().toISOString().slice(0, 10),
  paidVia: "UPI",
  notes: "",
};

export default function Freelancers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [form, setForm] = useState(empty);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [payFinancials, setPayFinancials] = useState(null);
  const [outsourcedProjects, setOutsourcedProjects] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebounce(search);

  const listParams = { search: debouncedSearch };

  const { list, pagination, page, setPage, loading } = usePaginatedQuery(
    adminQueryKeys.freelancers(listParams),
    async (p) => {
      const { data } = await getFreelancers({ page: p, limit: 10, search: debouncedSearch });
      return { list: data.data, pagination: data.pagination };
    },
    [debouncedSearch]
  );

  const refreshList = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "freelancers"] });
  };

  const toPayload = () => ({
    name: form.name,
    skills: Array.isArray(form.skills) ? form.skills : [],
    contactNumber: form.contactNumber,
    email: form.email,
    address: form.address,
    pricing: form.pricing,
    availabilityStatus: form.availabilityStatus,
    notes: form.notes,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.skills?.length) {
      toast.error("Select at least one skill");
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await updateFreelancer(editing._id, toPayload());
        toast.success("Freelancer updated");
      } else {
        await createFreelancer(toPayload());
        toast.success("Freelancer added");
      }
      setModalOpen(false);
      setEditing(null);
      refreshList();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const loadPayModalData = async (freelancerId) => {
    const [payRes, projRes] = await Promise.all([
      getFreelancerPayments(freelancerId),
      getFreelancerProjects(freelancerId),
    ]);
    setPaymentHistory(payRes.data.data.payments);
    setPayFinancials(payRes.data.data.financials);
    setOutsourcedProjects(projRes.data.data);
    return payRes.data.data.financials;
  };

  const openPayModal = async (freelancer) => {
    setPaying(freelancer);
    setPaymentForm({ ...emptyPayment });
    setPayModalOpen(true);
    try {
      await loadPayModalData(freelancer._id);
    } catch {
      toast.error("Failed to load payment details");
    }
  };

  const assignmentsWithDue = outsourcedProjects.filter((p) => p.due > 0);
  const selectedPayAssignment = outsourcedProjects.find(
    (p) => (p.assignmentId || p._id) === paymentForm.assignmentId
  );
  const selectedDue = selectedPayAssignment?.due ?? 0;

  const selectPayAssignment = (assignmentId) => {
    const row = outsourcedProjects.find((p) => (p.assignmentId || p._id) === assignmentId);
    if (!row) return;
    setPaymentForm((f) => ({
      ...f,
      assignmentId,
      projectId: row.projectId || row.project?._id || "",
      payMode: "full",
      amount: row.due > 0 ? String(row.due) : "",
    }));
  };

  const setPayMode = (payMode) => {
    setPaymentForm((f) => {
      const row = outsourcedProjects.find((p) => (p.assignmentId || p._id) === f.assignmentId);
      return {
        ...f,
        payMode,
        amount: payMode === "full" && row?.due > 0 ? String(row.due) : f.amount,
      };
    });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!paying) return;
    if (!paymentForm.assignmentId && !paymentForm.projectId) {
      toast.error("Select an assignment to pay against");
      return;
    }
    setSubmitting(true);
    try {
      const payFull = paymentForm.payMode === "full";
      await recordFreelancerPayment(paying._id, {
        assignmentId: paymentForm.assignmentId || undefined,
        projectId: paymentForm.projectId || undefined,
        payFull,
        amount: payFull ? undefined : Number(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
        paidVia: paymentForm.paidVia,
        notes: paymentForm.notes,
      });
      toast.success(payFull ? "Full payment recorded" : "Partial payment recorded");
      const financials = await loadPayModalData(paying._id);
      setPaymentForm({ ...emptyPayment });
      refreshList();
      if (financials.amountDue <= 0) {
        setPayModalOpen(false);
        setPaying(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-admin-textMuted">
        Total owed is calculated from outsourced project costs. Record payments here to update the balance due.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="Search freelancers..." />
        </div>
        <Button
          className="w-full shrink-0 sm:w-auto"
          onClick={() => {
            setEditing(null);
            setForm(empty);
            setModalOpen(true);
          }}
        >
          <Plus size={18} /> Add Freelancer
        </Button>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : (
        <>
          <Table
            columns={[
              { key: "name", label: "Name" },
              { key: "contactNumber", label: "Contact" },
              { key: "skills", label: "Skills", render: (r) => (r.skills || []).slice(0, 2).join(", ") },
              { key: "totalProjectsAssigned", label: "Projects" },
              { key: "totalOwed", label: "Total Owed", render: (r) => formatCurrency(r.totalOwed) },
              { key: "totalPaid", label: "Paid", render: (r) => formatCurrency(r.totalPaid) },
              {
                key: "amountDue",
                label: "Due",
                render: (r) => (
                  <span className={r.amountDue > 0 ? "font-semibold text-amber-700" : "text-emerald-700"}>
                    {formatCurrency(r.amountDue)}
                  </span>
                ),
              },
              {
                key: "actions",
                label: "",
                render: (r) => (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPayModal(r);
                      }}
                      className="text-xs font-medium text-admin-primary hover:underline"
                    >
                      Pay
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(r);
                        setForm({
                          ...empty,
                          ...r,
                          skills: r.skills || [],
                        });
                        setModalOpen(true);
                      }}
                      className="text-xs text-admin-textMuted hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(r._id);
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
            data={list}
          />
          <Pagination page={page} pages={pagination.pages} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit Freelancer" : "Add Freelancer"}
        description="Add team members you outsource work to and track their skills."
        size="lg"
      >
        <Form onSubmit={handleSubmit}>
          <FormSection title="Profile">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <SkillsMultiSelect
              value={form.skills}
              onChange={(skills) => setForm({ ...form, skills })}
              required
            />
            <Select
              label="Availability"
              value={form.availabilityStatus}
              onChange={(e) => setForm({ ...form, availabilityStatus: e.target.value })}
              options={AVAILABILITY}
            />
          </FormSection>

          <FormSection title="Contact & pricing">
            <FormGrid cols={2}>
              <Input
                label="Contact number"
                value={form.contactNumber}
                onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <Input
                label="Pricing / rate"
                value={form.pricing}
                onChange={(e) => setForm({ ...form, pricing: e.target.value })}
              />
            </FormGrid>
          </FormSection>

          <FormSection title="Notes">
            <Textarea
              label="Internal notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </FormSection>

          <FormFooter
            onCancel={() => {
              setModalOpen(false);
              setEditing(null);
            }}
            submitLabel={editing ? "Save changes" : "Add freelancer"}
            loading={submitting}
          />
        </Form>
      </Modal>

      <Modal
        open={payModalOpen}
        onClose={() => {
          setPayModalOpen(false);
          setPaying(null);
        }}
        title={paying ? `Pay — ${paying.name}` : "Make Payment"}
        description="Select a project with pending dues, then pay in full or partially."
        size="xl"
      >
        {payFinancials && (
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <Card className="!p-4">
              <p className="text-xs text-admin-textMuted">Total Owed</p>
              <p className="text-lg font-bold">{formatCurrency(payFinancials.totalOwed)}</p>
            </Card>
            <Card className="!p-4">
              <p className="text-xs text-admin-textMuted">Total Paid</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(payFinancials.totalPaid)}</p>
            </Card>
            <Card className="!p-4">
              <p className="text-xs text-admin-textMuted">Amount Due</p>
              <p className="text-lg font-bold text-amber-700">{formatCurrency(payFinancials.amountDue)}</p>
            </Card>
          </div>
        )}

        {assignmentsWithDue.length > 0 ? (
          <div className="mb-6">
            <h3 className="mb-1 text-base font-bold text-admin-text">Pending assignments</h3>
            <p className="mb-3 text-sm text-admin-textMuted">
              Each deliverable assignment with an outstanding balance is listed below.
            </p>
            <div className="overflow-x-auto rounded-xl border border-admin-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-admin-muted">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Project</th>
                    <th className="px-3 py-2.5 font-medium">Deliverable</th>
                    <th className="px-3 py-2.5 font-medium">Role</th>
                    <th className="px-3 py-2.5 font-medium">Cost</th>
                    <th className="px-3 py-2.5 font-medium">Paid</th>
                    <th className="px-3 py-2.5 font-medium">Due</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignmentsWithDue.map((p) => (
                    <tr key={p.assignmentId || p._id} className="border-t border-admin-border">
                      <td className="px-3 py-2.5">
                        <p className="font-medium">{getProjectLabel(p.project || p)}</p>
                      </td>
                      <td className="px-3 py-2.5">{p.deliverable?.title || p.projectType || "—"}</td>
                      <td className="px-3 py-2.5">{p.role || "—"}</td>
                      <td className="px-3 py-2.5">{formatCurrency(p.cost ?? p.outsourcingCost)}</td>
                      <td className="px-3 py-2.5">{formatCurrency(p.amountPaid ?? p.amountPaidToFreelancer)}</td>
                      <td className="px-3 py-2.5 font-semibold text-amber-700">
                        {formatCurrency(p.due ?? p.projectDue)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge status={p.paymentStatus ?? p.freelancerPaymentStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="mb-6 rounded-lg border border-admin-border bg-admin-muted/40 px-4 py-3 text-sm text-admin-textMuted">
            No pending assignments for this freelancer.
          </p>
        )}

        <form onSubmit={handlePayment} className="space-y-4 rounded-xl border border-admin-border bg-admin-muted/30 p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-admin-text">
            <Wallet size={18} /> Record payment
          </h3>

          {assignmentsWithDue.length === 0 ? null : (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-admin-text">Select assignment to pay *</p>
                <div className="space-y-2">
                  {assignmentsWithDue.map((p) => {
                    const id = p.assignmentId || p._id;
                    const selected = paymentForm.assignmentId === id;
                    return (
                      <label
                        key={id}
                        className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                          selected
                            ? "border-admin-primary bg-blue-50"
                            : "border-admin-border bg-admin-surface hover:border-blue-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="payAssignment"
                            checked={selected}
                            onChange={() => selectPayAssignment(id)}
                            className="mt-1"
                          />
                          <div>
                            <p className="font-medium text-admin-text">{getProjectLabel(p.project || p)}</p>
                            <p className="text-xs text-admin-textMuted">
                              {p.deliverable?.title || p.projectType} · {p.role || "General"} · Paid{" "}
                              {formatCurrency(p.amountPaid ?? p.amountPaidToFreelancer)} of{" "}
                              {formatCurrency(p.cost ?? p.outsourcingCost)}
                            </p>
                          </div>
                        </div>
                        <div className="pl-7 text-sm sm:pl-0 sm:text-right">
                          <p>
                            Due:{" "}
                            <span className="font-semibold text-amber-700">
                              {formatCurrency(p.due ?? p.projectDue)}
                            </span>
                          </p>
                          <Badge status={p.paymentStatus ?? p.freelancerPaymentStatus} />
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {paymentForm.assignmentId && (
                <>
                  <div>
                    <p className="mb-2 text-sm font-medium text-admin-text">Payment type</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setPayMode("full")}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          paymentForm.payMode === "full"
                            ? "border-admin-primary bg-blue-50 text-admin-primary"
                            : "border-admin-border bg-admin-surface"
                        }`}
                      >
                        Pay full ({formatCurrency(selectedDue)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayMode("partial")}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          paymentForm.payMode === "partial"
                            ? "border-admin-primary bg-blue-50 text-admin-primary"
                            : "border-admin-border bg-admin-surface"
                        }`}
                      >
                        Pay partial amount
                      </button>
                    </div>
                    {paymentForm.payMode === "partial" && (
                      <p className="mt-2 text-xs text-admin-textMuted">
                        Remaining due for this project will update after a partial payment.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {paymentForm.payMode === "partial" && (
                      <Input
                        label={`Amount (max ${formatCurrency(selectedDue)})`}
                        type="number"
                        min="1"
                        max={selectedDue}
                        step="1"
                        value={paymentForm.amount}
                        onChange={(e) =>
                          setPaymentForm({ ...paymentForm, amount: e.target.value })
                        }
                        required
                      />
                    )}
                    <Input
                      label="Payment Date"
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, paymentDate: e.target.value })
                      }
                      required
                      className={paymentForm.payMode === "full" ? "sm:col-span-2" : ""}
                    />
                  </div>

                  <Select
                    label="Paid Via"
                    value={paymentForm.paidVia}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, paidVia: e.target.value })
                    }
                    options={PAID_VIA}
                  />
                  <Textarea
                    label="Notes"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  />
                </>
              )}

              <Button
                type="submit"
                loading={submitting}
                disabled={!paymentForm.assignmentId || assignmentsWithDue.length === 0}
                className="w-full"
              >
                {paymentForm.payMode === "full" && selectedPayAssignment
                  ? `Pay full ${formatCurrency(selectedDue)}`
                  : "Record payment"}
              </Button>
            </>
          )}
        </form>

        {paymentHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-admin-text">Payment history</h3>
            <ul className="divide-y divide-admin-border rounded-lg border border-admin-border">
              {paymentHistory.map((p) => (
                <li key={p._id} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-admin-textMuted">
                      {p.projectId
                        ? getProjectLabel(p.projectId)
                        : "Project"}
                      {p.deliverableId?.title ? ` · ${p.deliverableId.title}` : ""}
                      {" · "}
                      {formatDate(p.paymentDate)} · {p.paidVia}
                      {p.notes ? ` · ${p.notes}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-admin-textMuted">{p.recordedBy}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          await deleteFreelancer(deleteId);
          toast.success("Deleted");
          setDeleteId(null);
          refreshList();
        }}
        message="Delete this freelancer and all payment records?"
        danger
      />
    </div>
  );
}
