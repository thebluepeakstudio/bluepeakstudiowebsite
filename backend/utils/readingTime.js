const readingTime = (html, wordsPerMinute = 200) => {
  const text = String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
};

module.exports = { readingTime };
