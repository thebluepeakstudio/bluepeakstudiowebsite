import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { getBlog, createBlog, updateBlog } from "../../api/blogs.api";
import { getBlogCategories } from "../../api/blogCategories.api";
import RichTextEditor from "../../components/blog/RichTextEditor";
import Button from "../../components/ui/Button";
import { Input, Textarea, Select, RequiredMark } from "../../components/ui/Input";
import { Form, FormSection, FormGrid, FormFooter, FormCheckbox, FormFileInput } from "../../components/ui/Form";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { BLOG_STATUSES, emptyBlog, slugify } from "../../../types/blog";
import { readingTimeFromHtml } from "../../../utils/readingTime";
import SeoPreview from "../../components/blog/SeoPreview";
import toast from "react-hot-toast";
import { adminPath } from "../../utils/adminPaths";

export default function BlogFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ ...emptyBlog });
  const [categories, setCategories] = useState([]);
  const [existingGallery, setExistingGallery] = useState([]);
  const [featuredPreview, setFeaturedPreview] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getBlogCategories()
      .then(({ data }) => setCategories(data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getBlog(id)
      .then(({ data }) => {
        const b = data.data;
        setForm({
          title: b.title,
          slug: b.slug,
          excerpt: b.excerpt || "",
          content: b.content || "",
          categoryId: b.categoryId?._id || b.categoryId || "",
          author: b.author || "BluePeak Studio",
          seoTitle: b.seoTitle || "",
          seoDescription: b.seoDescription || "",
          seoKeywords: b.seoKeywords || "",
          tags: (b.tags || []).join(", "),
          status: b.status,
          isFeatured: b.isFeatured,
          publishedAt: b.publishedAt ? b.publishedAt.slice(0, 16) : "",
          featuredImage: null,
          removeFeatured: false,
        });
        setExistingGallery(b.galleryImages || []);
        setFeaturedPreview(b.featuredImage?.url || "");
        setSlugManual(true);
      })
      .catch(() => {
        toast.error("Blog not found");
        navigate(adminPath("blog"));
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onStatusChange = (status) => {
    setField("status", status);
    if (status === "Published" && !form.publishedAt) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
      setField("publishedAt", local);
    }
  };

  const onTitleChange = (title) => {
    setField("title", title);
    if (!slugManual) setField("slug", slugify(title));
  };

  const removeGalleryImage = (publicId) => {
    setExistingGallery((prev) => prev.filter((img) => img.publicId !== publicId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.content?.trim()) {
      toast.error("Content is required");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId || undefined,
        keptGalleryImages: existingGallery,
        newGalleryFiles: form.newGalleryFiles || [],
      };

      if (isEdit) {
        await updateBlog(id, payload);
        toast.success("Blog updated");
      } else {
        await createBlog(payload);
        toast.success("Blog created");
      }
      navigate(adminPath("blog"));
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const estReading = readingTimeFromHtml(form.content);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button
        type="button"
        onClick={() => navigate(adminPath("blog"))}
        className="flex items-center gap-2 text-sm text-admin-textMuted hover:text-admin-text"
      >
        <ArrowLeft size={16} /> Back to blogs
      </button>

      <Form onSubmit={handleSubmit}>
        <FormSection title="Content">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
          />
          <FormGrid>
            <Input
              label="URL slug"
              value={form.slug}
              onChange={(e) => {
                setSlugManual(true);
                setField("slug", slugify(e.target.value));
              }}
              hint="Auto-generated from title; editable"
            />
            <Input label="Author" value={form.author} onChange={(e) => setField("author", e.target.value)} />
          </FormGrid>
          <Textarea
            label="Short description / excerpt"
            value={form.excerpt}
            onChange={(e) => setField("excerpt", e.target.value)}
            rows={3}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-admin-text">
              Content
              <RequiredMark />
            </label>
            <RichTextEditor value={form.content} onChange={(html) => setField("content", html)} />
            <p className="mt-1 text-xs text-admin-textMuted">Estimated reading time: {estReading} min</p>
          </div>
        </FormSection>

        <FormSection title="Media">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-admin-text">Featured image</label>
              {featuredPreview && !form.removeFeatured && (
                <div className="relative mb-2 inline-block">
                  <img src={featuredPreview} alt="" className="h-32 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setField("removeFeatured", true);
                      setFeaturedPreview("");
                      setField("featuredImage", null);
                    }}
                    className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <FormFileInput
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setField("featuredImage", file);
                    setField("removeFeatured", false);
                    setFeaturedPreview(URL.createObjectURL(file));
                  }
                }}
              />
              <p className="mt-1 text-xs text-admin-textMuted">JPG, PNG, WEBP — max 5MB</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-admin-text">Gallery images</label>
              {existingGallery.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {existingGallery.map((img) => (
                    <div key={img.publicId} className="relative">
                      <img src={img.url} alt="" className="h-20 w-20 rounded object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(img.publicId)}
                        className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <FormFileInput
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => setField("newGalleryFiles", Array.from(e.target.files || []))}
              />
            </div>
          </div>
        </FormSection>

        <FormSection title="Organization">
          <FormGrid>
            <Select
              label="Category"
              value={form.categoryId}
              onChange={(e) => setField("categoryId", e.target.value)}
              options={[
                { value: "", label: "No category" },
                ...categories.map((c) => ({ value: c._id, label: c.name })),
              ]}
            />
            <Input
              label="Tags"
              value={form.tags}
              onChange={(e) => setField("tags", e.target.value)}
              hint="Comma-separated"
            />
          </FormGrid>
          <FormGrid>
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => onStatusChange(e.target.value)}
              options={BLOG_STATUSES.map((s) => ({ value: s, label: s }))}
            />
            <Input
              label="Publish date"
              type="datetime-local"
              value={form.publishedAt}
              onChange={(e) => setField("publishedAt", e.target.value)}
              hint="Leave blank to publish immediately when status is Published."
            />
          </FormGrid>
          <FormCheckbox
            label="Featured blog"
            checked={form.isFeatured}
            onChange={(e) => setField("isFeatured", e.target.checked)}
          />
        </FormSection>

        <FormSection title="SEO">
          <SeoPreview
            title={form.title}
            seoTitle={form.seoTitle}
            excerpt={form.excerpt}
            seoDescription={form.seoDescription}
            slug={form.slug}
            featuredImageUrl={featuredPreview}
          />
          <Input
            label="SEO title"
            value={form.seoTitle}
            onChange={(e) => setField("seoTitle", e.target.value)}
            hint="Leave blank to use the post title. Aim for 50–60 characters."
            placeholder={form.title || "Uses post title if empty"}
          />
          <Textarea
            label="SEO description"
            value={form.seoDescription}
            onChange={(e) => setField("seoDescription", e.target.value)}
            rows={2}
            hint="Leave blank to use the excerpt. Aim for 150–160 characters."
            placeholder={form.excerpt || "Uses excerpt if empty"}
          />
          <Input
            label="SEO keywords"
            value={form.seoKeywords}
            onChange={(e) => setField("seoKeywords", e.target.value)}
            hint="Comma-separated keywords (e.g. web development, CRM, admin panel)"
          />
        </FormSection>

        <FormFooter
          onCancel={() => navigate(adminPath("blog"))}
          submitLabel={isEdit ? "Update blog" : "Create blog"}
          loading={submitting}
        />
      </Form>
    </div>
  );
}
