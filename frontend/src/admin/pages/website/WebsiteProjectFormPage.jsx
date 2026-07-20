import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getWebsiteProject,
  createWebsiteProject,
  updateWebsiteProject,
} from "../../api/websiteProjects.api";
import Button from "../../components/ui/Button";
import { Input, Textarea, Select } from "../../components/ui/Input";
import { Form, FormSection, FormGrid, FormFooter } from "../../components/ui/Form";
import {
  WEBSITE_STATUSES,
  PROJECT_SIZES,
  PROJECT_CATEGORIES,
  emptyWebsiteProject,
  slugify,
  hasCaseStudyContent,
} from "../../../types/website";
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

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getWebsiteProject(id)
      .then(({ data }) => {
        const item = data.data;
        setForm({
          title: item.title || "",
          slug: item.slug || "",
          category: item.category || "Custom Software",
          desc: item.desc || "",
          tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
          color: item.color || "#378ADD",
          img: item.img || "",
          link: item.link || "",
          size: item.size || "large",
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
        setShowCaseStudy(hasCaseStudyContent(item.caseStudy) || item.category === "Custom Software");
      })
      .catch(() => {
        toast.error("Project not found");
        navigate(adminPath("portfolio"));
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  const setField = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "title" && !slugManual) {
        next.slug = slugify(value);
      }
      if (key === "category" && value === "Custom Software") {
        setShowCaseStudy(true);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        size: form.size,
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
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              options={PROJECT_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Size"
              value={form.size}
              onChange={(e) => setField("size", e.target.value)}
              options={PROJECT_SIZES.map((s) => ({ value: s, label: s }))}
            />
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
              hint="For Custom Software: demo video URL. For websites: live site URL."
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
    </div>
  );
}
