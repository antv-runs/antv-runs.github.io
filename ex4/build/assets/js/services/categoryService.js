import { mockCategories } from "../../data/data.js";

const MIN_DELAY = 150;
const MAX_DELAY = 600;

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

// Later replacement example: fetch('/api/categories')
export function getCategories() {
  return resolveWithDelay(mockCategories);
}
