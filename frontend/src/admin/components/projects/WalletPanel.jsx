import { formatCurrency, formatDate } from "../../utils/formatCurrency";

export default function WalletPanel({ wallet, onAllocate }) {
  const balance = wallet?.balance ?? 0;
  const transactions = wallet?.transactions || [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-admin-border bg-admin-surface p-5">
        <p className="text-sm text-admin-textMuted">Wallet balance</p>
        <p className="mt-1 text-3xl font-bold text-admin-text">{formatCurrency(balance)}</p>
        <p className="mt-2 text-xs text-admin-textMuted">
          Credit is applied automatically to this project&apos;s invoices on each billing date.
        </p>
        {onAllocate && (
          <button
            type="button"
            onClick={onAllocate}
            className="mt-4 text-sm font-medium text-admin-primary hover:underline"
          >
            Receive payment →
          </button>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-admin-text">Transactions</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-admin-textMuted">No wallet transactions yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-admin-border">
            <table className="w-full text-sm">
              <thead className="bg-admin-muted/60 text-left text-xs uppercase text-admin-textMuted">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn._id} className="border-t border-admin-border">
                    <td className="px-4 py-3">{formatDate(txn.createdAt)}</td>
                    <td className="px-4 py-3 capitalize">{txn.type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">{formatCurrency(txn.amount)}</td>
                    <td className="px-4 py-3">{formatCurrency(txn.balanceAfter)}</td>
                    <td className="px-4 py-3 text-admin-textMuted">{txn.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
