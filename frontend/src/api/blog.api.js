import { apiUrl } from "../utils/apiBase";

const request = async (path) => {
  const res = await fetch(apiUrl(path), { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

export const getPublishedBlogs = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null))
  ).toString();
  return request(`/api/blog${qs ? `?${qs}` : ""}`);
};

export const getFeaturedBlogs = (limit = 3) => request(`/api/blog/featured?limit=${limit}`);

export const getLatestBlogs = (limit = 6) => request(`/api/blog/latest?limit=${limit}`);

export const getBlogCategories = () => request("/api/blog/categories");

export const getBlogBySlug = (slug) => request(`/api/blog/${slug}`);
