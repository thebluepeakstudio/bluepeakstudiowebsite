import { useState } from "react";
import { Link } from "react-router-dom";
import { globalSearch } from "../api/analytics.api";
import { useDebounce } from "../hooks/useDebounce";
import SearchInput from "../components/ui/SearchInput";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { useEffect } from "react";
import { getProjectLabel } from "../utils/constants";
import { adminPath } from "../utils/adminPaths";

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(query, 500);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    globalSearch(debounced)
      .then(({ data }) => setResults(data.data))
      .finally(() => setLoading(false));
  }, [debounced]);

  return (
    <div className="space-y-6">
      <SearchInput value={query} onChange={setQuery} placeholder="Search projects, freelancers, expenses..." />

      {loading && <p className="text-sm text-admin-textMuted">Searching...</p>}

      {results && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title={`Projects (${results.projects?.length || 0})`}>
            {!results.projects?.length ? (
              <p className="text-sm text-admin-textMuted">No results</p>
            ) : (
              <ul className="space-y-2">
                {results.projects.map((p) => (
                  <li key={p._id}>
                    <Link to={adminPath("projects", p._id)} className="block rounded-lg p-2 transition-colors hover:bg-blue-50">
                      <p className="font-medium text-sm">{getProjectLabel(p)}</p>
                      <p className="text-xs text-admin-textMuted">{p.projectTitle || p.clientName}</p>
                      <div className="mt-1 flex gap-1">
                        <Badge status={p.workStatus} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Freelancers (${results.freelancers?.length || 0})`}>
            {!results.freelancers?.length ? (
              <p className="text-sm text-admin-textMuted">No results</p>
            ) : (
              <ul className="space-y-2">
                {results.freelancers.map((f) => (
                  <li key={f._id} className="rounded-lg p-2">
                    <p className="font-medium text-sm">{f.name}</p>
                    <p className="text-xs text-admin-textMuted">{f.email}</p>
                    <Badge status={f.availabilityStatus} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Expenses (${results.expenses?.length || 0})`}>
            {!results.expenses?.length ? (
              <p className="text-sm text-admin-textMuted">No results</p>
            ) : (
              <ul className="space-y-2">
                {results.expenses.map((e) => (
                  <li key={e._id} className="rounded-lg p-2">
                    <p className="font-medium text-sm">{e.title}</p>
                    <p className="text-xs text-admin-textMuted">{e.category}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
