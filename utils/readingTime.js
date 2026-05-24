function readingTime(html) {
  if (!html) return 1;
  const words = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
module.exports = { readingTime };
