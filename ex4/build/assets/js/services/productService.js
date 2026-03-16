import { mockProducts } from "../../data/data.js";

const DEFAULT_API_ORIGIN = "https://api.vanannek.blog";

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function getApiOrigin() {
  const configuredOrigin = document
    .querySelector('meta[name="shop-api-base-url"]')
    ?.getAttribute("content")
    ?.trim();

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (window.location.port === "8000") {
    return window.location.origin;
  }

  return DEFAULT_API_ORIGIN;
}

function buildApiUrl(path) {
  return new URL(
    path.replace(/^\//, ""),
    `${getApiOrigin().replace(/\/$/, "")}/`,
  );
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

  const pricing = product.pricing || product.price || {};
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
    rating: Number(product.rating || 0),
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

async function requestJson(path) {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
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

// Service shape mirrors production API usage and can switch to fetch later.
export async function getProducts() {
  try {
    const payload = await requestJson("/api/products?per_page=100");
    return getCollectionItems(payload).map((product) =>
      normalizeProduct(product),
    );
  } catch (error) {
    console.error(
      "Failed to load products from API. Falling back to mock data.",
      error,
    );
    return clone(getMockProductList());
  }
}

async function getProductDetailByIdentifier(identifier) {
  const payload = await requestJson(
    `/api/products/${encodeURIComponent(identifier)}`,
  );
  return normalizeProduct(getSingleItem(payload));
}

export async function getProductById(id) {
  const productId = String(id || "").trim();

  if (!productId) {
    return null;
  }

  try {
    return await getProductDetailByIdentifier(productId);
  } catch (error) {
    if (error.status && error.status !== 404) {
      throw error;
    }
  }

  const products = await getProducts();
  const matchedProduct = products.find((product) => product.id === productId);

  if (!matchedProduct) {
    return null;
  }

  if (!matchedProduct.slug) {
    return matchedProduct;
  }

  try {
    return await getProductDetailByIdentifier(matchedProduct.slug);
  } catch (error) {
    console.error(
      "Failed to load product detail by slug. Falling back to list data.",
      error,
    );
    return matchedProduct;
  }
}
