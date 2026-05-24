function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueSlug(base, existingSlugs) {
  let slug = slugify(base);
  if (!existingSlugs.includes(slug)) return slug;
  let i = 2;
  while (existingSlugs.includes(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

module.exports = { slugify, uniqueSlug };
