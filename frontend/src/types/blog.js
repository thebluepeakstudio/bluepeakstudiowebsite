/**
 * @typedef {Object} BlogImage
 * @property {string} url
 * @property {string} publicId
 * @property {string} [alt]
 * @property {string} [_id]
 */

/**
 * @typedef {Object} BlogCategory
 * @property {string} _id
 * @property {string} name
 * @property {string} slug
 * @property {string} [description]
 */

/**
 * @typedef {Object} Blog
 * @property {string} _id
 * @property {string} title
 * @property {string} slug
 * @property {string} excerpt
 * @property {string} content
 * @property {{ url: string, publicId: string }} featuredImage
 * @property {BlogImage[]} galleryImages
 * @property {string|BlogCategory|null} categoryId
 * @property {string} author
 * @property {string} seoTitle
 * @property {string} seoDescription
 * @property {string} seoKeywords
 * @property {string[]} tags
 * @property {'Draft'|'Published'} status
 * @property {boolean} isFeatured
 * @property {number} readingTime
 * @property {string|null} publishedAt
 * @property {string} createdAt
 * @property {string} updatedAt
 */

export const BLOG_STATUSES = ["Draft", "Published"];

export const emptyBlog = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  categoryId: "",
  author: "BluePeak Studio",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  tags: "",
  status: "Draft",
  isFeatured: false,
  publishedAt: "",
  featuredImage: null,
  galleryImages: [],
  newGalleryFiles: [],
  removeFeatured: false,
};

export const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
