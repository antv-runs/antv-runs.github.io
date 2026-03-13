import { mockReviews } from "../../data/data.js";

const MIN_DELAY = 220;
const MAX_DELAY = 900;

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

// Later replacement example: fetch(`/api/products/${productId}/reviews`)
export function getReviewsByProductId(productId) {
  const reviews = mockReviews.filter((item) => item.productId === productId);
  return resolveWithDelay(reviews);
}
