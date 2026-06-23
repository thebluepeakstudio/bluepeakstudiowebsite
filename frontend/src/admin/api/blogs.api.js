import api from "./axiosInstance";

export const getBlogs = (params) => api.get("/blogs", { params });
export const getBlog = (id) => api.get(`/blogs/${id}`);
export const createBlog = (data) =>
  api.post("/blogs", toFormData(data), {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateBlog = (id, data) =>
  api.put(`/blogs/${id}`, toFormData(data), {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteBlog = (id) => api.delete(`/blogs/${id}`);

const toFormData = (data) => {
  const form = new FormData();

  const scalarFields = [
    "title",
    "slug",
    "excerpt",
    "content",
    "categoryId",
    "author",
    "seoTitle",
    "seoDescription",
    "seoKeywords",
    "status",
    "publishedAt",
    "removeFeatured",
  ];

  scalarFields.forEach((key) => {
    if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
      form.append(key, data[key]);
    }
  });

  if (data.isFeatured !== undefined) {
    form.append("isFeatured", String(Boolean(data.isFeatured)));
  }

  if (data.tags !== undefined) {
    const tags =
      typeof data.tags === "string"
        ? data.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : data.tags;
    form.append("tags", JSON.stringify(tags));
  }

  if (data.keptGalleryImages) {
    form.append("keptGalleryImages", JSON.stringify(data.keptGalleryImages));
  }

  if (data.featuredImage instanceof File) {
    form.append("featuredImage", data.featuredImage);
  }

  (data.newGalleryFiles || []).forEach((file) => {
    if (file instanceof File) form.append("galleryImages", file);
  });

  return form;
};
