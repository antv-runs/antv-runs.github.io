import {
  renderCatalogEmptyState,
  renderCatalogProducts,
} from "../components/productComponents.js";
import { getProducts } from "../services/productService.js";
import { formatPrice } from "../utils/formatters.js";
import { renderStars } from "../utils/ratingUtils.js";

const SEARCH_DEBOUNCE_DELAY = 300;
const PRODUCTS_PER_PAGE = 9;
const MOBILE_FILTER_BREAKPOINT = 768;

/**
 * STATE MANAGEMENT
 * ================
 * Single source of truth for UI state.
 * Why? Prevents inconsistencies when multiple events (search, pagination) modify state.
 * Ensures: same state values trigger same API params → reproducible behavior.
 */
function createAppState() {
  return {
    searchKeyword: "",
    categoryId: null,
    currentPage: 1,
    lastPage: 1,
    totalCount: 0,
    perPage: 12,
  };
}

function getPageElements() {
  return {
    searchForm: document.querySelector(".js-search-form"),
    searchInput: document.querySelector(".js-search-input"),
    productList: document.querySelector(".js-product-list"),
    productCount: document.querySelector(".js-product-count"),
    filterSidebar: document.querySelector(".js-catalog-filters"),
    filterToggle: document.querySelector(".js-filter-toggle"),
    filterClose: document.querySelector(".js-filter-close"),
    // Pagination elements
    paginationPrev: document.querySelector(".js-pagination-prev"),
    paginationNext: document.querySelector(".js-pagination-next"),
    paginationNumbers: document.querySelector(".js-pagination-numbers"),
  };
}

function updateProductCount(element, state, searchKeyword = "") {
  if (!element) {
    return;
  }

  const { currentPage = 1, totalCount = 0, perPage = 12 } = state || {};

  const safePage = Math.max(1, Number(currentPage) || 1);
  const safePerPage = Math.max(1, Number(perPage) || 12);
  const safeTotalCount = Math.max(0, Number(totalCount) || 0);
  const label = safeTotalCount === 1 ? "product" : "products";
  const start = safeTotalCount === 0 ? 0 : (safePage - 1) * safePerPage + 1;
  const end = Math.min(safePage * safePerPage, safeTotalCount);
  const trimmedKeyword = String(searchKeyword || "").trim();
  const suffix = trimmedKeyword ? ` for "${trimmedKeyword}"` : "";

  element.textContent = `Showing ${start}-${end} of ${safeTotalCount} ${label}${suffix}`;
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

/**
 * FETCH PRODUCTS
 * ==============
 * Calls API with current state values.
 * Returns: { products, pagination } or null on error.
 * Logs response structure for debugging.
 */
async function fetchProducts(state) {
  try {
    console.log("[API] Fetching products with params:", {
      search: state.searchKeyword || "(empty)",
      category_id: state.categoryId || "(empty)",
      page: state.currentPage,
      per_page: PRODUCTS_PER_PAGE,
    });

    const response = await getProducts({
      search: state.searchKeyword || undefined,
      category_id: state.categoryId || undefined,
      page: state.currentPage,
      per_page: PRODUCTS_PER_PAGE,
    });

    // Log response structure for debugging
    console.log("[API] Response structure:", {
      productsCount: response.products?.length || 0,
      paginationData: response.pagination,
      hasLinks: !!response.links,
    });

    return response;
  } catch (error) {
    console.error("[API] Error fetching products:", error);
    return null;
  }
}

/**
 * RENDER PRODUCTS
 * ===============
 * Updates product list and count.
 */
function renderProducts(elements, apiResponse, state) {
  if (!elements.productList || !apiResponse) {
    return;
  }

  const { products } = apiResponse;

  updateProductCount(elements.productCount, state, state.searchKeyword);

  if (products.length === 0) {
    renderCatalogEmptyState(elements.productList, "No products found");
    return;
  }

  renderCatalogProducts(elements.productList, products, {
    formatPrice,
    renderStars,
  });
}

/**
 * RENDER PAGINATION
 * =================
 * Updates pagination UI and button states.
 * Generates page numbers with ellipsis for large page counts.
 */
function renderPagination(elements, state) {
  const { currentPage, lastPage } = state;

  if (!elements.paginationNumbers) {
    return;
  }

  // Clear and rebuild page numbers
  elements.paginationNumbers.innerHTML = "";

  for (let i = 1; i <= lastPage; i++) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "catalog-pagination__number js-pagination-number";
    button.textContent = i;
    button.dataset.page = i;

    if (i === currentPage) {
      button.classList.add("catalog-pagination__number--active");
    }

    elements.paginationNumbers.appendChild(button);

    // Add ellipsis after 3rd page if many pages exist
    if (i === 3 && lastPage > 4) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "...";
      elements.paginationNumbers.appendChild(ellipsis);
      i = lastPage - 1; // Jump near the end
    }
  }

  // Update button states
  if (elements.paginationPrev) {
    elements.paginationPrev.disabled = currentPage === 1;
  }

  if (elements.paginationNext) {
    elements.paginationNext.disabled = currentPage === lastPage;
  }
}

/**
 * HANDLE PAGE LOAD
 * ================
 * Main function: Update state → Fetch API → Render UI.
 * Called on: initial load, search, pagination.
 */
async function handlePageLoad(elements, state) {
  const apiResponse = await fetchProducts(state);

  if (apiResponse) {
    const { pagination } = apiResponse;

    // Update state from API response
    state.currentPage = pagination.page || 1;
    state.lastPage = pagination.lastPage || 1;
    state.totalCount = pagination.total || 0;
    state.perPage = Number(pagination.perPage || state.perPage || 12);

    // Render UI
    renderProducts(elements, apiResponse, state);
    renderPagination(elements, state);
  } else {
    // Fallback: show error state
    updateProductCount(elements.productCount, state, state.searchKeyword);
    renderCatalogEmptyState(elements.productList, "Error loading products");
    renderPagination(elements, state);
  }
}

function bindProductNavigation(elements) {
  const productList = elements.productList;
  if (!productList) {
    return;
  }

  productList.addEventListener("click", (event) => {
    const productLink = event.target.closest(".js-product-link");

    if (!productLink) {
      return;
    }

    event.preventDefault();

    const { productId } = productLink.dataset;
    if (productId) {
      window.location.href = `product.html?id=${encodeURIComponent(productId)}`;
    }
  });
}

function bindFilterToggle(elements) {
  if (
    !elements.filterSidebar ||
    !elements.filterToggle ||
    !elements.filterClose
  ) {
    return;
  }

  const closeFilters = () => {
    elements.filterSidebar.classList.remove("is-open");
    elements.filterToggle.setAttribute("aria-expanded", "false");
  };

  const openFilters = () => {
    elements.filterSidebar.classList.add("is-open");
    elements.filterToggle.setAttribute("aria-expanded", "true");
  };

  elements.filterToggle.addEventListener("click", () => {
    const isOpen = elements.filterSidebar.classList.contains("is-open");
    if (isOpen) {
      closeFilters();
      return;
    }

    openFilters();
  });

  elements.filterClose.addEventListener("click", closeFilters);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeFilters();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > MOBILE_FILTER_BREAKPOINT) {
      closeFilters();
    }
  });
}

function bindFilterAccordion(elements) {
  const filterSidebar = elements.filterSidebar;

  if (!filterSidebar) {
    return;
  }

  const setAccordionState = (section, isOpen) => {
    const toggle = section.querySelector(".js-filter-accordion-toggle");
    const content = section.querySelector(".js-filter-accordion-content");

    if (!toggle || !content) {
      return;
    }

    section.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    content.setAttribute("aria-hidden", String(!isOpen));
    content.inert = !isOpen;
  };

  filterSidebar.querySelectorAll(".js-filter-section").forEach((section) => {
    if (!section.querySelector(".js-filter-accordion-toggle")) {
      return;
    }

    setAccordionState(section, section.classList.contains("is-open"));
  });

  filterSidebar.addEventListener("click", (event) => {
    const toggle = event.target.closest(".js-filter-accordion-toggle");

    if (!toggle || !filterSidebar.contains(toggle)) {
      return;
    }

    const section = toggle.closest(".js-filter-section");

    if (!section) {
      return;
    }

    setAccordionState(section, !section.classList.contains("is-open"));
  });
}

/**
 * BIND EVENTS
 * ===========
 * Attach event listeners for search, pagination, and filter toggle.
 * All events update state → trigger handlePageLoad().
 */
function bindEvents(elements, state) {
  // Search form submission
  if (elements.searchForm) {
    elements.searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const newSearchTerm = (elements.searchInput?.value || "").trim();

      if (newSearchTerm !== state.searchKeyword) {
        state.searchKeyword = newSearchTerm;
        state.currentPage = 1; // Reset pagination on search
        handlePageLoad(elements, state);
      }
    });
  }

  // Search input with debounce
  if (elements.searchInput) {
    const debouncedSearch = debounce((value) => {
      const newSearchTerm = (value || "").trim();

      if (newSearchTerm !== state.searchKeyword) {
        state.searchKeyword = newSearchTerm;
        state.currentPage = 1; // Reset pagination on search
        handlePageLoad(elements, state);
      }
    }, SEARCH_DEBOUNCE_DELAY);

    elements.searchInput.addEventListener("input", (event) => {
      debouncedSearch(event.target.value);
    });
  }

  // Pagination: Previous button
  if (elements.paginationPrev) {
    elements.paginationPrev.addEventListener("click", () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        handlePageLoad(elements, state);

        // Scroll to top of product list
        if (elements.productList) {
          elements.productList.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  }

  // Pagination: Next button
  if (elements.paginationNext) {
    elements.paginationNext.addEventListener("click", () => {
      if (state.currentPage < state.lastPage) {
        state.currentPage++;
        handlePageLoad(elements, state);

        // Scroll to top of product list
        if (elements.productList) {
          elements.productList.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  }

  // Pagination: Page number clicks
  if (elements.paginationNumbers) {
    elements.paginationNumbers.addEventListener("click", (event) => {
      const pageButton = event.target.closest(".js-pagination-number");

      if (pageButton && pageButton.dataset.page) {
        const newPage = Number(pageButton.dataset.page);

        if (newPage !== state.currentPage) {
          state.currentPage = newPage;
          handlePageLoad(elements, state);

          // Scroll to top of product list
          if (elements.productList) {
            elements.productList.scrollIntoView({ behavior: "smooth" });
          }
        }
      }
    });
  }
}

export function initIndexPage() {
  const elements = getPageElements();
  const state = createAppState();

  // Validate required elements
  if (!elements.searchForm || !elements.searchInput || !elements.productList) {
    console.error("[INIT] Required DOM elements not found");
    return;
  }

  // Setup UI interactions
  bindProductNavigation(elements);
  bindFilterToggle(elements);
  bindFilterAccordion(elements);
  bindEvents(elements, state);

  // Load products on page load
  handlePageLoad(elements, state);
}

document.addEventListener("DOMContentLoaded", () => {
  initIndexPage();
});
