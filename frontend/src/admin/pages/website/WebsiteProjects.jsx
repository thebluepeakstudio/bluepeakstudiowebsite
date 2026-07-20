import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ExternalLink, Tags } from "lucide-react";
import { getWebsiteProjects, deleteWebsiteProject } from "../../api/websiteProjects.api";
import { getWebsiteProjectCategories } from "../../api/websiteProjectCategories.api";
import { useDebounce } from "../../hooks/useDebounce";
import { usePaginatedQuery } from "../../hooks/usePaginatedQuery";
import { adminQueryKeys } from "../../queryKeys";
import Button from "../../components/ui/Button";
import SearchInput from "../../components/ui/SearchInput";
import FilterSelect from "../../components/ui/FilterSelect";
import Table from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Badge from "../../components/ui/Badge";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { WEBSITE_STATUSES, hasCaseStudyContent } from "../../../types/website";
import toast from "react-hot-toast";
import { adminPath } from "../../utils/adminPaths";

const siteBase = import.meta.env.VITE_SITE_URL || window.location.origin;

export default function WebsiteProjects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const debouncedSearch = useDebounce(search);

  const { data: categories = [] } = useQuery({
    queryKey: adminQueryKeys.websiteProjectCategories(),
    queryFn: async () => {
      const { data } = await getWebsiteProjectCategories();
      return data.data || [];
    },
    staleTime: 60_000,
  });

  const listParams = {
    search: debouncedSearch || undefined,
    status: status || undefined,
    category: category || undefined,
  };

  const { list, pagination, page, setPage, loading } = usePaginatedQuery(
    adminQueryKeys.websiteProjects(listParams),
    async (p) => {
      const { data } = await getWebsiteProjects({ page: p, limit: 10, ...listParams });
      return { list: data.data, pagination: data.pagination };
    },
    [debouncedSearch, status, category]
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "website-projects"] });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteWebsiteProject(deleteId);
      toast.success("Project deleted");
      setDeleteId(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-admin-text">Portfolio</h1>
          <p className="text-sm text-admin-textMuted">
            Projects and case studies shown on the public Projects page
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate(adminPath("portfolio", "categories"))}>
            <Tags size={16} /> Categories
          </Button>
          <Button onClick={() => navigate(adminPath("portfolio", "new"))}>
            <Plus size={18} /> New project
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:min-w-[200px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search projects..." />
        </div>
        <FilterSelect
          className="w-full sm:w-auto sm:min-w-[140px]"
          value={status}
          onChange={setStatus}
          options={[{ value: "", label: "All statuses" }, ...WEBSITE_STATUSES.map((s) => ({ value: s, label: s }))]}
        />
        <FilterSelect
          className="w-full sm:w-auto sm:min-w-[160px]"
          value={category}
          onChange={setCategory}
          options={[
            { value: "", label: "All categories" },
            ...categories.map((c) => ({ value: c.name, label: c.name })),
          ]}
        />
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-admin-border bg-admin-surface p-12 text-center">
          <p className="text-admin-textMuted">No portfolio projects yet.</p>
          <Button className="mt-4" onClick={() => navigate(adminPath("portfolio", "new"))}>
            <Plus size={18} /> New project
          </Button>
        </div>
      ) : (
        <>
          <Table
            columns={[
              {
                key: "image",
                label: "Image",
                render: (r) =>
                  r.img ? (
                    <img src={r.img} alt="" className="h-12 w-16 rounded object-cover" />
                  ) : (
                    <div className="flex h-12 w-16 items-center justify-center rounded bg-admin-muted text-xs text-admin-textMuted">
                      —
                    </div>
                  ),
              },
              {
                key: "title",
                label: "Title",
                render: (r) => (
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-admin-textMuted">{r.category}</p>
                  </div>
                ),
              },
              {
                key: "slug",
                label: "Slug",
                render: (r) => <code className="text-xs">{r.slug}</code>,
              },
              {
                key: "caseStudy",
                label: "Case study",
                render: (r) => (hasCaseStudyContent(r.caseStudy) ? "Yes" : "—"),
              },
              {
                key: "sortOrder",
                label: "Order",
              },
              {
                key: "status",
                label: "Status",
                render: (r) => <Badge status={r.status} />,
              },
              {
                key: "actions",
                label: "",
                render: (r) => (
                  <div className="flex items-center justify-end gap-1">
                    {r.status === "Published" && hasCaseStudyContent(r.caseStudy) && (
                      <a
                        href={`${siteBase}/projects/case-study/${r.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded p-2 text-admin-textMuted hover:bg-admin-muted"
                        title="View case study"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                    <Link
                      to={adminPath("portfolio", r._id, "edit")}
                      className="rounded p-2 text-admin-textMuted hover:bg-admin-muted"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteId(r._id)}
                      className="rounded p-2 text-red-500 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ),
              },
            ]}
            data={list}
            emptyMessage="No projects"
          />
          <Pagination page={page} pages={pagination?.pages || 1} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete portfolio project?"
        message="This removes it from the public Projects page."
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        loading={deleting}
        danger
      />
    </div>
  );
}
