const AUTO_LINK_STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "to", "of", "in",
  "for", "on", "with", "at", "by", "from", "as", "into", "through",
  "during", "before", "after", "above", "below", "between", "under",
  "again", "further", "then", "once", "here", "there", "when", "where",
  "why", "how", "all", "each", "few", "more", "most", "other", "some",
  "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
  "very", "just", "and", "but", "if", "or", "because", "until", "while",
  "this", "that", "these", "those", "it", "its",
]);

export function buildAutoLinkQuery(
  text: string,
  maxTerms = 10,
): string | undefined {
  const terms = text
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .filter((word) => !AUTO_LINK_STOP_WORDS.has(word))
    .filter((word) => word !== "or" && word !== "and");

  const uniqueTerms = [...new Set(terms)].slice(0, maxTerms);
  if (uniqueTerms.length === 0) {
    return undefined;
  }

  // Use plain whitespace-separated terms. LocalStore.recall() already builds
  // the FTS query operators; passing raw "OR" tokens here creates invalid SQL.
  return uniqueTerms.join(" ");
}
