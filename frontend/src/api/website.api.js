import { apiUrl } from "../utils/apiBase";

const request = async (path) => {
  const res = await fetch(apiUrl(path), { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

export const getPublishedTestimonials = () => request("/api/website/testimonials");

export const getPublishedProjects = () => request("/api/website/projects");

export const getPublishedProjectBySlug = (slug) => request(`/api/website/projects/${slug}`);

export function getEmbedUrl(url) {
  if (!url || url === "#") return null;
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}
