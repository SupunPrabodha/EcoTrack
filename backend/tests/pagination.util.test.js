import { normalizePagination, pagesFromTotal } from "../src/utils/pagination.js";

test("normalizePagination clamps and computes skip", () => {
  expect(normalizePagination({ page: 1, limit: 10 })).toEqual({ page: 1, limit: 10, skip: 0 });
  expect(normalizePagination({ page: 2, limit: 10 })).toEqual({ page: 2, limit: 10, skip: 10 });

  // clamps
  expect(normalizePagination({ page: 0, limit: 0 })).toEqual({ page: 1, limit: 1, skip: 0 });
  expect(normalizePagination({ page: "abc", limit: "xyz" })).toEqual({ page: 1, limit: 10, skip: 0 });
  expect(normalizePagination({ page: 999999999, limit: 9999, maxLimit: 50 })).toEqual({
    page: 1000000,
    limit: 50,
    skip: (1000000 - 1) * 50,
  });
});

test("pagesFromTotal returns expected pages", () => {
  expect(pagesFromTotal(0, 10)).toBe(0);
  expect(pagesFromTotal(1, 10)).toBe(1);
  expect(pagesFromTotal(10, 10)).toBe(1);
  expect(pagesFromTotal(11, 10)).toBe(2);
  expect(pagesFromTotal(NaN, 10)).toBe(0);
  expect(pagesFromTotal(10, 0)).toBe(0);
});
