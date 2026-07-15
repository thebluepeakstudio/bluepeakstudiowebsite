import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Input, Select, Textarea } from "../ui/Input";
import { Form, FormGrid } from "../ui/Form";
import { PAID_VIA } from "../../utils/constants";
import { getServices } from "../../api/services.api";
import { createClientPayment, previewClientPayment } from "../../api/clientPayments.api";
import { formatCurrency } from "../../utils/formatCurrency";
import toast from "react-hot-toast";

const emptySplit = () => ({ serviceId: "", amount: "" });

function AllocationPreview({ preview, totalAmount }) {
  if (!preview) return null;

  const plans = preview.plans || (preview.plan ? [preview.plan] : preview.billingModel ? [preview] : []);

  if (!plans.length) return null;

  return (
    <div className="space-y-4 text-sm">
      {plans.map((plan) => (
        <div key={plan.serviceId} className="rounded-lg border border-admin-border bg-admin-surface p-3">
          <p className="mb-2 font-medium text-admin-text">{plan.serviceName}</p>

          {plan.billingModel === "one_time" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs text-admin-textMuted">Outstanding</p>
                <p className="font-semibold">{formatCurrency(plan.outstanding)}</p>
              </div>
              <div>
                <p className="text-xs text-admin-textMuted">Applied</p>
                <p className="font-semibold text-emerald-700">
                  {formatCurrency(plan.splitAmount ?? plan.oneTimeApplied)}
                </p>
              </div>
              {plan.remainingOutstanding > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-admin-textMuted">Remaining outstanding</p>
                  <p className="font-semibold text-amber-700">
                    {formatCurrency(plan.remainingOutstanding)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {plan.openInvoices?.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-xs text-admin-textMuted">Outstanding invoices</p>
                  <ul className="divide-y divide-admin-border rounded border border-admin-border">
                    {plan.openInvoices.map((inv) => (
                      <li key={inv.invoiceId} className="flex justify-between px-2 py-1.5 text-xs">
                        <span>
                          {inv.periodLabel}
                          {!inv.isDue && (
                            <span className="ml-1 text-admin-textMuted">(upcoming)</span>
                          )}
                        </span>
                        <span>{formatCurrency(inv.openAmount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <ul className="divide-y divide-admin-border rounded border border-admin-border">
                {plan.invoiceAllocations?.map((row) => (
                  <li key={row.invoiceId} className="flex justify-between px-2 py-1.5">
                    <span>{row.periodLabel}</span>
                    <span className="font-medium text-emerald-700">{formatCurrency(row.amount)}</span>
                  </li>
                ))}
                <li className="flex justify-between px-2 py-1.5">
                  <span>Prepaid Credit</span>
                  <span>{formatCurrency(plan.walletCredit || 0)}</span>
                </li>
              </ul>
              {plan.invoiceAllocations?.some((row) => row.remainingAfter > 0) && (
                <div className="mt-2 text-xs text-amber-800">
                  {plan.invoiceAllocations
                    .filter((row) => row.remainingAfter > 0)
                    .map((row) => (
                      <p key={row.invoiceId}>
                        Remaining due on {row.periodLabel}: {formatCurrency(row.remainingAfter)}
                      </p>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {plans.length > 1 && (
        <p className="text-xs text-admin-textMuted">
          Total payment: {formatCurrency(Number(totalAmount))}
        </p>
      )}
    </div>
  );
}

export default function PaymentAllocationModal({
  open,
  onClose,
  clientId,
  clientName,
  onSuccess,
  fixedServiceId = "",
  fixedServiceName = "",
  fixedBillingModel = "",
}) {
  const isServicePage = Boolean(fixedServiceId);
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("UPI");
  const [notes, setNotes] = useState("");
  const [services, setServices] = useState([]);
  const [splits, setSplits] = useState([emptySplit()]);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !clientId || isServicePage) return;
    getServices({ clientId, limit: 50 })
      .then(({ data }) => setServices(data.data || []))
      .catch(() => setServices([]));
  }, [open, clientId, isServicePage]);

  useEffect(() => {
    if (!open) return;
    setTotalAmount("");
    setSplits([emptySplit()]);
    setPreview(null);
    setNotes("");
  }, [open]);

  const splitSum = splits.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const total = Number(totalAmount) || 0;
  const splitRemaining = Math.max(0, total - splitSum);

  const serviceLabel = (s) =>
    `${s.name || s.projectTitle || s.clientName}${
      s.billingModel === "recurring" ? " (Recurring)" : ""
    }`;

  const previewPayload = useMemo(() => {
    if (!clientId || total <= 0) return null;

    if (isServicePage) {
      return { clientId, serviceId: fixedServiceId, totalAmount: total };
    }

    const validSplits = splits
      .filter((row) => row.serviceId && Number(row.amount) > 0)
      .map((row) => ({ serviceId: row.serviceId, amount: Number(row.amount) }));

    if (!validSplits.length || Math.abs(splitSum - total) > 0.01) return null;

    return { clientId, totalAmount: total, splits: validSplits };
  }, [clientId, total, isServicePage, fixedServiceId, splits, splitSum]);

  useEffect(() => {
    if (!open || !previewPayload) {
      setPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const { data } = await previewClientPayment(previewPayload);
        setPreview(data.data);
      } catch {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [open, previewPayload]);

  const updateSplit = (index, key, value) => {
    setSplits((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) {
      toast.error("Client is required");
      return;
    }
    if (total <= 0) {
      toast.error("Enter payment amount");
      return;
    }

    if (isServicePage) {
      setSubmitting(true);
      try {
        await createClientPayment({
          clientId,
          serviceId: fixedServiceId,
          totalAmount: total,
          paymentDate,
          method,
          notes,
        });
        toast.success("Payment recorded");
        onSuccess?.();
        onClose();
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to record payment");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (splits.some((row) => !row.serviceId || !row.amount)) {
      toast.error("Complete all service splits");
      return;
    }
    if (Math.abs(splitSum - total) > 0.01) {
      toast.error("Service amounts must equal total payment");
      return;
    }

    setSubmitting(true);
    try {
      await createClientPayment({
        clientId,
        totalAmount: total,
        paymentDate,
        method,
        notes,
        splits: splits.map((row) => ({
          serviceId: row.serviceId,
          amount: Number(row.amount),
        })),
      });
      toast.success("Payment recorded");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const displayServiceName =
    fixedServiceName ||
    services.find((s) => String(s._id) === String(fixedServiceId))?.name ||
    "This service";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isServicePage ? "Receive payment" : "Record client payment"}
      description={
        isServicePage
          ? `Payment will be applied to ${displayServiceName} automatically — oldest invoices first, then prepaid credit if any remains.`
          : clientName
            ? `Split a payment from ${clientName} across one or more services. Each portion is allocated automatically.`
            : "Enter total received and split across services."
      }
      size="lg"
    >
      <Form onSubmit={handleSubmit}>
        {isServicePage && (
          <div className="mb-4 rounded-lg border border-admin-border bg-admin-muted/40 px-4 py-3">
            <p className="text-xs text-admin-textMuted">Service</p>
            <p className="font-semibold text-admin-text">{displayServiceName}</p>
            {fixedBillingModel === "recurring" && (
              <p className="mt-1 text-xs text-admin-textMuted">Recurring · FIFO invoice allocation</p>
            )}
          </div>
        )}

        <FormGrid>
          <Input
            label="Amount (₹)"
            type="number"
            min={0}
            step="any"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            required
          />
          <Input
            label="Payment date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
          <Select
            label="Method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            options={PAID_VIA.map((m) => ({ value: m, label: m }))}
          />
        </FormGrid>
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {!isServicePage && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Split across services</h3>
              <span className="text-xs text-admin-textMuted">
                Remaining: {formatCurrency(splitRemaining)}
              </span>
            </div>
            {splits.map((row, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-lg border border-admin-border p-3 sm:grid-cols-[1fr_140px_auto]"
              >
                <Select
                  label="Service"
                  value={row.serviceId}
                  onChange={(e) => updateSplit(index, "serviceId", e.target.value)}
                  options={[
                    { value: "", label: "Select service…" },
                    ...services.map((s) => ({
                      value: String(s._id),
                      label: serviceLabel(s),
                    })),
                  ]}
                />
                <Input
                  label="Amount (₹)"
                  type="number"
                  min={0}
                  step="any"
                  value={row.amount}
                  onChange={(e) => updateSplit(index, "amount", e.target.value)}
                />
                <div className="flex items-end">
                  {splits.length > 1 && (
                    <Button type="button" variant="ghost" onClick={() => setSplits((rows) => rows.filter((_, i) => i !== index))}>
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => setSplits((rows) => [...rows, emptySplit()])}>
              <Plus size={16} /> Add service
            </Button>
          </div>
        )}

        {!(isServicePage && fixedBillingModel === "recurring") && (isServicePage || previewPayload) && (
          <div className="mt-4 rounded-xl border border-admin-border bg-admin-muted/30 p-4">
            <h3 className="mb-3 text-sm font-semibold text-admin-text">Allocation preview</h3>
            {previewLoading && (
              <p className="text-sm text-admin-textMuted">Calculating allocation…</p>
            )}
            {!previewLoading && !preview && Number(totalAmount) > 0 && (
              <p className="text-sm text-admin-textMuted">
                {isServicePage
                  ? "Enter a valid amount to preview allocation."
                  : "Complete service splits to preview allocation."}
              </p>
            )}
            {!previewLoading && preview && (
              <AllocationPreview preview={preview} totalAmount={totalAmount} />
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={
              !Number(totalAmount) ||
              (!isServicePage && (splitRemaining > 0.01 || splits.some((r) => !r.serviceId || !r.amount)))
            }
          >
            Record payment
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
