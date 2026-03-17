import { mockCategories } from "../../data/data.js";
import { requestJson } from "./httpClient.js";

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

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

function getCollectionItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function normalizeCategories(categories) {
  return categories
    .map((category) => normalizeCategory(category))
    .filter(Boolean);
}

function buildCategoriesQueryString(params = {}) {
  const searchParams = new URLSearchParams();
  const supportedParams = [
    ["search", params.search],
    ["status", params.status],
    ["parent_id", params.parent_id],
    ["has_children", params.has_children],
    ["sort", params.sort],
    ["page", params.page],
    ["per_page", params.per_page],
  ];

  supportedParams.forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `/api/categories?${queryString}` : "/api/categories";
}

function buildPaginationFromMeta(meta = {}, fallbackCount = 0, params = {}) {
  const requestedPage = Number(params.page || 1);
  const requestedPerPage = Number(
    params.per_page || meta.per_page || fallbackCount || 15,
  );

  return {
    page: Number(meta.current_page || requestedPage),
    lastPage: Number(meta.last_page || (fallbackCount > 0 ? 1 : requestedPage)),
    perPage: Number(meta.per_page || requestedPerPage),
    total: Number(meta.total || fallbackCount),
  };
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
    clone(mockCategories).map((category) => normalizeCategory(category)),
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
