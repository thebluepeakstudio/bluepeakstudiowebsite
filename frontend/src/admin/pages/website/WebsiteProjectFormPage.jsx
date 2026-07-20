import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  getWebsiteProject,
  createWebsiteProject,
  updateWebsiteProject,
} from "../../api/websiteProjects.api";
import {
  getWebsiteProjectCategories,
  createWebsiteProjectCategory,
} from "../../api/websiteProjectCategories.api";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { Form, FormSection, FormGrid, FormFooter } from "../../components/ui/Form";
import {
  WEBSITE_STATUSES,
  emptyWebsiteProject,
  slugify,
  hasCaseStudyContent,
} from "../../../types/website";
import { adminQueryKeys } from "../../queryKeys";
import { adminPath } from "../../utils/adminPaths";
import toast from "react-hot-toast";

export default function WebsiteProjectFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyWebsiteProject);
  const [slugManual, setSlugManual] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [showCaseStudy, setShowCaseStudy] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const {
    data: categories = [],
    refetch: refetchCategories,
  } = useQuery({
    queryKey: adminQueryKeys.websiteProjectCategories(),
    queryFn: async () => {
      const { data } = await getWebsiteProjectCategories();
      return data.data || [];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getWebsiteProject(id)
      .then(({ data }) => {
        const item = data.data;
        setForm({
          title: item.title || "",
          slug: item.slug || "",
          category: item.category || "",
          desc: item.desc || "",
          tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
          color: item.color || "#378ADD",
          img: item.img || "",
          link: item.link || "",
          sortOrder: item.sortOrder ?? 0,
          status: item.status || "Published",
          caseStudy: {
            overview: item.caseStudy?.overview || "",
            problem: item.caseStudy?.problem || "",
            solution: item.caseStudy?.solution || "",
            highlights: Array.isArray(item.caseStudy?.highlights)
              ? item.caseStudy.highlights.join("\n")
              : "",
          },
        });
        setSlugManual(true);
        setShowCaseStudy(hasCaseStudyContent(item.caseStudy));
      })
      .catch(() => {
        toast.error("Project not found");
        navigate(adminPath("portfolio"));
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  useEffect(() => {
    if (!form.category && categories.length) {
      setForm((f) => ({ ...f, category: categories[0].name }));
    }
  }, [categories, form.category]);

  const setField = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "title" && !slugManual) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const setCaseStudyField = (key, value) => {
    setForm((f) => ({
      ...f,
      caseStudy: { ...f.caseStudy, [key]: value },
    }));
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    setCreatingCategory(true);
    try {
      const { data } = await createWebsiteProjectCategory({ name });
      await refetchCategories();
      setField("category", data.data.name);
      setCatModalOpen(false);
      setNewCategory("");
      toast.success("Category created");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category?.trim()) {
      toast.error("Select or create a category");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title),
        category: form.category,
        desc: form.desc.trim(),
        tags: form.tags,
        color: form.color,
        img: form.img.trim(),
        link: form.link.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        status: form.status,
        caseStudy: showCaseStudy
          ? {
              overview: form.caseStudy.overview,
              problem: form.caseStudy.problem,
              solution: form.caseStudy.solution,
              highlights: form.caseStudy.highlights,
            }
          : null,
      };

      if (isEdit) {
        await updateWebsiteProject(id, payload);
        toast.success("Project updated");
      } else {
        await createWebsiteProject(payload);
        toast.success("Project created");
      }
      navigate(adminPath("portfolio"));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  const categoryOptions = categories.map((c) => ({ value: c.name, label: c.name }));
  if (form.category && !categoryOptions.some((o) => o.value === form.category)) {
    categoryOptions.unshift({ value: form.category, label: form.category });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-admin-text">
          {isEdit ? "Edit portfolio project" : "New portfolio project"}
        </h1>
        <p className="text-sm text-admin-textMuted">
          Appears on the public Projects page. Case study fields power the case study page.
        </p>
      </div>

      <Form onSubmit={handleSubmit}>
        <FormSection title="Project card">
          <FormGrid>
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              required
            />
            <Input
              label="Slug"
              value={form.slug}
              onChange={(e) => {
                setSlugManual(true);
                setField("slug", e.target.value);
              }}
              hint="Used in case study URL"
            />
            <div className="flex min-w-0 flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Select
                  label="Category"
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  options={
                    categoryOptions.length
                      ? categoryOptions
                      : [{ value: "", label: "No categories yet" }]
                  }
                  required
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                onClick={() => setCatModalOpen(true)}
              >
                <Plus size={16} /> New category
              </Button>
            </div>
            <Input
              label="Image URL"
              value={form.img}
              onChange={(e) => setField("img", e.target.value)}
              placeholder="https://ik.imagekit.io/..."
              required
            />
            <Input
              label="Demo / site link"
              value={form.link}
              onChange={(e) => setField("link", e.target.value)}
              hint="Demo video URL or live site URL"
            />
            <Input
              label="Accent color"
              value={form.color}
              onChange={(e) => setField("color", e.target.value)}
            />
            <Input
              label="Tags"
              value={form.tags}
              onChange={(e) => setField("tags", e.target.value)}
              hint="Comma-separated"
            />
            <Input
              label="Sort order"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setField("sortOrder", e.target.value)}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
              options={WEBSITE_STATUSES.map((s) => ({ value: s, label: s }))}
            />
          </FormGrid>
          <Textarea
            label="Description"
            value={form.desc}
            onChange={(e) => setField("desc", e.target.value)}
            rows={3}
            required
          />
        </FormSection>

        <FormSection
          title="Case study"
          description="Optional. When filled, a Case Study button appears on the project card."
        >
          <label className="mb-4 flex items-center gap-2 text-sm text-admin-text">
            <input
              type="checkbox"
              checked={showCaseStudy}
              onChange={(e) => setShowCaseStudy(e.target.checked)}
              className="rounded border-admin-border"
            />
            Include case study content
          </label>

          {showCaseStudy && (
            <div className="space-y-4">
              <Textarea
                label="Overview"
                value={form.caseStudy.overview}
                onChange={(e) => setCaseStudyField("overview", e.target.value)}
                rows={3}
              />
              <Textarea
                label="The problem"
                value={form.caseStudy.problem}
                onChange={(e) => setCaseStudyField("problem", e.target.value)}
                rows={3}
              />
              <Textarea
                label="How we solved it"
                value={form.caseStudy.solution}
                onChange={(e) => setCaseStudyField("solution", e.target.value)}
                rows={3}
              />
              <Textarea
                label="Key outcomes"
                value={form.caseStudy.highlights}
                onChange={(e) => setCaseStudyField("highlights", e.target.value)}
                rows={4}
                hint="One highlight per line"
              />
            </div>
          )}
        </FormSection>

        <FormFooter>
          <Button type="button" variant="secondary" onClick={() => navigate(adminPath("portfolio"))}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? "Save changes" : "Create project"}
          </Button>
        </FormFooter>
      </Form>

      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title="New category">
        <Form onSubmit={handleCreateCategory}>
          <Input
            label="Category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            required
            placeholder="e.g. SaaS Dashboard"
          />
          <FormFooter>
            <Button type="button" variant="secondary" onClick={() => setCatModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creatingCategory}>
              Create
            </Button>
          </FormFooter>
        </Form>
      </Modal>
    </div>
  );
}
