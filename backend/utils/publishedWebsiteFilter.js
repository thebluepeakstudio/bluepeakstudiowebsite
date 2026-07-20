/** Public visibility: status Published and not soft-deleted. */
const publishedWebsiteFilter = () => ({
  status: "Published",
  deletedAt: null,
});

module.exports = { publishedWebsiteFilter };
