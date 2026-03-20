import { mockCategories } from "../../data/data.js";
import { requestJson } from "./httpClient.js";
import {
  buildPaginationFromMeta,
  buildQueryPath,
  cloneData,
  getCollectionItems,
} from "./serviceUtils.js";

function normalizeCategory(category) {
  if (!category) {
    return null;
  }

  const hasChildren =
    category.hasChildren !== undefined
      ? Boolean(category.hasChildren)
      : category.has_children !== undefined
        ? Boolean(category.has_children)
        : Boolean(category.children_count);

  return {
    ...category,
    id: String(category.id),
    name: category.name || "",
    description: category.description || "",
    status: category.status || "active",
    parentId:
      category.parent_id === null || category.parent_id === undefined
        ? null
        : String(category.parent_id),
    parent_id:
      category.parent_id === null || category.parent_id === undefined
        ? null
        : String(category.parent_id),
    hasChildren,
    has_children: hasChildren,
    children_count: Number(category.children_count || 0),
  };
}

function normalizeCategories(categories) {
  return categories
    .map((category) => normalizeCategory(category))
    .filter(Boolean);
}

function buildCategoriesQueryString(params = {}) {
  const supportedParams = [
    ["search", params.search],
    ["status", params.status],
    ["parent_id", params.parent_id],
    ["has_children", params.has_children],
    ["sort", params.sort],
    ["page", params.page],
    ["per_page", params.per_page],
  ];

  return buildQueryPath("/api/categories", supportedParams);
}

function buildCategoriesResult(payload, params = {}) {
  const categories = normalizeCategories(getCollectionItems(payload));

  return {
    categories,
    pagination: buildPaginationFromMeta(
      payload?.meta,
      categories.length,
      params,
    ),
    links: payload?.links || {},
  };
}

function filterMockCategories(categories, params = {}) {
  const normalizedSearch = String(params.search || "")
    .trim()
    .toLowerCase();

  return categories.filter((category) => {
    const matchesSearch =
      !normalizedSearch ||
      String(category.name || "")
        .toLowerCase()
        .includes(normalizedSearch);

    return matchesSearch;
  });
}

function buildMockCategoriesResult(params = {}) {
  const allCategories = filterMockCategories(
    cloneData(mockCategories).map((category) => normalizeCategory(category)),
    params,
  );
  const page = Number(params.page || 1);
  const perPage = Number(params.per_page || allCategories.length || 15);
  const startIndex = Math.max(page - 1, 0) * perPage;
  const categories = allCategories.slice(startIndex, startIndex + perPage);
  const total = allCategories.length;
  const lastPage = total === 0 ? 1 : Math.ceil(total / perPage);

  return {
    categories,
    pagination: {
      page,
      lastPage,
      perPage,
      total,
    },
    links: {},
  };
}

// Service shape mirrors production API usage and can switch to fetch later.
export async function getCategories(params = {}, options = {}) {
  try {
    const payload = await requestJson(buildCategoriesQueryString(params), {
      signal: options.signal,
    });
    return buildCategoriesResult(payload, params);
  } catch (error) {
    console.error(
      "Failed to load categories from API. Falling back to mock data.",
      error,
    );
    return buildMockCategoriesResult(params);
  }
}
