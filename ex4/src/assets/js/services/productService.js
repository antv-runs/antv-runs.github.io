import { mockProducts } from "../../data/data.js";

const MIN_DELAY = 250;
const MAX_DELAY = 850;

function randomDelay() {
  return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function resolveWithDelay(data) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(clone(data)), randomDelay());
  });
}

// Service shape mirrors production API usage and can switch to fetch later.
export function getProducts() {
  const productList = mockProducts.map((product) => ({
    id: product.id,
    name: product.name,
    categoryId: product.categoryId,
    rating: product.rating,
    reviewCount: product.reviewCount,
    price: product.price,
    thumbnail: product.thumbnail || product.images?.[0]?.url || "",
    thumbnailAlt:
      product.thumbnailAlt || product.images?.[0]?.alt || product.name,
  }));

  return resolveWithDelay(productList);
}

// Later replacement example: fetch(`/api/products/${id}`)
export function getProductById(id) {
  const product = mockProducts.find((item) => item.id === id) || null;
  return resolveWithDelay(product);
}
