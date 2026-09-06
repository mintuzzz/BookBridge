/**
 * BookBridge Title Normalization & Comparison Utility
 * Ensures case-insensitive, whitespace-tolerant, and punctuation-agnostic book title matching.
 */

export const normalizeTitle = (title) => {
  if (!title || typeof title !== 'string') return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // remove punctuation (colons, hyphens, quotes, parentheses, etc.)
    .replace(/\s+/g, ' ');   // collapse multiple whitespaces into a single space
};

export const titlesMatch = (title1, title2) => {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);

  if (!norm1 || !norm2) return false;
  if (norm1 === norm2) return true;

  // Substring matching for titles longer than 3 characters
  if (norm1.length >= 4 && norm2.length >= 4) {
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  }

  return false;
};
