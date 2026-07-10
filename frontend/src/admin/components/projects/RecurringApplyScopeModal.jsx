import { useEffect, useState } from "react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";

export const APPLY_SCOPES = {
  FUTURE_ONLY: "future_only",
  CURRENT_AND_FUTURE: "current_and_future",
};

export default function RecurringApplyScopeModal({
  open,
  title,
  description,
  currentPeriodLabel,
  saving,
  onClose,
  onConfirm,
  confirmLabel = "Save",
}) {
  const [applyScope, setApplyScope] = useState(APPLY_SCOPES.FUTURE_ONLY);

  useEffect(() => {
    if (open) setApplyScope(APPLY_SCOPES.FUTURE_ONLY);
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="space-y-4">
        <p className="text-sm font-medium text-admin-text">Apply changes to:</p>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-admin-border p-3">
            <input
              type="radio"
              name="applyScope"
              value={APPLY_SCOPES.FUTURE_ONLY}
              checked={applyScope === APPLY_SCOPES.FUTURE_ONLY}
              onChange={() => setApplyScope(APPLY_SCOPES.FUTURE_ONLY)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-admin-text">
                Future billing cycles only
              </span>
              <span className="block text-xs text-admin-textMuted">
                Recommended. Past months and the current month stay unchanged.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-admin-border p-3">
            <input
              type="radio"
              name="applyScope"
              value={APPLY_SCOPES.CURRENT_AND_FUTURE}
              checked={applyScope === APPLY_SCOPES.CURRENT_AND_FUTURE}
              onChange={() => setApplyScope(APPLY_SCOPES.CURRENT_AND_FUTURE)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-admin-text">
                Current billing cycle + Future
              </span>
              <span className="block text-xs text-admin-textMuted">
                {currentPeriodLabel
                  ? `Also updates ${currentPeriodLabel} if it has been generated. Past months remain unchanged.`
                  : "Also updates the current month if it has been generated. Past months remain unchanged."}
              </span>
            </span>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-admin-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(applyScope)} loading={saving}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
