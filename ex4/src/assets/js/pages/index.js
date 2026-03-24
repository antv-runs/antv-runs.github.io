import { initHeader } from "../components/header.js";
import {
  renderCatalogEmptyState,
  renderCatalogProducts,
  renderProductSkeleton,
} from "../components/productComponents.js";
import { getCategories } from "../services/categoryService.js";
import { getProducts } from "../services/productService.js";
import { formatPrice } from "../utils/formatters.js";
import { renderStars } from "../utils/ratingUtils.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGINATION = {
  productsPerPage: 9,
  defaultPerPage: 12,
  defaultPage: 1,
};

const BREAKPOINT = {
  mobileFilter: 768,
};

const LOAD_TYPES = {
  initial: "initial",
  refresh: "refresh",
};

const UI_TEXT = {
  allProducts: "All Products",
  noProducts: "No products found",
  errorLoading: "Error loading products",
  applying: "Applying...",
  applyFilter: "Apply Filter",
  noCategories: "No categories available",
  unnamedCategory: "Unnamed category",
  defaultProduct: "product",
  defaultProducts: "products",
};

const CSS_CLASSES = {
  open: "is-open",
  active: "is-active",
  loading: "is-loading",
  navigating: "is-navigating",
  gridLoading: "catalog-products__grid--loading",
  gridRefreshing: "catalog-products__grid--refreshing",
  paginationActive: "catalog-pagination__number--active",
  colorActive: "catalog-filters__color--active",
  paginationNumber: "catalog-pagination__number",
  categoryPlaceholder: "catalog-filters__item--placeholder",
  categoryItem: "catalog-filters__item",
  accordionOpen: "is-open",
};

const SELECTORS = {
  productList: ".js-product-list",
  productCount: ".js-product-count",
  categoryList: ".js-category-list",
  categoryButton: ".js-category-button",
  colorButton: ".js-color-button",
  sizeButton: ".js-size-button",
  dressStyleItem: ".js-dress-style-item",
  paginationPrev: ".js-pagination-prev",
  paginationNext: ".js-pagination-next",
  paginationNumbers: ".js-pagination-numbers",
  paginationNumber: ".js-pagination-number",
  productLink: ".js-product-link",
  productCard: ".js-product-card",
  filterSidebar: ".js-catalog-filters",
  filterToggle: ".js-filter-toggle",
  filterClose: ".js-filter-close",
  filtersOverlay: ".js-filters-overlay",
  priceRangeMin: ".js-price-range-min",
  priceRangeMax: ".js-price-range-max",
  priceRangeProgress: ".js-price-range-progress",
  priceRangeMinValue: ".js-price-range-min-value",
  priceRangeMaxValue: ".js-price-range-max-value",
  applyFilterButton: ".js-apply-filter",
  applyFilterText: ".catalog-filters__apply-text",
  breadcrumb: ".catalog__breadcrumb",
  catalogTitle: ".catalog-products__title",
  filterSection: ".js-filter-section",
  filterAccordionToggle: ".js-filter-accordion-toggle",
  filterAccordionContent: ".js-filter-accordion-content",
  categoryButtonSelector: "button[data-category-id]",
};

const LOG_PREFIX = {
  api: "[API]",
  init: "[INIT]",
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * APPLICATION STATE
 * Unified state object for products and pagination.
 * Tracks loading flags, request token, and current filters.
 */
function createAppState() {
  return {
    searchKeyword: "",
    categoryId: null,
    categoryName: null,
    currentPage: PAGINATION.defaultPage,
    lastPage: PAGINATION.defaultPage,
    totalCount: 0,
    perPage: PAGINATION.defaultPerPage,
    minPrice: null,
    maxPrice: null,
    colors: [],
    sizes: [],
    dressStyle: null,
    isInitialLoading: false,
    isRefreshing: false,
    productRequestToken: 0,
  };
}

/**
 * FILTER STATE
 * Stores pending filter selections until "Apply Filter" is clicked.
 */
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Guard: Check if any loading operation is in progress.
 */
function isLoadingInProgress(state) {
  return state.isInitialLoading || state.isRefreshing;
}

/**
 * Scroll product list into view with smooth behavior.
 */
function scrollToProductList(elements) {
  if (elements.productList) {
    elements.productList.scrollIntoView({ behavior: "smooth" });
  }
}

/**
 * Set aria-attribute to string of boolean value.
 */
function setAriaBool(element, attr, value) {
  if (element) {
    element.setAttribute(attr, String(Boolean(value)));
  }
}

/**
 * Open filter drawer: update UI, manage overlay, prevent scroll.
 */
function openFilterDrawer(elements) {
  if (elements.filterSidebar) {
    elements.filterSidebar.classList.add(CSS_CLASSES.open);
  }
  setAriaBool(elements.filterToggle, "aria-expanded", true);
  if (elements.filtersOverlay) {
    elements.filtersOverlay.classList.add(CSS_CLASSES.open);
  }
  document.body.style.overflow = "hidden";
}

/**
 * Close filter drawer: update UI, manage overlay, restore scroll.
 */
function closeFilterDrawer(elements) {
  if (elements.filterSidebar) {
    elements.filterSidebar.classList.remove(CSS_CLASSES.open);
  }
  setAriaBool(elements.filterToggle, "aria-expanded", false);
  if (elements.filtersOverlay) {
    elements.filtersOverlay.classList.remove(CSS_CLASSES.open);
  }
  document.body.style.overflow = "";
}

// ============================================================================
// LOADING STATE MANAGEMENT
// ============================================================================

function setCatalogLoadingState(elements, state, loadType) {
  const isInitial = loadType === LOAD_TYPES.initial;
  const isRefresh = loadType === LOAD_TYPES.refresh;

  if (isInitial) {
    state.isInitialLoading = true;
    state.isRefreshing = false;
    if (elements.productList) {
      elements.productList.setAttribute("aria-busy", "true");
      renderProductSkeleton(elements.productList, PAGINATION.productsPerPage);
      elements.productList.classList.add(CSS_CLASSES.gridLoading);
    }
  } else if (isRefresh) {
    state.isRefreshing = true;
    if (elements.productList) {
      elements.productList.setAttribute("aria-busy", "true");
      elements.productList.classList.add(CSS_CLASSES.gridRefreshing);
    }
  }

  setControlsDisabled(elements, state, true);
}

function clearCatalogLoadingState(elements, state) {
  state.isInitialLoading = false;
  state.isRefreshing = false;

  if (elements.productList) {
    elements.productList.setAttribute("aria-busy", "false");
    elements.productList.classList.remove(
      CSS_CLASSES.gridLoading,
      CSS_CLASSES.gridRefreshing,
    );
  }

  setControlsDisabled(elements, state, false);
}

function setControlsDisabled(elements, state, isDisabled) {
  const shouldDisable = Boolean(isDisabled);
  const pageButtons = elements.paginationNumbers?.querySelectorAll(
    SELECTORS.paginationNumber,
  );

  if (elements.headerApi) {
    elements.headerApi.setSearchDisabled(shouldDisable);
  }

  if (shouldDisable) {
    if (elements.paginationPrev) {
      elements.paginationPrev.disabled = true;
    }
    if (elements.paginationNext) {
      elements.paginationNext.disabled = true;
    }
    pageButtons?.forEach((button) => {
      button.disabled = true;
    });
    if (elements.applyFilterButton) {
      elements.applyFilterButton.disabled = true;
    }
    return;
  }

  if (elements.paginationPrev) {
    elements.paginationPrev.disabled =
      state.currentPage === PAGINATION.defaultPage;
  }

  if (elements.paginationNext) {
    elements.paginationNext.disabled = state.currentPage === state.lastPage;
  }

  pageButtons?.forEach((button) => {
    button.disabled = false;
  });

  if (
    elements.applyFilterButton &&
    !elements.applyFilterButton.classList.contains(CSS_CLASSES.loading)
  ) {
    elements.applyFilterButton.disabled = false;
  }
}

// ============================================================================
// DOM ELEMENT RETRIEVAL
// ============================================================================

function getPageElements() {
  return {
    breadcrumb: document.querySelector(SELECTORS.breadcrumb),
    catalogTitle: document.querySelector(SELECTORS.catalogTitle),
    productList: document.querySelector(SELECTORS.productList),
    productCount: document.querySelector(SELECTORS.productCount),
    filterSidebar: document.querySelector(SELECTORS.filterSidebar),
    filterToggle: document.querySelector(SELECTORS.filterToggle),
    filterClose: document.querySelector(SELECTORS.filterClose),
    filtersOverlay: document.querySelector(SELECTORS.filtersOverlay),
    priceRangeMin: document.querySelector(SELECTORS.priceRangeMin),
    priceRangeMax: document.querySelector(SELECTORS.priceRangeMax),
    priceRangeProgress: document.querySelector(SELECTORS.priceRangeProgress),
    priceRangeMinValue: document.querySelector(SELECTORS.priceRangeMinValue),
    priceRangeMaxValue: document.querySelector(SELECTORS.priceRangeMaxValue),
    categoryList: document.querySelector(SELECTORS.categoryList),
    applyFilterButton: document.querySelector(SELECTORS.applyFilterButton),
    paginationPrev: document.querySelector(SELECTORS.paginationPrev),
    paginationNext: document.querySelector(SELECTORS.paginationNext),
    paginationNumbers: document.querySelector(SELECTORS.paginationNumbers),
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
  const title = String(categoryName || "").trim() || UI_TEXT.allProducts;

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

  container.classList.remove(CSS_CLASSES.gridLoading);
  container.setAttribute("aria-busy", "false");

  if (!Array.isArray(categories) || categories.length === 0) {
    container.innerHTML = `<li><button type="button" class="${CSS_CLASSES.categoryItem} ${CSS_CLASSES.categoryPlaceholder}" disabled>${UI_TEXT.noCategories}</button></li>`;
    return;
  }

  container.innerHTML = categories
    .map((category) => {
      const categoryId = String(category.id || "").trim();
      const isActive =
        selectedCategoryId !== null &&
        selectedCategoryId !== undefined &&
        String(selectedCategoryId) === categoryId;
      const activeClass = isActive ? ` ${CSS_CLASSES.active}` : "";
      const label =
        String(category.name || "").trim() || UI_TEXT.unnamedCategory;

      return `<li><button type="button" class="${CSS_CLASSES.categoryItem} js-category-button${activeClass}" data-category-id="${categoryId}" aria-pressed="${isActive}">${label}</button></li>`;
    })
    .join("");
}

function renderCategoryPlaceholders(container, count = 5) {
  if (!container) {
    return;
  }

  const safeCount = Math.max(1, Number(count) || 5);
  container.classList.add(CSS_CLASSES.gridLoading);
  container.setAttribute("aria-busy", "true");
  container.innerHTML = Array.from({ length: safeCount }, () => {
    return `<li><button type="button" class="${SELECTORS.categoryButton} ${CSS_CLASSES.categoryPlaceholder}" disabled aria-hidden="true"><span class="catalog-filters__placeholder-line"></span></button></li>`;
  }).join("");
}

async function loadCategories(elements, state) {
  if (!elements.categoryList) {
    return;
  }

  renderCategoryPlaceholders(elements.categoryList, 5);

  try {
    const response = await getCategories({ per_page: 5 });
    const categories = Array.isArray(response?.categories)
      ? response.categories
      : [];

    if (categories.length === 0) {
      console.warn(`${LOG_PREFIX.api} No categories returned from API.`);
    }

    renderCategoryItems(elements.categoryList, categories, state.categoryId);
  } catch (error) {
    console.warn(`${LOG_PREFIX.api} Failed to fetch categories.`, error);
    renderCategoryItems(elements.categoryList, [], state.categoryId);
  }
}

function bindCategoryFilter(elements, filterState) {
  if (!elements.categoryList) {
    return;
  }

  elements.categoryList.addEventListener("click", (event) => {
    const categoryButton = event.target.closest(SELECTORS.categoryButton);

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
      .querySelectorAll(SELECTORS.categoryButton)
      .forEach((button) => {
        const isActive = button.dataset.categoryId === filterState.categoryId;
        button.classList.toggle(CSS_CLASSES.active, isActive);
        setAriaBool(button, "aria-pressed", isActive);
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
    const colorButton = event.target.closest(SELECTORS.colorButton);

    if (!colorButton || !elements.filterSidebar.contains(colorButton)) {
      return;
    }

    const color = (colorButton.dataset.color || "").toLowerCase();
    if (!color) {
      return;
    }

    const isNowActive = !colorButton.classList.contains(CSS_CLASSES.active);
    colorButton.classList.toggle(CSS_CLASSES.colorActive, isNowActive);
    colorButton.classList.toggle(CSS_CLASSES.active, isNowActive);
    setAriaBool(colorButton, "aria-pressed", isNowActive);

    filterState.colors = Array.from(
      elements.filterSidebar.querySelectorAll(
        `${SELECTORS.colorButton}.${CSS_CLASSES.active}`,
      ),
    )
      .map((button) => String(button.dataset.color || "").toLowerCase())
      .filter(Boolean);
  });
}

function bindSizeFilter(elements, filterState) {
  if (!elements.filterSidebar) {
    return;
  }

  elements.filterSidebar.addEventListener("click", (event) => {
    const sizeButton = event.target.closest(SELECTORS.sizeButton);

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

    sizeButton.classList.toggle(CSS_CLASSES.active, isNowActive);
  });
}

function bindDressStyleFilter(elements, filterState) {
  if (!elements.filterSidebar) {
    return;
  }

  elements.filterSidebar.addEventListener("click", (event) => {
    const styleLink = event.target.closest(SELECTORS.dressStyleItem);

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
      .querySelectorAll(SELECTORS.dressStyleItem)
      .forEach((item) => {
        const isActive =
          (item.dataset.style || "").toLowerCase() === filterState.dressStyle;
        item.classList.toggle(CSS_CLASSES.active, isActive);
      });
  });
}

function bindApplyFilter(elements, state, filterState) {
  if (!elements.applyFilterButton) {
    return;
  }

  const button = elements.applyFilterButton;
  const applyText = button.querySelector(SELECTORS.applyFilterText);

  const setApplyButtonLoading = (isLoading) => {
    button.disabled = isLoading;
    button.classList.toggle(CSS_CLASSES.loading, isLoading);
    if (applyText) {
      applyText.textContent = isLoading
        ? UI_TEXT.applying
        : UI_TEXT.applyFilter;
    }
  };

  button.addEventListener("click", async () => {
    if (button.disabled || state.isInitialLoading || state.isRefreshing) {
      return;
    }

    state.categoryId = filterState.categoryId;
    state.categoryName = filterState.categoryName;
    state.minPrice = filterState.minPrice;
    state.maxPrice = filterState.maxPrice;
    state.colors = [...filterState.colors];
    state.sizes = [...filterState.sizes];
    state.dressStyle = filterState.dressStyle;
    state.currentPage = PAGINATION.defaultPage;

    updateCatalogHeader(elements, state.categoryName);

    setApplyButtonLoading(true);
    try {
      await handlePageLoad(elements, state, LOAD_TYPES.refresh);
      closeFilterDrawer(elements);
    } finally {
      setApplyButtonLoading(false);
    }
  });
}

function updateProductCount(element, state, searchKeyword = "") {
  if (!element) {
    return;
  }

  const {
    currentPage = PAGINATION.defaultPage,
    totalCount = 0,
    perPage = PAGINATION.defaultPerPage,
  } = state || {};

  const safePage = Math.max(
    PAGINATION.defaultPage,
    Number(currentPage) || PAGINATION.defaultPage,
  );
  const safePerPage = Math.max(
    PAGINATION.defaultPage,
    Number(perPage) || PAGINATION.defaultPerPage,
  );
  const safeTotalCount = Math.max(0, Number(totalCount) || 0);
  const label =
    safeTotalCount === 1 ? UI_TEXT.defaultProduct : UI_TEXT.defaultProducts;
  const start = safeTotalCount === 0 ? 0 : (safePage - 1) * safePerPage + 1;
  const end = Math.min(safePage * safePerPage, safeTotalCount);
  const trimmedKeyword = String(searchKeyword || "").trim();
  const suffix = trimmedKeyword ? ` for "${trimmedKeyword}"` : "";

  element.textContent = `Showing ${start}-${end} of ${safeTotalCount} ${label}${suffix}`;
}

/**
 * FETCH PRODUCTS WITH REQUEST TOKEN GUARD
 * Returns response or null on error/stale request.
 */
async function fetchProducts(state, requestToken) {
  try {
    const params = {
      search: state.searchKeyword || undefined,
      category_id: state.categoryId || undefined,
      min_price: state.minPrice !== null ? state.minPrice : undefined,
      max_price: state.maxPrice !== null ? state.maxPrice : undefined,
      colors: state.colors?.length ? state.colors.join(",") : undefined,
      sizes: state.sizes?.length ? state.sizes.join(",") : undefined,
      style: state.dressStyle || undefined,
      page: state.currentPage,
      per_page: PAGINATION.productsPerPage,
    };

    console.log(`${LOG_PREFIX.api} Fetching products with params:`, params);

    const response = await getProducts(params);

    if (requestToken !== state.productRequestToken) {
      console.log(
        `${LOG_PREFIX.api} Ignoring stale response (token mismatch)`,
        requestToken,
        "!=",
        state.productRequestToken,
      );
      return null;
    }

    console.log(`${LOG_PREFIX.api} Response structure:`, {
      productsCount: response.products?.length || 0,
      paginationData: response.pagination,
      hasLinks: !!response.links,
    });

    return response;
  } catch (error) {
    console.error(`${LOG_PREFIX.api} Error fetching products:`, error);
    return null;
  }
}

/**
 * RENDER PRODUCTS
 */
function renderProducts(elements, apiResponse, state) {
  if (!elements.productList || !apiResponse) {
    return;
  }

  const { products } = apiResponse;

  updateProductCount(elements.productCount, state, state.searchKeyword);

  if (products.length === 0) {
    renderCatalogEmptyState(elements.productList, UI_TEXT.noProducts);
    return;
  }

  renderCatalogProducts(elements.productList, products, {
    formatPrice,
    renderStars,
  });
}

/**
 * RENDER PAGINATION
 */
function renderPagination(elements, state) {
  const { currentPage, lastPage } = state;
  const isLoading = Boolean(state.isInitialLoading || state.isRefreshing);

  if (!elements.paginationNumbers) {
    return;
  }

  elements.paginationNumbers.innerHTML = "";

  for (let i = PAGINATION.defaultPage; i <= lastPage; i++) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${CSS_CLASSES.paginationNumber} ${SELECTORS.paginationNumber}`;
    button.textContent = i;
    button.dataset.page = i;
    button.disabled = isLoading;

    if (i === currentPage) {
      button.classList.add(CSS_CLASSES.paginationActive);
    }

    elements.paginationNumbers.appendChild(button);

    // Add ellipsis after page 3 if many pages exist
    if (i === 3 && lastPage > 4) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "...";
      elements.paginationNumbers.appendChild(ellipsis);
      i = lastPage - 1;
    }
  }

  if (elements.paginationPrev) {
    elements.paginationPrev.disabled =
      isLoading || currentPage === PAGINATION.defaultPage;
  }

  if (elements.paginationNext) {
    elements.paginationNext.disabled = isLoading || currentPage === lastPage;
  }
}

// ============================================================================
// PAGE LOAD ORCHESTRATION
// ============================================================================

/**
 * HANDLE PAGE LOAD
 * Main orchestrator: Update state → Set loading → Fetch API → Render UI.
 * Called on: initial load, search, filter apply, pagination.
 */
async function handlePageLoad(elements, state, loadType = LOAD_TYPES.refresh) {
  state.productRequestToken += 1;
  const requestToken = state.productRequestToken;

  setCatalogLoadingState(elements, state, loadType);

  try {
    const apiResponse = await fetchProducts(state, requestToken);

    if (requestToken !== state.productRequestToken) {
      return;
    }

    if (apiResponse) {
      const { pagination } = apiResponse;

      state.currentPage = pagination.page || PAGINATION.defaultPage;
      state.lastPage = pagination.lastPage || PAGINATION.defaultPage;
      state.totalCount = pagination.total || 0;
      state.perPage = Number(
        pagination.perPage || state.perPage || PAGINATION.defaultPerPage,
      );

      renderProducts(elements, apiResponse, state);
      renderPagination(elements, state);
    } else {
      updateProductCount(elements.productCount, state, state.searchKeyword);
      renderCatalogEmptyState(elements.productList, UI_TEXT.errorLoading);
      renderPagination(elements, state);
    }
  } finally {
    if (requestToken === state.productRequestToken) {
      clearCatalogLoadingState(elements, state);
    }
  }
}

// ============================================================================
// EVENT BINDING
// ============================================================================

function bindProductNavigation(elements) {
  const productList = elements.productList;
  if (!productList) {
    return;
  }

  productList.addEventListener("click", (event) => {
    const productLink = event.target.closest(SELECTORS.productLink);

    if (!productLink) {
      return;
    }

    const productCard = productLink.closest(SELECTORS.productCard);
    if (productCard?.classList.contains(CSS_CLASSES.navigating)) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    if (productCard) {
      productCard.classList.add(CSS_CLASSES.navigating);
      productCard.setAttribute("aria-busy", "true");
    }

    const href = productLink.getAttribute("href");
    const productId = String(productLink.dataset.productId || "").trim();
    const targetUrl =
      (href && href !== "#" && href) ||
      (productId ? `product.html?id=${encodeURIComponent(productId)}` : "");

    if (!targetUrl) {
      if (productCard) {
        productCard.classList.remove(CSS_CLASSES.navigating);
        productCard.setAttribute("aria-busy", "false");
      }
      return;
    }

    window.requestAnimationFrame(() => {
      window.location.href = targetUrl;
    });
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

  elements.filterToggle.addEventListener("click", () => {
    const isOpen = elements.filterSidebar.classList.contains(CSS_CLASSES.open);
    if (isOpen) {
      closeFilterDrawer(elements);
    } else {
      openFilterDrawer(elements);
    }
  });

  elements.filterClose.addEventListener("click", () => {
    closeFilterDrawer(elements);
  });

  if (elements.filtersOverlay) {
    elements.filtersOverlay.addEventListener("click", (event) => {
      if (event.target === elements.filtersOverlay) {
        closeFilterDrawer(elements);
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeFilterDrawer(elements);
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > BREAKPOINT.mobileFilter) {
      closeFilterDrawer(elements);
    }
  });
}

function bindFilterAccordion(elements) {
  const filterSidebar = elements.filterSidebar;

  if (!filterSidebar) {
    return;
  }

  const setAccordionState = (section, isOpen) => {
    const toggle = section.querySelector(SELECTORS.filterAccordionToggle);
    const content = section.querySelector(SELECTORS.filterAccordionContent);

    if (!toggle || !content) {
      return;
    }

    section.classList.toggle(CSS_CLASSES.accordionOpen, isOpen);
    setAriaBool(toggle, "aria-expanded", isOpen);
    content.setAttribute("aria-hidden", String(!isOpen));
    content.inert = !isOpen;
  };

  filterSidebar.querySelectorAll(SELECTORS.filterSection).forEach((section) => {
    if (!section.querySelector(SELECTORS.filterAccordionToggle)) {
      return;
    }

    setAccordionState(
      section,
      section.classList.contains(CSS_CLASSES.accordionOpen),
    );
  });

  filterSidebar.addEventListener("click", (event) => {
    const toggle = event.target.closest(SELECTORS.filterAccordionToggle);

    if (!toggle || !filterSidebar.contains(toggle)) {
      return;
    }

    const section = toggle.closest(SELECTORS.filterSection);

    if (!section) {
      return;
    }

    setAccordionState(
      section,
      !section.classList.contains(CSS_CLASSES.accordionOpen),
    );
  });
}

/**
 * BIND PAGINATION EVENTS
 * Handles prev/next/page-number clicks with state guards and scroll.
 */
function bindEvents(elements, state) {
  if (elements.paginationPrev) {
    elements.paginationPrev.addEventListener("click", () => {
      if (
        isLoadingInProgress(state) ||
        state.currentPage <= PAGINATION.defaultPage
      ) {
        return;
      }

      state.currentPage -= 1;
      handlePageLoad(elements, state, LOAD_TYPES.refresh);
      scrollToProductList(elements);
    });
  }

  if (elements.paginationNext) {
    elements.paginationNext.addEventListener("click", () => {
      if (isLoadingInProgress(state) || state.currentPage >= state.lastPage) {
        return;
      }

      state.currentPage += 1;
      handlePageLoad(elements, state, LOAD_TYPES.refresh);
      scrollToProductList(elements);
    });
  }

  if (elements.paginationNumbers) {
    elements.paginationNumbers.addEventListener("click", (event) => {
      const pageButton = event.target.closest(SELECTORS.paginationNumber);

      if (isLoadingInProgress(state) && pageButton && pageButton.dataset.page) {
        return;
      }

      if (pageButton && pageButton.dataset.page) {
        const newPage = Number(pageButton.dataset.page);

        if (newPage !== state.currentPage) {
          state.currentPage = newPage;
          handlePageLoad(elements, state, LOAD_TYPES.refresh);
          scrollToProductList(elements);
        }
      }
    });
  }
}

export function initIndexPage() {
  const elements = getPageElements();
  const state = createAppState();
  const filterState = createFilterState();

  // -----------------------------------------------
  // 1. VALIDATE REQUIRED DOM ELEMENTS
  // -----------------------------------------------
  if (!elements.productList) {
    console.error(`${LOG_PREFIX.init} Required DOM elements not found`);
    return;
  }

  // -----------------------------------------------
  // 2. INITIALIZE HEADER
  // -----------------------------------------------
  elements.headerApi = initHeader({
    onSearch: (keyword) => {
      // Guard: skip if loading
      if (isLoadingInProgress(state)) {
        return;
      }

      const newSearchTerm = (keyword || "").trim();

      if (newSearchTerm !== state.searchKeyword) {
        state.searchKeyword = newSearchTerm;
        state.currentPage = PAGINATION.defaultPage; // Reset pagination on search
        handlePageLoad(elements, state, LOAD_TYPES.refresh);
      }
    },
  });

  // -----------------------------------------------
  // 3. SETUP UI INTERACTIONS (FILTERS & PAGINATION)
  // -----------------------------------------------
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

  // -----------------------------------------------
  // 4. RENDER HEADER & LOAD CATEGORIES
  // -----------------------------------------------
  updateCatalogHeader(elements, state.categoryName);
  loadCategories(elements, state);

  // -----------------------------------------------
  // 5. LOAD INITIAL PRODUCT PAGE
  // -----------------------------------------------
  handlePageLoad(elements, state, LOAD_TYPES.initial);
}

document.addEventListener("DOMContentLoaded", () => {
  initIndexPage();
});
