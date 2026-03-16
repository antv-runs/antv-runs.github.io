import * as productService from "../services/productService.js";
import * as categoryService from "../services/categoryService.js";
import * as reviewService from "../services/reviewService.js";
import {
  renderCategories,
  renderBreadcrumb,
  renderImageGallery,
  renderProductInfo,
  renderFaqs,
  renderColorOptions,
  renderSizeOptions,
  renderRelatedProducts,
} from "../components/productComponents.js";
import { createRelatedProductsCarousel } from "../components/relatedProductsCarousel.js";
import { renderReviewsList } from "../components/reviewComponents.js";
import { formatPrice, formatDate } from "../utils/formatters.js";
import { setText, normalizeQuantity } from "../utils/domUtils.js";
import { renderStars } from "../utils/ratingUtils.js";
import { getQueryParam } from "../utils/queryParams.js";
import { CART_STORAGE_KEY } from "../constants/storageKeys.js";

const state = {
  categories: [],
  products: [],
  selectedProductId: null,
  selectedColorId: null,
  selectedSizeId: null,
  reviews: [],
  reviewFilter: "All",
  reviewSort: "latest",
  reviewPage: 1,
  reviewPageSize: 6,
};

const dom = {
  navCategories: document.querySelector(".js-nav-categories"),
  breadcrumbList: document.querySelector(".js-breadcrumb-list"),
  productGallery: document.querySelector(".js-product-gallery"),
  productMainImage: document.querySelector(".js-product-main-image"),
  productTitle: document.querySelector(".js-product-title"),
  productRatingStars: document.querySelector(".js-product-rating-stars"),
  productRatingText: document.querySelector(".js-product-rating-text"),
  productPriceCurrent: document.querySelector(".js-product-price"),
  productPriceOld: document.querySelector(".js-product-original-price"),
  productPriceDiscount: document.querySelector(".js-product-discount"),
  productDescription: document.querySelector(".js-product-description"),
  productColorOptions: document.querySelector(".js-product-color-options"),
  productSizeOptions: document.querySelector(".js-product-size-options"),
  quantityInput: document.querySelector(".js-quantity-input"),
  productDetailsContent: document.querySelector(".js-product-details-content"),
  productFaqsList: document.querySelector(".js-product-faqs-list"),
  reviewsCount: document.querySelector(".js-reviews-count"),
  reviewsList: document.querySelector(".js-reviews-list"),
  reviewsSortSelect: document.querySelector(".js-reviews-sort-select"),
  reviewsLoadMore: document.querySelector(".js-reviews-load-more"),
  reviewsFilterBtn: document.querySelector(".js-btn-filter-by-stars"),
  reviewsFilterDropdown: document.querySelector(".js-dropdown-filter-by-stars"),
  reviewsFilterOptions: document.querySelectorAll(".js-reviews__filter-option"),
  relatedProductsRoot: document.querySelector(".js-related-products"),
  relatedProductsViewport: document.querySelector(".js-related-viewport"),
  relatedProductsTrack: document.querySelector(".js-related-track"),
  otherProductsList: document.querySelector(".js-other-products__list"),
  otherProductsPrev: document.querySelector(".js-other-products__prev"),
  otherProductsNext: document.querySelector(".js-other-products__next"),
  productTabs: document.querySelectorAll(".js-tabs__tab"),
  productTabContents: document.querySelectorAll(".js-products-tabs__content"),
  addToCartButton: document.querySelector(".js-add-to-cart"),
  cartButton: document.querySelector(".js-cart-button"),
};

let relatedProductsCarousel = null;

const helpers = {
  formatPrice,
  formatDate,
  renderStars,
};

function sortedReviews(reviews) {
  const items = [...reviews];

  if (state.reviewSort === "latest") {
    items.sort((first, second) => new Date(second.date) - new Date(first.date));
  } else if (state.reviewSort === "oldest") {
    items.sort((first, second) => new Date(first.date) - new Date(second.date));
  } else if (state.reviewSort === "highest") {
    items.sort((first, second) => second.ratingStar - first.ratingStar);
  }

  return items;
}

function filteredReviews(reviews) {
  if (state.reviewFilter === "All") {
    return reviews;
  }

  return reviews.filter(
    (review) => Math.floor(review.ratingStar) === Number(state.reviewFilter),
  );
}

function getVisibleReviews() {
  const filtered = filteredReviews(sortedReviews(state.reviews));
  const maxItems = state.reviewPage * state.reviewPageSize;
  const visibleItems = filtered.slice(0, maxItems);

  return {
    visibleItems,
    hasMore: visibleItems.length < filtered.length,
  };
}

function renderReviewsSection() {
  const { visibleItems, hasMore } = getVisibleReviews();
  renderReviewsList(dom.reviewsList, visibleItems, helpers);
  dom.reviewsLoadMore.style.display = hasMore ? "inline-block" : "none";
}

function getCurrentRelatedProducts(product) {
  if (!product.relatedProductIds || product.relatedProductIds.length === 0) {
    return state.products.filter((item) => item.id !== product.id).slice(0, 8);
  }

  return product.relatedProductIds
    .map((relatedId) =>
      state.products.find((item) => item.id === String(relatedId)),
    )
    .filter(Boolean);
}

function syncProductUrl(productId) {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("id", productId);
  window.history.replaceState({}, "", nextUrl);
}

function resetProductSections(message) {
  relatedProductsCarousel?.destroy();
  relatedProductsCarousel = null;
  setText(dom.productTitle, message);
  setText(dom.productPriceCurrent, "");
  setText(dom.productPriceOld, "");
  setText(dom.productPriceDiscount, "");
  setText(dom.productDescription, "");
  setText(dom.productDetailsContent, "");
  if (dom.productRatingText) {
    dom.productRatingText.innerHTML = "0/<span>5</span>";
  }
  dom.productRatingStars.innerHTML = "";
  dom.productGallery.innerHTML = "";
  dom.productMainImage.removeAttribute("src");
  dom.productFaqsList.innerHTML = "";
  dom.otherProductsList.innerHTML = "";
  dom.reviewsList.innerHTML = "";
  setText(dom.reviewsCount, "(0)");
}

function getStoredCartItems() {
  try {
    const rawValue = localStorage.getItem(CART_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map((item) => ({
        id: String(item?.id || "").trim(),
        quantity: Math.max(1, Number(item?.quantity) || 1),
      }))
      .filter((item) => item.id);
  } catch {
    return [];
  }
}

function persistCartItems(items) {
  const serializableItems = items.map((item) => ({
    id: String(item.id),
    quantity: Math.max(1, Number(item.quantity) || 1),
  }));

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(serializableItems));
}

function toCartItem(product, quantity) {
  return {
    id: String(product.id),
    quantity,
  };
}

function addProductToCart(product, quantityToAdd = 1) {
  if (!product?.id) {
    return;
  }

  const quantity = Math.max(1, Number(quantityToAdd) || 1);
  const cartItems = getStoredCartItems();
  const existingItem = cartItems.find(
    (item) => String(item.id) === String(product.id),
  );

  if (existingItem) {
    existingItem.quantity = Math.max(
      1,
      Number(existingItem.quantity || 0) + quantity,
    );
  } else {
    cartItems.push(toCartItem(product, quantity));
  }

  persistCartItems(cartItems);
}

function triggerAddToCartFeedback(button) {
  if (!button) {
    return;
  }

  button.classList.remove("is-added");
  button.offsetWidth;
  button.classList.add("is-added");

  const clearFeedback = () => {
    button.classList.remove("is-added");
  };

  button.addEventListener("animationend", clearFeedback, { once: true });
  window.setTimeout(clearFeedback, 320);
}

function bindStaticEvents() {
  dom.cartButton?.addEventListener("click", () => {
    window.location.href = "cart.html";
  });

  dom.productTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      dom.productTabs.forEach((item) => {
        item.classList.remove("tabs__tab--active");
      });
      dom.productTabContents.forEach((content) => {
        content.classList.remove("products-tabs__content--active");
      });

      tab.classList.add("tabs__tab--active");

      const tabId = tab.dataset.tab;
      const target = document.querySelector(
        `.js-products-tabs__content[data-tab-content="${tabId}"]`,
      );

      if (target) {
        target.classList.add("products-tabs__content--active");
      }
    });
  });

  dom.reviewsFilterBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    dom.reviewsFilterDropdown.classList.toggle(
      "reviews__filter-dropdown--show",
    );
  });

  document.addEventListener("click", () => {
    dom.reviewsFilterDropdown?.classList.remove(
      "reviews__filter-dropdown--show",
    );
  });

  dom.reviewsFilterOptions.forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      state.reviewFilter = option.dataset.stars;
      state.reviewPage = 1;
      dom.reviewsFilterOptions.forEach((item) => {
        item.classList.remove("reviews__filter-option--active");
      });
      option.classList.add("reviews__filter-option--active");
      dom.reviewsFilterDropdown.classList.remove(
        "reviews__filter-dropdown--show",
      );
      renderReviewsSection();
    });
  });

  dom.reviewsSortSelect?.addEventListener("change", () => {
    state.reviewSort = dom.reviewsSortSelect.value;
    state.reviewPage = 1;
    renderReviewsSection();
  });

  dom.reviewsLoadMore?.addEventListener("click", () => {
    state.reviewPage += 1;
    renderReviewsSection();
  });

  const minusButton = document.querySelector(".js-quantity-button-minus");
  const plusButton = document.querySelector(".js-quantity-button-plus");

  minusButton?.addEventListener("click", () => {
    const current = normalizeQuantity(dom.quantityInput.value);
    dom.quantityInput.value = String(Math.max(1, current - 1));
  });

  plusButton?.addEventListener("click", () => {
    const current = normalizeQuantity(dom.quantityInput.value);
    dom.quantityInput.value = String(current + 1);
  });

  dom.quantityInput?.addEventListener("input", () => {
    dom.quantityInput.value = dom.quantityInput.value.replace(/[^0-9]/g, "");
  });

  dom.quantityInput?.addEventListener("blur", () => {
    dom.quantityInput.value = String(
      normalizeQuantity(dom.quantityInput.value),
    );
  });
}

async function loadReviews(productId) {
  state.reviews = await reviewService.getReviewsByProductId(productId);
  state.reviewFilter = "All";
  state.reviewSort = "latest";
  state.reviewPage = 1;
  dom.reviewsSortSelect.value = "latest";
  setText(dom.reviewsCount, `(${state.reviews.length})`);

  dom.reviewsFilterOptions.forEach((item) => {
    const isAll = item.dataset.stars === "All";
    item.classList.toggle("reviews__filter-option--active", isAll);
  });

  renderReviewsSection();
}

function paintProduct(product) {
  renderBreadcrumb(dom.breadcrumbList, product);
  renderImageGallery(dom.productGallery, dom.productMainImage, product);
  renderProductInfo(dom, product, helpers);
  renderFaqs(dom.productFaqsList, product.faqs || []);

  const colors = product.variants?.colors || [];
  if (!colors.some((item) => item.id === state.selectedColorId)) {
    state.selectedColorId = colors[0] ? colors[0].id : null;
  }

  const repaintColors = () => {
    renderColorOptions(
      dom.productColorOptions,
      colors,
      state.selectedColorId,
      (colorId) => {
        state.selectedColorId = colorId;
        repaintColors();
      },
    );
  };

  repaintColors();

  const sizes = product.variants?.sizes || [];
  if (!sizes.some((item) => item.id === state.selectedSizeId)) {
    state.selectedSizeId = sizes[0] ? sizes[0].id : null;
  }

  const repaintSizes = () => {
    renderSizeOptions(
      dom.productSizeOptions,
      sizes,
      state.selectedSizeId,
      (sizeId) => {
        state.selectedSizeId = sizeId;
        repaintSizes();
      },
    );
  };

  repaintSizes();
}

function mountRelatedProductsCarousel() {
  relatedProductsCarousel?.destroy();
  relatedProductsCarousel = createRelatedProductsCarousel({
    root: dom.relatedProductsRoot,
    viewport: dom.relatedProductsViewport,
    track: dom.relatedProductsTrack,
    prevButton: dom.otherProductsPrev,
    nextButton: dom.otherProductsNext,
    desktopItemsPerView: 4,
  });
}

function bindAddToCart(product) {
  if (!dom.addToCartButton) {
    return;
  }

  dom.addToCartButton.onclick = () => {
    const quantity = normalizeQuantity(dom.quantityInput?.value || "1");
    addProductToCart(product, quantity);
    triggerAddToCartFeedback(dom.addToCartButton);
  };
}

async function loadSelectedProduct(productId) {
  state.selectedProductId = String(productId);
  setText(dom.productTitle, "Loading product...");
  dom.reviewsList.innerHTML = "";
  console.log("Fetching product:", productId);

  try {
    const product = await productService.getProductById(productId);

    if (!product) {
      resetProductSections("Product not found");
      return;
    }

    syncProductUrl(product.id);
    paintProduct(product);
    bindAddToCart(product);

    const relatedProducts = getCurrentRelatedProducts(product);
    renderRelatedProducts(
      dom.otherProductsList,
      relatedProducts,
      helpers,
      async (nextProductId) => {
        if (String(nextProductId) !== state.selectedProductId) {
          await loadSelectedProduct(nextProductId);
        }
      },
    );
    mountRelatedProductsCarousel();

    await loadReviews(product.id);
  } catch (error) {
    console.error("Failed to load product detail.", error);
    resetProductSections("Product not found");
  }
}

export async function initProductDetailPage() {
  bindStaticEvents();

  const productId = getQueryParam("id");
  if (!productId) {
    console.warn("No product id found in URL");
    resetProductSections("Product not found");
    return;
  }

  const [categoriesResult, productsResult] = await Promise.allSettled([
    categoryService.getCategories(),
    productService.getProducts(),
  ]);

  if (categoriesResult.status === "fulfilled") {
    state.categories = categoriesResult.value;
    renderCategories(dom.navCategories, state.categories);
  } else {
    console.error("Failed to load categories.", categoriesResult.reason);
  }

  if (productsResult.status === "fulfilled") {
    state.products = productsResult.value.products;
  } else {
    console.error("Failed to load products list.", productsResult.reason);
    state.products = [];
  }

  await loadSelectedProduct(productId);
}
