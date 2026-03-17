import {
  renderCatalogEmptyState,
  renderCatalogProducts,
} from "../components/productComponents.js";
import { getCatalogProducts } from "../services/productService.js";
import { formatPrice } from "../utils/formatters.js";
import { renderStars } from "../utils/ratingUtils.js";

const SEARCH_DEBOUNCE_DELAY = 300;

function getPageElements() {
  return {
    searchForm: document.querySelector(".js-search-form"),
    searchInput: document.querySelector(".js-search-input"),
    productList: document.querySelector(".js-product-list"),
    productCount: document.querySelector(".js-product-count"),
  };
}

function updateProductCount(element, count, searchTerm = "") {
  if (!element) {
    return;
  }

  const label = count === 1 ? "product" : "products";
  const trimmedSearchTerm = String(searchTerm || "").trim();

  element.textContent = trimmedSearchTerm
    ? `Showing ${count} ${label} for "${trimmedSearchTerm}"`
    : `Showing ${count} ${label}`;
}

function navigateToProduct(productId) {
  window.location.href = `product.html?id=${encodeURIComponent(productId)}`;
}

function debounce(callback, delay) {
  let timeoutId = null;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

function createCatalogRenderer(elements) {
  return (products, searchTerm = "") => {
    updateProductCount(elements.productCount, products.length, searchTerm);

    if (products.length === 0) {
      renderCatalogEmptyState(elements.productList, "No products found");
      return;
    }

    renderCatalogProducts(elements.productList, products, {
      formatPrice,
      renderStars,
    });
  };
}

function bindProductNavigation(productList) {
  productList.addEventListener("click", (event) => {
    const productLink = event.target.closest(".js-product-link");

    if (!productLink) {
      return;
    }

    event.preventDefault();

    const { productId } = productLink.dataset;
    if (productId) {
      navigateToProduct(productId);
    }
  });
}

function createProductLoader(elements) {
  const renderCatalog = createCatalogRenderer(elements);
  let activeRequestController = null;

  return async (searchTerm = "") => {
    if (activeRequestController) {
      activeRequestController.abort();
    }

    activeRequestController = new AbortController();

    try {
      const products = await getCatalogProducts(searchTerm, {
        signal: activeRequestController.signal,
      });

      renderCatalog(products, searchTerm);
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      console.error("Failed to load catalog products.", error);
      updateProductCount(elements.productCount, 0, searchTerm);
      renderCatalogEmptyState(elements.productList, "No products found");
    }
  };
}

export function initIndexPage() {
  const elements = getPageElements();

  if (!elements.searchForm || !elements.searchInput || !elements.productList) {
    return;
  }

  bindProductNavigation(elements.productList);

  const loadProducts = createProductLoader(elements);
  const debouncedSearch = debounce((searchTerm) => {
    loadProducts(searchTerm);
  }, SEARCH_DEBOUNCE_DELAY);

  elements.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loadProducts(elements.searchInput.value);
  });

  elements.searchInput.addEventListener("input", (event) => {
    debouncedSearch(event.target.value);
  });

  loadProducts();
}

document.addEventListener("DOMContentLoaded", () => {
  initIndexPage();
});