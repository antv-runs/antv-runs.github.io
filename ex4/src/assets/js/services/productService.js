import { mockProducts } from "../../data/data.js";
import { getApiOrigin, requestJson } from "./httpClient.js";

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function normalizeImageUrl(imageUrl) {
  if (!imageUrl) {
    return "";
  }

  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("data:") ||
    imageUrl.startsWith("~/")
  ) {
    return imageUrl;
  }

  try {
    return new URL(
      imageUrl,
      `${getApiOrigin().replace(/\/$/, "")}/`,
    ).toString();
  } catch {
    return imageUrl;
  }
}

function normalizeProductImage(image, index, productName) {
  const imageUrl = image?.image_url || image?.url || "";

  return {
    id: String(image?.id || `image-${index + 1}`),
    image_url: normalizeImageUrl(imageUrl),
    url: normalizeImageUrl(imageUrl),
    alt_text:
      image?.alt_text ||
      image?.alt ||
      productName ||
      `Product image ${index + 1}`,
    alt:
      image?.alt_text ||
      image?.alt ||
      productName ||
      `Product image ${index + 1}`,
  };
}

function normalizeProduct(product) {
  if (!product) {
    return null;
  }

  const pricing =
    product.pricing ||
    (typeof product.price === "object"
      ? product.price
      : {
          current: product.price,
          original: product.compare_price,
          currency: product.currency || "USD",
        });
  const images = Array.isArray(product.images)
    ? product.images.map((image, index) =>
        normalizeProductImage(image, index, product.name),
      )
    : [];
  const thumbnail = normalizeImageUrl(
    product.thumbnail || images[0]?.image_url || images[0]?.url || "",
  );
  const categoryName = product.category?.name;

  return {
    ...product,
    id: String(product.id),
    slug: product.slug || null,
    description: product.description || "",
    details: product.details || product.description || "",
    pricing: {
      currency: pricing.currency || "USD",
      current: Number(pricing.current || 0),
      original:
        pricing.original === null || pricing.original === undefined
          ? null
          : Number(pricing.original),
      discountPercent:
        pricing.discountPercent === null ||
        pricing.discountPercent === undefined
          ? null
          : Number(pricing.discountPercent),
    },
    price: {
      currency: pricing.currency || "USD",
      current: Number(pricing.current || 0),
      original:
        pricing.original === null || pricing.original === undefined
          ? null
          : Number(pricing.original),
      discountPercent:
        pricing.discountPercent === null ||
        pricing.discountPercent === undefined
          ? null
          : Number(pricing.discountPercent),
    },
    thumbnail,
    thumbnailAlt: product.thumbnailAlt || product.name || "Product image",
    images,
    rating: Number(product.rating ?? product.rating_avg ?? 0),
    reviewCount: Number(product.reviewCount || 0),
    breadcrumb:
      product.breadcrumb ||
      [
        "Home",
        "Shop",
        ...(categoryName ? [categoryName] : []),
        product.name,
      ].filter(Boolean),
    faqs: Array.isArray(product.faqs) ? product.faqs : [],
    relatedProductIds: Array.isArray(product.relatedProductIds)
      ? product.relatedProductIds.map(String)
      : [],
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

function getSingleItem(payload) {
  return payload?.data || payload || null;
}

function getMockProductList() {
  return mockProducts.map((product) => normalizeProduct(product));
}

function normalizeProducts(products) {
  return products.map((product) => normalizeProduct(product)).filter(Boolean);
}

function buildProductsQueryString(params = {}) {
  const searchParams = new URLSearchParams();
  const supportedParams = [
    ["search", params.search],
    ["category_id", params.category_id],
    ["min_price", params.min_price],
    ["max_price", params.max_price],
    ["colors", params.colors],
    ["sizes", params.sizes],
    ["style", params.style],
    ["status", params.status],
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
  return queryString ? `/api/products?${queryString}` : "/api/products";
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

function buildProductsResult(payload, params = {}) {
  const products = normalizeProducts(getCollectionItems(payload));

  return {
    products,
    pagination: buildPaginationFromMeta(payload?.meta, products.length, params),
    links: payload?.links || {},
  };
}

function filterMockProducts(products, params = {}) {
  const normalizedSearch = String(params.search || "")
    .trim()
    .toLowerCase();
  const normalizedCategoryId =
    params.category_id === undefined || params.category_id === null
      ? null
      : String(params.category_id);

  return products.filter((product) => {
    const matchesSearch =
      !normalizedSearch ||
      String(product.name || "")
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesCategory =
      !normalizedCategoryId ||
      String(product.category?.id || "") === normalizedCategoryId;

    return matchesSearch && matchesCategory;
  });
}

function buildMockProductsResult(params = {}) {
  const allProducts = filterMockProducts(clone(getMockProductList()), params);
  const page = Number(params.page || 1);
  const perPage = Number(params.per_page || allProducts.length || 15);
  const startIndex = Math.max(page - 1, 0) * perPage;
  const products = allProducts.slice(startIndex, startIndex + perPage);
  const total = allProducts.length;
  const lastPage = total === 0 ? 1 : Math.ceil(total / perPage);

  return {
    products,
    pagination: {
      page,
      lastPage,
      perPage,
      total,
    },
    links: {},
  };
}

function buildCatalogRequestPath(searchTerm = "") {
  const trimmedSearchTerm = String(searchTerm || "").trim();

  if (!trimmedSearchTerm) {
    return "/api/products";
  }

  const searchParams = new URLSearchParams({
    search: trimmedSearchTerm,
  });

  return `/api/products?${searchParams.toString()}`;
}

export async function getCatalogProducts(searchTerm = "", options = {}) {
  const result = await getProducts(
    {
      search: searchTerm,
    },
    options,
  );

  return result.products;
}

// Service shape mirrors production API usage and can switch to fetch later.
export async function getProducts(params = {}, options = {}) {
  const shouldFallbackToMock = options.allowMockFallback !== false;

  try {
    const payload = await requestJson(buildProductsQueryString(params), {
      signal: options.signal,
    });
    return buildProductsResult(payload, params);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    if (!shouldFallbackToMock) {
      throw error;
    }

    console.error(
      "Failed to load products from API. Falling back to mock data.",
      error,
    );
    return buildMockProductsResult(params);
  }
}

async function getProductDetailByIdentifier(identifier, options = {}) {
  const payload = await requestJson(
    `/api/products/${encodeURIComponent(identifier)}`,
    {
      signal: options.signal,
    },
  );
  return normalizeProduct(getSingleItem(payload));
}

export async function getProductById(id, options = {}) {
  const productId = String(id || "").trim();

  if (!productId) {
    return null;
  }

  try {
    return await getProductDetailByIdentifier(productId, options);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    if (error.status && error.status !== 404) {
      throw error;
    }
  }

  const productsResult = await getProducts({}, options);
  const matchedProduct = productsResult.products.find(
    (product) => product.id === productId,
  );

  if (!matchedProduct) {
    return null;
  }

  if (!matchedProduct.slug) {
    return matchedProduct;
  }

  try {
    return await getProductDetailByIdentifier(matchedProduct.slug, options);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    console.error(
      "Failed to load product detail by slug. Falling back to list data.",
      error,
    );
    return matchedProduct;
  }
}
