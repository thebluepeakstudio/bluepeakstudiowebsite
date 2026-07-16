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
  hideMobileActions = false,
  actionsAlign = "start",
}) {
  if (!data?.length) {
    return (
      <div className="admin-table-empty flex flex-col items-center justify-center rounded-2xl border border-dashed border-admin-border bg-slate-50/60 px-6 py-14 text-center">
        <p className="text-sm font-medium text-admin-textMuted">{emptyMessage}</p>
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
      <div className="space-y-3 md:hidden">
        {data.map((row, i) => (
          <div
            key={row._id || i}
            onClick={() => onRowClick?.(row)}
            className={`rounded-2xl border border-admin-border/80 bg-white p-4 shadow-sm shadow-slate-200/30 ${
              onRowClick ? "cursor-pointer transition-colors active:bg-blue-50/40" : ""
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
                  <div className="font-semibold text-admin-text">
                    {cellContent(
                      dataColumns.find((c) => c.key === titleKey) || { key: titleKey },
                      row
                    )}
                  </div>
                )}
              </div>
              {actionColumn && !hideMobileActions && (
                <div
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {actionColumn.render(row)}
                </div>
              )}
            </div>
            <dl className="mt-3 space-y-2 border-t border-admin-border/70 pt-3">
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

      <div className="admin-table-scroll hidden overflow-hidden rounded-2xl border border-admin-border/80 bg-white shadow-sm shadow-slate-200/30 md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-admin-border/80 bg-slate-50/90">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-admin-textMuted ${
                    isActionColumn(col) && actionsAlign === "end" ? "text-right" : ""
                  } ${col.className || ""}`}
                  style={col.width || col.minWidth ? { width: col.width, minWidth: col.minWidth } : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border/60">
            {data.map((row, i) => (
              <tr
                key={row._id || i}
                onClick={() => onRowClick?.(row)}
                className={`bg-white transition-colors ${
                  onRowClick ? "cursor-pointer hover:bg-blue-50/40" : ""
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3.5 text-admin-text ${
                      isActionColumn(col) && actionsAlign === "end" ? "text-right" : ""
                    } ${col.className || ""}`}
                    style={col.width || col.minWidth ? { width: col.width, minWidth: col.minWidth } : undefined}
                  >
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
