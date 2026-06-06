function cellContent(col, row) {
  return col.render ? col.render(row) : row[col.key];
}

function isActionColumn(col) {
  return col.key === "actions" || col.label === "";
}

export default function Table({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data found",
  mobileTitleKey,
}) {
  if (!data?.length) {
    return (
      <div className="rounded-lg border border-admin-border bg-admin-muted/50 py-12 text-center text-admin-textMuted">
        {emptyMessage}
      </div>
    );
  }

  const dataColumns = columns.filter((col) => col.key !== "select");
  const displayColumns = dataColumns.filter((col) => !isActionColumn(col));
  const actionColumn = dataColumns.find(isActionColumn);
  const titleKey =
    mobileTitleKey ||
    displayColumns.find((c) => c.key !== "actions")?.key ||
    displayColumns[0]?.key;

  return (
    <>
      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {data.map((row, i) => (
          <div
            key={row._id || i}
            onClick={() => onRowClick?.(row)}
            className={`rounded-xl border border-admin-border bg-admin-surface p-4 shadow-sm ${
              onRowClick ? "cursor-pointer active:bg-blue-50/30" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {columns.find((c) => c.key === "select") && (
                  <div
                    className="mb-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {columns.find((c) => c.key === "select")?.render?.(row)}
                  </div>
                )}
                {titleKey && (
                  <div className="font-medium text-admin-text">
                    {cellContent(
                      dataColumns.find((c) => c.key === titleKey) || { key: titleKey },
                      row
                    )}
                  </div>
                )}
              </div>
              {actionColumn && (
                <div
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {actionColumn.render(row)}
                </div>
              )}
            </div>
            <dl className="mt-3 space-y-2 border-t border-admin-border pt-3">
              {displayColumns
                .filter((col) => col.key !== titleKey)
                .map((col) => (
                  <div key={col.key} className="flex justify-between gap-3 text-sm">
                    <dt className="shrink-0 text-admin-textMuted">{col.label}</dt>
                    <dd className="min-w-0 text-right font-medium text-admin-text">
                      {cellContent(col, row)}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="admin-table-scroll hidden overflow-x-auto rounded-xl border border-admin-border md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-admin-border bg-admin-muted">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="whitespace-nowrap px-4 py-3 font-semibold text-admin-textMuted"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row._id || i}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-admin-border transition-colors last:border-0 ${
                  onRowClick ? "cursor-pointer hover:bg-blue-50/50" : ""
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-admin-text">
                    {cellContent(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
