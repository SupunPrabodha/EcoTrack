function clampInt(n, { min, max, fallback }) {
  const x = Number.parseInt(String(n), 10);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(Math.max(x, min), max);
}

export function normalizePagination({ page, limit, maxLimit = 100, defaultLimit = 10 } = {}) {
  const normalizedPage = clampInt(page ?? 1, { min: 1, max: 1_000_000, fallback: 1 });
  const normalizedLimit = clampInt(limit ?? defaultLimit, { min: 1, max: maxLimit, fallback: defaultLimit });
  const skip = (normalizedPage - 1) * normalizedLimit;
  return { page: normalizedPage, limit: normalizedLimit, skip };
}

export function pagesFromTotal(total, limit) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.ceil(total / limit);
}
