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
import { renderReviewsList } from "../components/reviewComponents.js";
import { formatPrice, formatDate } from "../utils/formatters.js";
import { setText, normalizeQuantity } from "../utils/domUtils.js";
import { renderStars } from "../utils/ratingUtils.js";

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
  navCategories: document.getElementById("nav-categories"),
  breadcrumbList: document.getElementById("breadcrumb-list"),
  productThumbnails: document.getElementById("product-thumbnails"),
  productMainImage: document.getElementById("product-main-image"),
  productTitle: document.getElementById("product-title"),
  productRatingStars: document.getElementById("product-rating-stars"),
  productRatingText: document.getElementById("product-rating-text"),
  productPriceCurrent: document.getElementById("product-price-current"),
  productPriceOld: document.getElementById("product-price-old"),
  productPriceDiscount: document.getElementById("product-price-discount"),
  productDescription: document.getElementById("product-description"),
  productColorOptions: document.getElementById("product-color-options"),
  productSizeOptions: document.getElementById("product-size-options"),
  quantityInput: document.getElementById("quantity-input"),
  productDetailsContent: document.getElementById("product-details-content"),
  productFaqsList: document.getElementById("product-faqs-list"),
  reviewsCount: document.getElementById("reviews-count"),
  reviewsList: document.getElementById("reviews-list"),
  reviewsSortSelect: document.getElementById("reviews-sort-select"),
  reviewsLoadMore: document.getElementById("reviews-load-more"),
  reviewsFilterBtn: document.getElementById("btn-filter-by-stars"),
  reviewsFilterDropdown: document.getElementById("dropdown-filter-by-stars"),
  reviewsFilterOptions: document.querySelectorAll(".js-reviews__filter-option"),
  otherProductsList: document.getElementById("other-products-list"),
  otherProductsPrev: document.querySelector(".js-other-products__prev"),
  otherProductsNext: document.querySelector(".js-other-products__next"),
  productTabs: document.querySelectorAll(".js-tabs__tab"),
  productTabContents: document.querySelectorAll(".js-products-tabs__content"),
};

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
    return state.products.filter((item) => item.id !== product.id);
  }

  return product.relatedProductIds
    .map((relatedId) => state.products.find((item) => item.id === relatedId))
    .filter(Boolean);
}

function bindStaticEvents() {
  dom.productTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      dom.productTabs.forEach((item) => item.classList.remove("tabs__tab--active"));
      dom.productTabContents.forEach((content) =>
        content.classList.remove("products-tabs__content--active"),
      );

      tab.classList.add("tabs__tab--active");

      const tabId = tab.dataset.tab;
      const target = document.getElementById(tabId);
      if (target) {
        target.classList.add("products-tabs__content--active");
      }
    });
  });

  dom.reviewsFilterBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    dom.reviewsFilterDropdown.classList.toggle("reviews__filter-dropdown--show");
  });

  document.addEventListener("click", () => {
    dom.reviewsFilterDropdown.classList.remove("reviews__filter-dropdown--show");
  });

  dom.reviewsFilterOptions.forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      state.reviewFilter = option.dataset.stars;
      state.reviewPage = 1;
      dom.reviewsFilterOptions.forEach((item) =>
        item.classList.remove("reviews__filter-option--active"),
      );
      option.classList.add("reviews__filter-option--active");
      dom.reviewsFilterDropdown.classList.remove("reviews__filter-dropdown--show");
      renderReviewsSection();
    });
  });

  dom.reviewsSortSelect.addEventListener("change", () => {
    state.reviewSort = dom.reviewsSortSelect.value;
    state.reviewPage = 1;
    renderReviewsSection();
  });

  dom.reviewsLoadMore.addEventListener("click", () => {
    state.reviewPage += 1;
    renderReviewsSection();
  });

  const minusButton = document.querySelector(".quantity-button-minus");
  const plusButton = document.querySelector(".quantity-button-plus");

  minusButton.addEventListener("click", () => {
    const current = normalizeQuantity(dom.quantityInput.value);
    dom.quantityInput.value = String(Math.max(1, current - 1));
  });

  plusButton.addEventListener("click", () => {
    const current = normalizeQuantity(dom.quantityInput.value);
    dom.quantityInput.value = String(current + 1);
  });

  dom.quantityInput.addEventListener("input", () => {
    dom.quantityInput.value = dom.quantityInput.value.replace(/[^0-9]/g, "");
  });

  dom.quantityInput.addEventListener("blur", () => {
    dom.quantityInput.value = String(normalizeQuantity(dom.quantityInput.value));
  });

  dom.otherProductsPrev.addEventListener("click", () => {
    dom.otherProductsList.parentElement.scrollBy({
      left: -320,
      behavior: "smooth",
    });
  });

  dom.otherProductsNext.addEventListener("click", () => {
    dom.otherProductsList.parentElement.scrollBy({
      left: 320,
      behavior: "smooth",
    });
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
  renderImageGallery(dom.productThumbnails, dom.productMainImage, product);
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
    renderSizeOptions(dom.productSizeOptions, sizes, state.selectedSizeId, (sizeId) => {
      state.selectedSizeId = sizeId;
      repaintSizes();
    });
  };

  repaintSizes();
}

async function loadSelectedProduct(productId) {
  state.selectedProductId = productId;

  setText(dom.productTitle, "Loading product...");
  dom.reviewsList.innerHTML = "";

  const product = await productService.getProductById(productId);
  if (!product) {
    setText(dom.productTitle, "Product not found.");
    return;
  }

  paintProduct(product);

  const relatedProducts = getCurrentRelatedProducts(product);
  renderRelatedProducts(dom.otherProductsList, relatedProducts, helpers, async (nextProductId) => {
    if (nextProductId !== state.selectedProductId) {
      await loadSelectedProduct(nextProductId);
    }
  });

  await loadReviews(product.id);
}

async function initPage() {
  bindStaticEvents();

  state.categories = await categoryService.getCategories();
  renderCategories(dom.navCategories, state.categories);

  state.products = await productService.getProducts();
  if (state.products.length === 0) {
    setText(dom.productTitle, "No product available.");
    return;
  }

  await loadSelectedProduct(state.products[0].id);
}

initPage();
