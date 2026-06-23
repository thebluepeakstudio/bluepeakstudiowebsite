/** Public visibility: status Published and not soft-deleted. */
const publishedBlogFilter = () => ({
  status: "Published",
  deletedAt: null,
});

module.exports = { publishedBlogFilter };
