import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ExternalLink, Tags } from "lucide-react";
import { getBlogs, deleteBlog } from "../../api/blogs.api";
import { getBlogCategories } from "../../api/blogCategories.api";
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
import { BLOG_STATUSES } from "../../../types/blog";
import { formatDate } from "../../utils/formatCurrency";
import toast from "react-hot-toast";

const siteBase = import.meta.env.VITE_SITE_URL || window.location.origin;

export default function BlogList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const debouncedSearch = useDebounce(search);

  const listParams = {
    search: debouncedSearch || undefined,
    status: status || undefined,
    categoryId: categoryId || undefined,
  };

  const { data: categories = [] } = useQuery({
    queryKey: adminQueryKeys.blogCategories(),
    queryFn: async () => {
      const { data } = await getBlogCategories();
      return data.data;
    },
    staleTime: 60_000,
  });

  const { list: blogs, pagination, page, setPage, loading } = usePaginatedQuery(
    adminQueryKeys.blogs(listParams),
    async (p) => {
      const { data } = await getBlogs({ page: p, limit: 10, ...listParams });
      return { list: data.data, pagination: data.pagination };
    },
    [debouncedSearch, status, categoryId]
  );

  const refreshBlogs = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "blogs"] });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBlog(deleteId);
      toast.success("Blog deleted");
      setDeleteId(null);
      refreshBlogs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const categoryOptions = [
    { value: "", label: "All categories" },
    ...categories.map((c) => ({ value: c._id, label: c.name })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-admin-text">Blog posts</h1>
          <p className="text-sm text-admin-textMuted">Create and manage published content</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate("/admin-panel/blog/categories")}>
            <Tags size={16} /> Categories
          </Button>
          <Button onClick={() => navigate("/admin-panel/blog/new")}>
            <Plus size={18} /> New blog
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:min-w-[200px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by title..." />
        </div>
        <FilterSelect
          className="w-full sm:w-auto sm:min-w-[140px]"
          value={status}
          onChange={setStatus}
          options={[{ value: "", label: "All statuses" }, ...BLOG_STATUSES.map((s) => ({ value: s, label: s }))]}
        />
        <FilterSelect
          className="w-full sm:w-auto sm:min-w-[160px]"
          value={categoryId}
          onChange={setCategoryId}
          options={categoryOptions}
        />
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : blogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-admin-border bg-admin-surface p-12 text-center">
          <p className="text-admin-textMuted">No blogs found. Create your first post.</p>
          <Button className="mt-4" onClick={() => navigate("/admin-panel/blog/new")}>
            <Plus size={18} /> New blog
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
                  r.featuredImage?.url ? (
                    <img
                      src={r.featuredImage.url}
                      alt=""
                      className="h-12 w-16 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-16 items-center justify-center rounded bg-admin-muted text-xs text-admin-textMuted">
                      —
                    </div>
                  ),
              },
              { key: "title", label: "Title", render: (r) => <span className="font-medium">{r.title}</span> },
              { key: "slug", label: "Slug", render: (r) => <code className="text-xs">{r.slug}</code> },
              { key: "author", label: "Author" },
              {
                key: "status",
                label: "Status",
                render: (r) => <Badge status={r.status} />,
              },
              {
                key: "category",
                label: "Category",
                render: (r) => r.categoryId?.name || "—",
              },
              {
                key: "createdAt",
                label: "Created",
                render: (r) => formatDate(r.createdAt),
              },
              {
                key: "actions",
                label: "",
                render: (r) => (
                  <div className="flex items-center justify-end gap-1">
                    {r.status === "Published" && (
                      <a
                        href={`${siteBase}/blogs/${r.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded p-2 text-admin-textMuted hover:bg-admin-muted"
                        title="View"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                    <Link
                      to={`/admin-panel/blog/${r._id}/edit`}
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
            data={blogs}
            emptyMessage="No blogs"
          />
          <Pagination page={page} pages={pagination.pages} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete blog?"
        message="This will soft-delete the blog. It will no longer appear on the website."
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        loading={deleting}
        danger
      />
    </div>
  );
}
