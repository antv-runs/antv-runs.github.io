import {
  renderCatalogEmptyState,
  renderCatalogProducts,
} from "../components/productComponents.js";
import { getCategories } from "../services/categoryService.js";
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
    categoryName: null,
    currentPage: 1,
    lastPage: 1,
    totalCount: 0,
    perPage: 12,
    // Committed filter values (set when Apply Filter is clicked)
    minPrice: null,
    maxPrice: null,
    colors: [],
    sizes: [],
    dressStyle: null,
  };
}

function createFilterState() {
  return {
    categoryId: null,
    categoryName: null,
    minPrice: null,
    maxPrice: null,
    colors: [],
    sizes: [],
    dressStyle: null,
  };
}

function getPageElements() {
  return {
    searchForm: document.querySelector(".js-search-form"),
    searchInput: document.querySelector(".js-search-input"),
    breadcrumb: document.querySelector(".catalog__breadcrumb"),
    catalogTitle: document.querySelector(".catalog-products__title"),
    productList: document.querySelector(".js-product-list"),
    productCount: document.querySelector(".js-product-count"),
    filterSidebar: document.querySelector(".js-catalog-filters"),
    filterToggle: document.querySelector(".js-filter-toggle"),
    filterClose: document.querySelector(".js-filter-close"),
    filtersOverlay: document.querySelector(".js-filters-overlay"),
    priceRangeMin: document.querySelector(".js-price-range-min"),
    priceRangeMax: document.querySelector(".js-price-range-max"),
    priceRangeProgress: document.querySelector(".js-price-range-progress"),
    priceRangeMinValue: document.querySelector(".js-price-range-min-value"),
    priceRangeMaxValue: document.querySelector(".js-price-range-max-value"),
    categoryList: document.querySelector(".js-category-list"),
    applyFilterButton: document.querySelector(".js-apply-filter"),
    // Pagination elements
    paginationPrev: document.querySelector(".js-pagination-prev"),
    paginationNext: document.querySelector(".js-pagination-next"),
    paginationNumbers: document.querySelector(".js-pagination-numbers"),
  };
}

function createBreadcrumbListItem(content, isCurrentPage = false) {
  const item = document.createElement("li");

  if (isCurrentPage) {
    item.setAttribute("aria-current", "page");
    item.textContent = content;
    return item;
  }

  const link = document.createElement("a");
  link.href = "#";
  link.textContent = content;
  item.appendChild(link);

  return item;
}

function updateCatalogHeader(elements, categoryName = null) {
  const title = String(categoryName || "").trim() || "All Products";

  if (elements.catalogTitle) {
    elements.catalogTitle.textContent = title;
  }

  if (!elements.breadcrumb) {
    return;
  }

  elements.breadcrumb.replaceChildren(
    createBreadcrumbListItem("Home"),
    createBreadcrumbListItem(title, true),
  );
}

function renderCategoryItems(container, categories, selectedCategoryId) {
  if (!container) {
    return;
  }

  if (!Array.isArray(categories) || categories.length === 0) {
    container.innerHTML =
      '<li><button type="button" class="catalog-filters__item" disabled>No categories available</button></li>';
    return;
  }

  container.innerHTML = categories
    .map((category) => {
      const categoryId = String(category.id || "").trim();
      const isActive =
        selectedCategoryId !== null &&
        selectedCategoryId !== undefined &&
        String(selectedCategoryId) === categoryId;
      const activeClass = isActive ? " is-active" : "";
      const label = String(category.name || "").trim() || "Unnamed category";

      return `<li><button type="button" class="catalog-filters__item js-category-button${activeClass}" data-category-id="${categoryId}" aria-pressed="${isActive}">${label}</button></li>`;
    })
    .join("");
}

async function loadCategories(elements, state) {
  if (!elements.categoryList) {
    return;
  }

  try {
    const response = await getCategories({ per_page: 5 });
    const categories = Array.isArray(response?.categories)
      ? response.categories
      : [];

    if (categories.length === 0) {
      console.warn("[API] No categories returned from API.");
    }

    renderCategoryItems(elements.categoryList, categories, state.categoryId);
  } catch (error) {
    console.warn("[API] Failed to fetch categories.", error);
    renderCategoryItems(elements.categoryList, [], state.categoryId);
  }
}

function bindCategoryFilter(elements, filterState) {
  if (!elements.categoryList) {
    return;
  }

  elements.categoryList.addEventListener("click", (event) => {
    const categoryButton = event.target.closest("button[data-category-id]");

    if (!categoryButton || !elements.categoryList.contains(categoryButton)) {
      return;
    }

    const selectedCategoryId = String(
      categoryButton.dataset.categoryId || "",
    ).trim();

    if (!selectedCategoryId) {
      return;
    }

    // Toggle: clicking the active category deselects it
    if (selectedCategoryId === filterState.categoryId) {
      filterState.categoryId = null;
      filterState.categoryName = null;
    } else {
      filterState.categoryId = selectedCategoryId;
      filterState.categoryName = categoryButton.textContent.trim() || null;
    }

    elements.categoryList
      .querySelectorAll("button[data-category-id]")
      .forEach((button) => {
        const isActive = button.dataset.categoryId === filterState.categoryId;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
  });
}

function bindPriceRangeSlider(elements, filterState) {
  const minInput = elements.priceRangeMin;
  const maxInput = elements.priceRangeMax;
  const progress = elements.priceRangeProgress;
  const minValue = elements.priceRangeMinValue;
  const maxValue = elements.priceRangeMaxValue;

  if (!minInput || !maxInput || !progress || !minValue || !maxValue) {
    return;
  }

  const minLimit = Number(minInput.min) || 0;
  const maxLimit = Number(minInput.max) || 100;
  const rangeSize = maxLimit - minLimit || 1;
  const minGap = Number(minInput.step) || 1;

  const renderRange = (source) => {
    let min = Number(minInput.value);
    let max = Number(maxInput.value);

    if (source === "min" && min > max - minGap) {
      min = max - minGap;
    }

    if (source === "max" && max < min + minGap) {
      max = min + minGap;
    }

    min = Math.max(minLimit, Math.min(min, maxLimit - minGap));
    max = Math.min(maxLimit, Math.max(max, minLimit + minGap));

    minInput.value = String(min);
    maxInput.value = String(max);

    const leftPercent = ((min - minLimit) / rangeSize) * 100;
    const rightPercent = 100 - ((max - minLimit) / rangeSize) * 100;

    progress.style.left = `${leftPercent}%`;
    progress.style.right = `${rightPercent}%`;

    minValue.textContent = `$${min}`;
    maxValue.textContent = `$${max}`;

    if (filterState) {
      filterState.minPrice = min;
      filterState.maxPrice = max;
    }
  };

  minInput.addEventListener("input", () => {
    renderRange("min");
  });

  maxInput.addEventListener("input", () => {
    renderRange("max");
  });

  renderRange();
}

function bindColorFilter(elements, filterState) {
  if (!elements.filterSidebar) {
    return;
  }

  elements.filterSidebar.addEventListener("click", (event) => {
    const colorButton = event.target.closest(".js-color-button");

    if (!colorButton || !elements.filterSidebar.contains(colorButton)) {
      return;
    }

    const color = (colorButton.dataset.color || "").toLowerCase();
    if (!color) {
      return;
    }

    const index = filterState.colors.indexOf(color);
    const isNowActive = index === -1;

    if (isNowActive) {
      filterState.colors.push(color);
    } else {
      filterState.colors.splice(index, 1);
    }

    colorButton.classList.toggle("catalog-filters__color--active", isNowActive);
  });
}

function bindSizeFilter(elements, filterState) {
  if (!elements.filterSidebar) {
    return;
  }

  elements.filterSidebar.addEventListener("click", (event) => {
    const sizeButton = event.target.closest(".js-size-button");

    if (!sizeButton || !elements.filterSidebar.contains(sizeButton)) {
      return;
    }

    const size = (sizeButton.dataset.size || "").trim();
    if (!size) {
      return;
    }

    const index = filterState.sizes.indexOf(size);
    const isNowActive = index === -1;

    if (isNowActive) {
      filterState.sizes.push(size);
    } else {
      filterState.sizes.splice(index, 1);
    }

    sizeButton.classList.toggle("is-active", isNowActive);
  });
}

function bindDressStyleFilter(elements, filterState) {
  if (!elements.filterSidebar) {
    return;
  }

  elements.filterSidebar.addEventListener("click", (event) => {
    const styleLink = event.target.closest(".js-dress-style-item");

    if (!styleLink || !elements.filterSidebar.contains(styleLink)) {
      return;
    }

    event.preventDefault();

    const style = (styleLink.dataset.style || "").toLowerCase();
    if (!style) {
      return;
    }

    // Toggle: clicking the active style deselects it
    filterState.dressStyle = style === filterState.dressStyle ? null : style;

    elements.filterSidebar
      .querySelectorAll(".js-dress-style-item")
      .forEach((item) => {
        const isActive =
          (item.dataset.style || "").toLowerCase() === filterState.dressStyle;
        item.classList.toggle("is-active", isActive);
      });
  });
}

function bindApplyFilter(elements, state, filterState) {
  if (!elements.applyFilterButton) {
    return;
  }

  const button = elements.applyFilterButton;
  const applyText = button.querySelector(".catalog-filters__apply-text");

  const closeFilters = () => {
    if (elements.filterSidebar) {
      elements.filterSidebar.classList.remove("is-open");
    }
    if (elements.filterToggle) {
      elements.filterToggle.setAttribute("aria-expanded", "false");
    }
    if (elements.filtersOverlay) {
      elements.filtersOverlay.classList.remove("is-open");
    }
    document.body.style.overflow = "";
  };

  const setLoading = (isLoading) => {
    button.disabled = isLoading;
    button.classList.toggle("is-loading", isLoading);
    if (applyText) {
      applyText.textContent = isLoading ? "Applying..." : "Apply Filter";
    }
  };

  button.addEventListener("click", async () => {
    if (button.disabled) {
      return;
    }

    // Commit pending filterState into appState
    state.categoryId = filterState.categoryId;
    state.categoryName = filterState.categoryName;
    state.minPrice = filterState.minPrice;
    state.maxPrice = filterState.maxPrice;
    state.colors = [...filterState.colors];
    state.sizes = [...filterState.sizes];
    state.dressStyle = filterState.dressStyle;
    state.currentPage = 1;

    updateCatalogHeader(elements, state.categoryName);

    setLoading(true);
    try {
      await handlePageLoad(elements, state);
      // Close filters after successfully applying them
      closeFilters();
    } finally {
      setLoading(false);
    }
  });
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
    const params = {
      search: state.searchKeyword || undefined,
      category_id: state.categoryId || undefined,
      min_price: state.minPrice || undefined,
      max_price: state.maxPrice || undefined,
      colors: state.colors?.length ? state.colors.join(",") : undefined,
      sizes: state.sizes?.length ? state.sizes.join(",") : undefined,
      style: state.dressStyle || undefined,
      page: state.currentPage,
      per_page: PRODUCTS_PER_PAGE,
    };

    console.log("[API] Fetching products with params:", params);

    const response = await getProducts(params);

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
    
    // Hide overlay
    if (elements.filtersOverlay) {
      elements.filtersOverlay.classList.remove("is-open");
    }
    
    // Restore body scroll
    document.body.style.overflow = "";
  };

  const openFilters = () => {
    elements.filterSidebar.classList.add("is-open");
    elements.filterToggle.setAttribute("aria-expanded", "true");
    
    // Show overlay
    if (elements.filtersOverlay) {
      elements.filtersOverlay.classList.add("is-open");
    }
    
    // Prevent body scroll
    document.body.style.overflow = "hidden";
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

  // Close on overlay click
  if (elements.filtersOverlay) {
    elements.filtersOverlay.addEventListener("click", (event) => {
      if (event.target === elements.filtersOverlay) {
        closeFilters();
      }
    });
  }

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
  const filterState = createFilterState();

  // Validate required elements
  if (!elements.searchForm || !elements.searchInput || !elements.productList) {
    console.error("[INIT] Required DOM elements not found");
    return;
  }

  // Setup UI interactions
  bindProductNavigation(elements);
  bindFilterToggle(elements);
  bindFilterAccordion(elements);
  bindPriceRangeSlider(elements, filterState);
  bindCategoryFilter(elements, filterState);
  bindColorFilter(elements, filterState);
  bindSizeFilter(elements, filterState);
  bindDressStyleFilter(elements, filterState);
  bindApplyFilter(elements, state, filterState);
  bindEvents(elements, state);

  updateCatalogHeader(elements, state.categoryName);
  loadCategories(elements, state);

  // Load products on page load
  handlePageLoad(elements, state);
}

document.addEventListener("DOMContentLoaded", () => {
  initIndexPage();
});
