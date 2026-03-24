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
import {
  getStoredCartItems,
  persistStoredCartItems,
  readJsonStorageValue,
} from "../utils/storageUtils.js";

const DEFAULTS = {
  reviewSort: "latest",
  reviewPage: 1,
  reviewPageSize: 6,
  reviewLastPage: 1,
  reviewTotal: 0,
  reviewDraftStars: 5,
  quantity: 1,
  maxStars: 5,
  relatedProductsFallbackLimit: 8,
};

const TIMING = {
  reviewLoadingMinDelayMs: 300,
  addToCartFeedbackFallbackMs: 320,
};

const UI_TEXT = {
  loadMoreDefault: "Load More Reviews",
  loadMoreLoading: "Loading...",
  reviewSubmitDefault: "Submit Review",
  reviewSubmitLoading: "Submitting...",
  productDetailsLoading: "Product details are loading...",
  productNotFound: "Product not found",
  guestUser: "Guest",
  anonymousUser: "Anonymous",
  reviewsLoadingAnnouncement: "Loading reviews...",
  reviewsLoadedAnnouncement: "Reviews loaded",
  productAddedAnnouncement: "Product added to cart",
};

const REVIEW_FILTER = {
  all: "All",
};

const STORAGE_KEY_CANDIDATES = ["currentUser", "authUser", "user", "profile"];

const CLASS_NAMES = {
  productOverviewLoading: "product-overview--loading",
  productOverviewBootstrapLocked: "product-overview--bootstrap-locked",
  productsTabsBootstrapLocked: "products-tabs--bootstrap-locked",
  reviewsFilterDropdownShow: "reviews__filter-dropdown--show",
  reviewFilterOptionActive: "reviews__filter-option--active",
  tabsTabActive: "tabs__tab--active",
  productsTabContentActive: "products-tabs__content--active",
  reviewsListFadeIn: "reviews__list--fade-in",
  reviewModalOpen: "review-modal--open",
  reviewModalBodyOpen: "review-modal-open",
  loading: "is-loading",
  added: "is-added",
  reviewModalRatingStar: "review-modal__star",
  reviewCardStar: "review-card__star",
  reviewModalRatingHit: "js-review-rating-hit",
};

const SELECTORS = {
  colorOption: ".js-color-option",
  sizeOption: ".js-size-option",
  tabContentById: (tabId) =>
    `.js-products-tabs__content[data-tab-content="${tabId}"]`,
  reviewModalSubmitButton: ".js-review-modal-submit",
  reviewRatingHit: ".js-review-rating-hit",
};

const ATTRIBUTES = {
  ariaExpanded: "aria-expanded",
  ariaBusy: "aria-busy",
  dataInitialDisabled: "data-initial-disabled",
  initialDisabledDatasetKey: "initialDisabled",
  stars: "stars",
  tab: "tab",
  tabContent: "tabContent",
  rating: "rating",
};

const state = {
  categories: [],
  products: [],
  selectedProductId: null,
  selectedColorId: null,
  selectedSizeId: null,
  reviews: [],
  reviewSort: DEFAULTS.reviewSort,
  reviewPage: DEFAULTS.reviewPage,
  reviewPageSize: DEFAULTS.reviewPageSize,
  reviewRating: null,
  reviewLastPage: DEFAULTS.reviewLastPage,
  reviewTotal: DEFAULTS.reviewTotal,
  reviewDraftStars: DEFAULTS.reviewDraftStars,
  reviewRequestToken: 0,
  isLoadingMoreReviews: false,
  isSubmittingReview: false,
  isLoadingReviews: false,
  productRequestToken: 0,
  isProductLoading: false,
  hasSettledInitialBootstrap: false,
  isBootstrapUiLocked: false,
};

const dom = {
  productOverview: document.querySelector(".js-product-overview"),
  productsTabs: document.querySelector(".js-products-tabs"),
  breadcrumbList: document.querySelector(".js-breadcrumb-list"),
  productGallery: document.querySelector(".js-product-gallery"),
  productMainImage: document.querySelector(".js-product-main-image"),
  productTitle: document.querySelector(".js-product-title"),
  productRatingSection: document.querySelector(".js-product-rating-section"),
  productRatingStars: document.querySelector(".js-product-rating-stars"),
  productRatingText: document.querySelector(".js-product-rating-text"),
  productPriceCurrent: document.querySelector(".js-product-price"),
  productPriceOld: document.querySelector(".js-product-original-price"),
  productPriceDiscount: document.querySelector(".js-product-discount"),
  productDescription: document.querySelector(".js-product-description"),
  productColorOptions: document.querySelector(".js-product-color-options"),
  productSizeOptions: document.querySelector(".js-product-size-options"),
  quantityInput: document.querySelector(".js-quantity-input"),
  quantityMinusButton: document.querySelector(".js-quantity-button-minus"),
  quantityPlusButton: document.querySelector(".js-quantity-button-plus"),
  productDetailsContent: document.querySelector(".js-product-details-content"),
  productFaqsList: document.querySelector(".js-product-faqs-list"),
  reviewsCount: document.querySelector(".js-reviews-count"),
  reviewsList: document.querySelector(".js-reviews-list"),
  reviewsSortSelect: document.querySelector(".js-reviews-sort-select"),
  reviewsLoadMore: document.querySelector(".js-reviews-load-more"),
  reviewsFilterBtn: document.querySelector(".js-btn-filter-by-stars"),
  reviewsFilterDropdown: document.querySelector(".js-dropdown-filter-by-stars"),
  reviewsFilterOptions: document.querySelectorAll(".js-reviews__filter-option"),
  writeReviewButton: document.querySelector(".js-write-review-button"),
  reviewModal: document.querySelector(".js-review-modal"),
  reviewModalForm: document.querySelector(".js-review-modal-form"),
  reviewModalCloseButtons: document.querySelectorAll(".js-review-modal-close"),
  reviewUsernameInput: document.querySelector(".js-review-username"),
  reviewCommentInput: document.querySelector(".js-review-comment"),
  reviewRatingPicker: document.querySelector(".js-review-rating-picker"),
  reviewRatingStars: document.querySelector(".js-review-rating-stars"),
  reviewRatingHitzones: document.querySelector(".js-review-rating-hitzones"),
  reviewRatingValue: document.querySelector(".js-review-rating-value"),
  reviewModalSubmitButton: document.querySelector(
    SELECTORS.reviewModalSubmitButton,
  ),
  relatedProductsRoot: document.querySelector(".js-related-products"),
  relatedProductsViewport: document.querySelector(".js-related-viewport"),
  relatedProductsTrack: document.querySelector(".js-related-track"),
  otherProductsList: document.querySelector(".js-other-products__list"),
  otherProductsPrev: document.querySelector(".js-other-products__prev"),
  otherProductsNext: document.querySelector(".js-other-products__next"),
  productTabs: document.querySelectorAll(".js-tabs__tab"),
  productTabContents: document.querySelectorAll(".js-products-tabs__content"),
  addToCartButton: document.querySelector(".js-add-to-cart"),
  srAnnouncer: document.querySelector(".js-sr-announcer"),
};

function announce(message) {
  if (dom.srAnnouncer) {
    dom.srAnnouncer.textContent = message;
  }
}

let relatedProductsCarousel = null;

const helpers = {
  formatPrice,
  formatDate,
  renderStars,
};

const initialSkeletonMarkup = {
  productGallery: dom.productGallery?.innerHTML || "",
  productTitle: dom.productTitle?.innerHTML || "",
  productRatingStars: dom.productRatingStars?.innerHTML || "",
  productRatingText: dom.productRatingText?.innerHTML || "",
  productPriceCurrent: dom.productPriceCurrent?.innerHTML || "",
  productPriceOld: dom.productPriceOld?.innerHTML || "",
  productPriceDiscount: dom.productPriceDiscount?.innerHTML || "",
  productDescription: dom.productDescription?.innerHTML || "",
  productColorOptions: dom.productColorOptions?.innerHTML || "",
  productSizeOptions: dom.productSizeOptions?.innerHTML || "",
  productFaqsList: dom.productFaqsList?.innerHTML || "",
  relatedProductsList: dom.otherProductsList?.innerHTML || "",
  reviewsList: dom.reviewsList?.innerHTML || "",
};

const SKELETON_MARKUP_BINDINGS = [
  ["productGallery", "productGallery"],
  ["productTitle", "productTitle"],
  ["productRatingStars", "productRatingStars"],
  ["productRatingText", "productRatingText"],
  ["productPriceCurrent", "productPriceCurrent"],
  ["productPriceOld", "productPriceOld"],
  ["productPriceDiscount", "productPriceDiscount"],
  ["productDescription", "productDescription"],
  ["productColorOptions", "productColorOptions"],
  ["productSizeOptions", "productSizeOptions"],
  ["productFaqsList", "productFaqsList"],
  ["otherProductsList", "relatedProductsList"],
  ["reviewsList", "reviewsList"],
];

function setSectionInteractivity(section, isDisabled) {
  if (!section) {
    return;
  }

  section.setAttribute(ATTRIBUTES.ariaBusy, String(Boolean(isDisabled)));

  if ("inert" in section) {
    section.inert = Boolean(isDisabled);
    return;
  }

  section.style.pointerEvents = isDisabled ? "none" : "";
}

function setElementHtml(element, html) {
  if (element) {
    element.innerHTML = html;
  }
}

function setProductRatingVisibility(isVisible) {
  if (!dom.productRatingSection) {
    return;
  }

  dom.productRatingSection.style.display = isVisible ? "" : "none";
}

function clearProductRatingContent() {
  setElementHtml(dom.productRatingStars, "");
  setElementHtml(dom.productRatingText, "");
}

function toggleReviewFilterDropdown(isOpen) {
  const nextIsOpen = Boolean(isOpen);
  dom.reviewsFilterDropdown?.classList.toggle(
    CLASS_NAMES.reviewsFilterDropdownShow,
    nextIsOpen,
  );
  dom.reviewsFilterBtn?.setAttribute(
    ATTRIBUTES.ariaExpanded,
    String(nextIsOpen),
  );
}

function hideReviewFilterDropdown() {
  toggleReviewFilterDropdown(false);
}

function setReviewsLoadMoreVisibility(isVisible) {
  if (dom.reviewsLoadMore) {
    dom.reviewsLoadMore.style.display = isVisible ? "" : "none";
  }
}

function resetReviewsUi() {
  setElementHtml(dom.reviewsList, "");
  dom.reviewsList?.classList.remove(CLASS_NAMES.reviewsListFadeIn);
  setText(dom.reviewsCount, "(0)");
  setReviewsLoadMoreVisibility(false);
}

function setProductTransitionLoading(isLoading) {
  state.isProductLoading = Boolean(isLoading);
  dom.productOverview?.classList.toggle(
    CLASS_NAMES.productOverviewLoading,
    isLoading,
  );

  [dom.productOverview, dom.productsTabs, dom.relatedProductsRoot].forEach(
    (section) => {
      setSectionInteractivity(section, isLoading);
    },
  );

  if (isLoading) {
    hideReviewFilterDropdown();
  }
}

function restoreProductSkeletonState() {
  SKELETON_MARKUP_BINDINGS.forEach(([domKey, markupKey]) => {
    setElementHtml(dom[domKey], initialSkeletonMarkup[markupKey]);
  });

  setProductRatingVisibility(true);
  setText(dom.productDetailsContent, UI_TEXT.productDetailsLoading);

  dom.reviewsList?.classList.remove(CLASS_NAMES.reviewsListFadeIn);
  setText(dom.reviewsCount, "(0)");
  setReviewsLoadMoreVisibility(false);

  dom.productMainImage?.removeAttribute("src");
  if (dom.productMainImage) {
    dom.productMainImage.alt = "";
  }
}

function scrollToTopForProductSwitch() {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion ? "auto" : "smooth",
  });
}

function mapReviewToCard(review) {
  return {
    ratingStar: Number(
      review?.stars ?? review?.rating ?? review?.ratingStar ?? 0,
    ),
    name:
      review?.user?.name ??
      review?.username ??
      review?.name ??
      UI_TEXT.anonymousUser,
    desc: review?.comment ?? review?.desc ?? "",
    date: review?.created_at ?? review?.date,
    isVerified: Boolean(review?.isVerified),
  };
}

function buildReviewSkeletonMarkup(itemsCount) {
  return Array.from({ length: Math.max(1, Number(itemsCount) || 1) }, () => {
    return `<li class="reviews__item review-card reviews__skeleton" aria-hidden="true">
      <div class="review-card__meta">
        <div class="reviews__skeleton-line reviews__skeleton-line--stars"></div>
        <div class="reviews__skeleton-line reviews__skeleton-line--icon"></div>
      </div>
      <div class="reviews__skeleton-line reviews__skeleton-line--title"></div>
      <div class="reviews__skeleton-line reviews__skeleton-line--text"></div>
      <div class="reviews__skeleton-line reviews__skeleton-line--text reviews__skeleton-line--text-short"></div>
      <div class="reviews__skeleton-line reviews__skeleton-line--footer"></div>
    </li>`;
  }).join("");
}

function showReviewsSkeleton(itemsCount = state.reviewPageSize) {
  if (!dom.reviewsList) {
    return;
  }

  dom.reviewsList.classList.remove(CLASS_NAMES.reviewsListFadeIn);
  dom.reviewsList.innerHTML = buildReviewSkeletonMarkup(itemsCount);
}

function setReviewControlsDisabled(isDisabled) {
  const nextIsDisabled = Boolean(isDisabled);

  if (dom.reviewsFilterBtn) {
    dom.reviewsFilterBtn.disabled = nextIsDisabled;
  }

  if (dom.reviewsSortSelect) {
    dom.reviewsSortSelect.disabled = nextIsDisabled;
  }

  if (dom.reviewsLoadMore) {
    dom.reviewsLoadMore.disabled =
      nextIsDisabled || state.reviewPage >= state.reviewLastPage;
  }
}

function setInitialBootstrapUiLock(isLocked) {
  const nextIsLocked = Boolean(isLocked);
  state.isBootstrapUiLocked = nextIsLocked;

  dom.productOverview?.classList.toggle(
    CLASS_NAMES.productOverviewBootstrapLocked,
    nextIsLocked,
  );
  dom.productsTabs?.classList.toggle(
    CLASS_NAMES.productsTabsBootstrapLocked,
    nextIsLocked,
  );

  [
    dom.quantityInput,
    dom.quantityMinusButton,
    dom.quantityPlusButton,
    dom.addToCartButton,
    dom.writeReviewButton,
  ].forEach((element) => {
    if (element) {
      element.disabled = nextIsLocked;
    }
  });

  dom.productColorOptions
    ?.querySelectorAll(SELECTORS.colorOption)
    .forEach((item) => {
      item.disabled = nextIsLocked;
    });

  dom.productSizeOptions
    ?.querySelectorAll(SELECTORS.sizeOption)
    .forEach((item) => {
      if (nextIsLocked) {
        item.dataset[ATTRIBUTES.initialDisabledDatasetKey] = String(
          item.disabled,
        );
        item.disabled = true;
        return;
      }

      const shouldRestoreDisabled =
        item.dataset[ATTRIBUTES.initialDisabledDatasetKey] === "true";
      item.disabled = shouldRestoreDisabled;
      item.removeAttribute(ATTRIBUTES.dataInitialDisabled);
    });

  setReviewControlsDisabled(nextIsLocked || state.isLoadingReviews);
}

function setLoadMoreButtonLoading(isLoading) {
  if (!dom.reviewsLoadMore) {
    return;
  }

  const nextIsLoading = Boolean(isLoading);
  dom.reviewsLoadMore.disabled =
    nextIsLoading ||
    state.isBootstrapUiLocked ||
    state.reviewPage >= state.reviewLastPage;
  dom.reviewsLoadMore.classList.toggle(CLASS_NAMES.loading, nextIsLoading);
  dom.reviewsLoadMore.textContent = nextIsLoading
    ? UI_TEXT.loadMoreLoading
    : UI_TEXT.loadMoreDefault;
}

function getCurrentRelatedProducts(product) {
  if (!product.relatedProductIds || product.relatedProductIds.length === 0) {
    return state.products
      .filter((item) => item.id !== product.id)
      .slice(0, DEFAULTS.relatedProductsFallbackLimit);
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

function renderFilledStarsOnly(rating, className) {
  return renderStars(rating, className, { showEmpty: false });
}

function normalizeHalfStarValue(value, fallback = DEFAULTS.reviewDraftStars) {
  const parsedValue = Number(value);
  const safeValue = Number.isFinite(parsedValue) ? parsedValue : fallback;
  return (
    Math.round(Math.max(1, Math.min(DEFAULTS.maxStars, safeValue)) * 2) / 2
  );
}

function findUsernameFromStorageRecord(record) {
  if (!record || typeof record !== "object") {
    return "";
  }

  return String(
    record?.name ||
      record?.username ||
      record?.fullName ||
      record?.displayName ||
      "",
  ).trim();
}

function getLoggedInUsername() {
  for (const key of STORAGE_KEY_CANDIDATES) {
    const parsedValue = readJsonStorageValue(localStorage, key, null);
    if (!parsedValue) {
      continue;
    }

    const username = findUsernameFromStorageRecord(parsedValue);
    if (username) {
      return username;
    }
  }

  return UI_TEXT.guestUser;
}

function setActiveReviewFilterOption(activeStars) {
  const isAllOption = String(activeStars) === REVIEW_FILTER.all;
  const normalizedActiveStars = Number(activeStars);

  dom.reviewsFilterOptions.forEach((item) => {
    const itemStars = item.dataset[ATTRIBUTES.stars];
    const isMatched = isAllOption
      ? itemStars === REVIEW_FILTER.all
      : itemStars !== REVIEW_FILTER.all &&
        Number(itemStars) === normalizedActiveStars;

    item.classList.toggle(CLASS_NAMES.reviewFilterOptionActive, isMatched);
  });
}

function renderReviewDraftStars() {
  if (!dom.reviewRatingStars || !dom.reviewRatingValue) {
    return;
  }

  dom.reviewRatingStars.innerHTML = renderStars(
    state.reviewDraftStars,
    CLASS_NAMES.reviewModalRatingStar,
    { showEmpty: true },
  );
  dom.reviewRatingValue.textContent = `${state.reviewDraftStars.toFixed(1)}/${DEFAULTS.maxStars}`;
}

function setReviewDraftStars(nextRating) {
  state.reviewDraftStars = normalizeHalfStarValue(
    nextRating,
    state.reviewDraftStars,
  );
  renderReviewDraftStars();
}

function buildReviewRatingHitzones() {
  if (!dom.reviewRatingHitzones) {
    return;
  }

  dom.reviewRatingHitzones.innerHTML = Array.from(
    { length: DEFAULTS.maxStars },
    (_, index) => {
      const starIndex = index + 1;
      const leftValue = starIndex === 1 ? 1 : starIndex - 0.5;
      const rightValue = starIndex;

      return `<button type="button" class="review-modal__rating-hit ${CLASS_NAMES.reviewModalRatingHit}" data-rating="${leftValue}" aria-label="Rate ${leftValue} stars"></button>
      <button type="button" class="review-modal__rating-hit ${CLASS_NAMES.reviewModalRatingHit}" data-rating="${rightValue}" aria-label="Rate ${rightValue} stars"></button>`;
    },
  ).join("");

  dom.reviewRatingHitzones
    .querySelectorAll(SELECTORS.reviewRatingHit)
    .forEach((hitArea) => {
      hitArea.addEventListener("click", () => {
        setReviewDraftStars(hitArea.dataset[ATTRIBUTES.rating]);
      });
    });
}

function openReviewModal() {
  if (!dom.reviewModal) {
    return;
  }

  state.reviewDraftStars = DEFAULTS.reviewDraftStars;
  renderReviewDraftStars();

  if (dom.reviewUsernameInput) {
    dom.reviewUsernameInput.value = getLoggedInUsername();
  }

  if (dom.reviewCommentInput) {
    dom.reviewCommentInput.value = "";
  }

  dom.reviewModal.classList.add(CLASS_NAMES.reviewModalOpen);
  dom.reviewModal.setAttribute("aria-hidden", "false");
  document.body.classList.add(CLASS_NAMES.reviewModalBodyOpen);

  dom.reviewCommentInput?.focus();
}

function closeReviewModal() {
  if (!dom.reviewModal) {
    return;
  }

  dom.reviewModal.classList.remove(CLASS_NAMES.reviewModalOpen);
  dom.reviewModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove(CLASS_NAMES.reviewModalBodyOpen);
}

function setReviewSubmitButtonLoading(isLoading) {
  const nextIsLoading = Boolean(isLoading);
  if (!dom.reviewModalSubmitButton) {
    return;
  }

  dom.reviewModalSubmitButton.disabled = nextIsLoading;
  dom.reviewModalSubmitButton.classList.toggle(
    CLASS_NAMES.loading,
    nextIsLoading,
  );
  setText(
    dom.reviewModalSubmitButton,
    nextIsLoading ? UI_TEXT.reviewSubmitLoading : UI_TEXT.reviewSubmitDefault,
  );
}

async function handleReviewSubmit(event) {
  event.preventDefault();

  if (state.isSubmittingReview) {
    return;
  }

  const normalizedProductId = String(state.selectedProductId || "").trim();
  if (!normalizedProductId) {
    return;
  }

  const username =
    String(dom.reviewUsernameInput?.value || "").trim() || UI_TEXT.guestUser;
  const comment = String(dom.reviewCommentInput?.value || "").trim();
  const stars = normalizeHalfStarValue(
    state.reviewDraftStars,
    DEFAULTS.reviewDraftStars,
  );

  if (!comment) {
    dom.reviewCommentInput?.focus();
    return;
  }

  state.isSubmittingReview = true;
  setReviewSubmitButtonLoading(true);

  try {
    await reviewService.submitReview(normalizedProductId, {
      username,
      comment,
      stars,
    });
    closeReviewModal();
    state.reviewPage = DEFAULTS.reviewPage;
    await loadReviews(normalizedProductId);
  } catch (error) {
    console.error("Failed to submit review", error);
  } finally {
    state.isSubmittingReview = false;
    setReviewSubmitButtonLoading(false);
  }
}

function renderProductRatingSection(rating) {
  if (
    !dom.productRatingSection ||
    !dom.productRatingStars ||
    !dom.productRatingText
  ) {
    return;
  }

  const normalizedRating = Number(rating ?? 0);
  const safeRating =
    Number.isFinite(normalizedRating) && normalizedRating > 0
      ? Math.min(DEFAULTS.maxStars, normalizedRating)
      : 0;

  if (safeRating === 0) {
    setProductRatingVisibility(false);
    clearProductRatingContent();
    return;
  }

  setProductRatingVisibility(true);
  dom.productRatingText.innerHTML = `${safeRating}/<span>${DEFAULTS.maxStars}</span>`;
  dom.productRatingStars.innerHTML = renderFilledStarsOnly(
    safeRating,
    CLASS_NAMES.reviewCardStar,
  );
}

function syncDiscountBadgeVisibility() {
  if (!dom.productPriceDiscount) {
    return;
  }

  const discountText = String(
    dom.productPriceDiscount.textContent || "",
  ).trim();
  const parsedDiscount = Number(discountText.replace(/[^0-9.]/g, ""));
  const hasValidDiscount =
    discountText.length > 0 &&
    Number.isFinite(parsedDiscount) &&
    parsedDiscount > 0;

  if (!hasValidDiscount) {
    setText(dom.productPriceDiscount, "");
  }
}

function clearProductMainMedia() {
  setElementHtml(dom.productGallery, "");
  dom.productMainImage?.removeAttribute("src");
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

  setProductRatingVisibility(false);
  clearProductRatingContent();
  clearProductMainMedia();

  setElementHtml(dom.productFaqsList, "");
  setElementHtml(dom.otherProductsList, "");
  resetReviewsUi();
}

function toCartItem(product, quantity, color = null, size = null) {
  return {
    id: String(product.id),
    name: product.name,
    quantity,
    color,
    size,
    thumbnail: product.thumbnail,
    thumbnailAlt: product.name,
    pricing: product.pricing,
  };
}

function addProductToCart(
  product,
  quantityToAdd = DEFAULTS.quantity,
  color = null,
  size = null,
) {
  if (!product?.id) {
    return;
  }

  const quantity = Math.max(
    DEFAULTS.quantity,
    Number(quantityToAdd) || DEFAULTS.quantity,
  );
  const cartItems = getStoredCartItems(CART_STORAGE_KEY);
  const existingItem = cartItems.find(
    (item) =>
      String(item.id) === String(product.id) &&
      item.color === color &&
      item.size === size,
  );

  if (existingItem) {
    existingItem.quantity = Math.max(
      DEFAULTS.quantity,
      Number(existingItem.quantity || 0) + quantity,
    );
  } else {
    cartItems.push(toCartItem(product, quantity, color, size));
  }

  persistStoredCartItems(CART_STORAGE_KEY, cartItems);
}

function triggerAddToCartFeedback(button) {
  if (!button) {
    return;
  }

  button.classList.remove(CLASS_NAMES.added);
  button.offsetWidth;
  button.classList.add(CLASS_NAMES.added);

  const clearFeedback = () => {
    button.classList.remove(CLASS_NAMES.added);
  };

  button.addEventListener("animationend", clearFeedback, { once: true });
  window.setTimeout(clearFeedback, TIMING.addToCartFeedbackFallbackMs);
}

function activateProductTab(tab, tabId) {
  dom.productTabs.forEach((item) => {
    item.classList.remove(CLASS_NAMES.tabsTabActive);
  });
  dom.productTabContents.forEach((content) => {
    content.classList.remove(CLASS_NAMES.productsTabContentActive);
  });

  tab.classList.add(CLASS_NAMES.tabsTabActive);

  const target = document.querySelector(SELECTORS.tabContentById(tabId));
  if (target) {
    target.classList.add(CLASS_NAMES.productsTabContentActive);
  }
}

function shouldSkipReviewReload() {
  return state.isLoadingReviews;
}

function reloadReviewsWithControlLock() {
  state.isLoadingReviews = true;
  setReviewControlsDisabled(true);

  return loadReviews(state.selectedProductId, false, {
    showLoading: true,
  }).finally(() => {
    state.isLoadingReviews = false;
    setReviewControlsDisabled(state.isBootstrapUiLocked);
  });
}

function resetReviewQueryState() {
  state.reviewPage = DEFAULTS.reviewPage;
  state.reviewSort = DEFAULTS.reviewSort;
  state.reviewRating = null;
  state.reviewLastPage = DEFAULTS.reviewLastPage;
  state.reviewTotal = DEFAULTS.reviewTotal;
  if (dom.reviewsSortSelect) {
    dom.reviewsSortSelect.value = DEFAULTS.reviewSort;
  }
  setActiveReviewFilterOption(REVIEW_FILTER.all);
  hideReviewFilterDropdown();
}

function bindStaticEvents() {
  dom.productTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.dataset[ATTRIBUTES.tab];
      if (!tabId) {
        return;
      }

      activateProductTab(tab, tabId);
    });
  });

  dom.reviewsFilterBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = !dom.reviewsFilterDropdown?.classList.contains(
      CLASS_NAMES.reviewsFilterDropdownShow,
    );
    toggleReviewFilterDropdown(isOpen);
  });

  dom.reviewsFilterBtn?.addEventListener("keydown", (event) => {
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      toggleReviewFilterDropdown(true);
      dom.reviewsFilterOptions[0]?.focus();
    }
  });

  dom.reviewsFilterDropdown?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      hideReviewFilterDropdown();
      dom.reviewsFilterBtn?.focus();
      return;
    }

    const options = Array.from(dom.reviewsFilterOptions);
    const index = options.indexOf(document.activeElement);
    if (index === -1) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = (index + 1) % options.length;
      options[nextIndex]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prevIndex = (index - 1 + options.length) % options.length;
      options[prevIndex]?.focus();
    }
  });

  document.removeEventListener("click", handleDocumentClickForDropdown);
  document.addEventListener("click", handleDocumentClickForDropdown);

  dom.reviewsFilterOptions.forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      if (shouldSkipReviewReload()) {
        return;
      }

      const stars = option.dataset[ATTRIBUTES.stars];
      setActiveReviewFilterOption(stars);
      state.reviewRating = stars === REVIEW_FILTER.all ? null : Number(stars);
      state.reviewPage = DEFAULTS.reviewPage;

      hideReviewFilterDropdown();
      reloadReviewsWithControlLock();
    });
  });

  dom.reviewsSortSelect?.addEventListener("change", () => {
    if (shouldSkipReviewReload()) {
      return;
    }

    state.reviewSort = dom.reviewsSortSelect.value;
    state.reviewPage = DEFAULTS.reviewPage;
    reloadReviewsWithControlLock();
  });

  dom.reviewsLoadMore?.addEventListener("click", async () => {
    if (
      state.isLoadingMoreReviews ||
      state.reviewPage >= state.reviewLastPage
    ) {
      return;
    }

    state.isLoadingMoreReviews = true;
    const previousPage = state.reviewPage;
    state.reviewPage += 1;
    setLoadMoreButtonLoading(true);

    try {
      await loadReviews(state.selectedProductId, true);
    } catch (error) {
      state.reviewPage = previousPage;
      console.error("Failed to load more reviews", error);
    } finally {
      state.isLoadingMoreReviews = false;
      setLoadMoreButtonLoading(false);
    }
  });

  buildReviewRatingHitzones();

  dom.writeReviewButton?.addEventListener("click", () => {
    if (state.isBootstrapUiLocked) {
      return;
    }

    openReviewModal();
  });

  dom.reviewModalCloseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      closeReviewModal();
    });
  });

  document.removeEventListener("keydown", handleEscapeKeyToCloseModal);
  document.addEventListener("keydown", handleEscapeKeyToCloseModal);

  dom.reviewModalForm?.addEventListener("submit", handleReviewSubmit);

  dom.quantityMinusButton?.addEventListener("click", () => {
    const current = normalizeQuantity(
      dom.quantityInput?.value || String(DEFAULTS.quantity),
    );
    updateQuantityUI(current - 1);
  });

  dom.quantityPlusButton?.addEventListener("click", () => {
    const current = normalizeQuantity(
      dom.quantityInput?.value || String(DEFAULTS.quantity),
    );
    updateQuantityUI(current + 1);
  });

  dom.quantityInput?.addEventListener("input", () => {
    const sanitized = dom.quantityInput.value.replace(/[^0-9]/g, "");
    dom.quantityInput.value = sanitized;
    const parsed = parseInt(sanitized, 10);
    if (dom.quantityMinusButton) {
      dom.quantityMinusButton.disabled =
        isNaN(parsed) || parsed <= DEFAULTS.quantity;
    }
  });

  dom.quantityInput?.addEventListener("blur", () => {
    updateQuantityUI(dom.quantityInput.value);
  });
}

async function loadReviews(
  productId,
  append = false,
  { showLoading = false } = {},
) {
  const normalizedProductId = String(productId || "").trim();
  if (!normalizedProductId) {
    return;
  }

  const shouldShowLoading = !append && showLoading;
  const requestToken = ++state.reviewRequestToken;
  const minimumDelayPromise = shouldShowLoading
    ? new Promise((resolve) => {
        window.setTimeout(resolve, TIMING.reviewLoadingMinDelayMs);
      })
    : Promise.resolve();

  if (shouldShowLoading) {
    showReviewsSkeleton(state.reviewPageSize);
    setReviewsLoadMoreVisibility(false);
    announce(UI_TEXT.reviewsLoadingAnnouncement);
  }

  const [reviewsResult] = await Promise.all([
    reviewService.getReviewsByProductId(normalizedProductId, {
      page: state.reviewPage,
      perPage: state.reviewPageSize,
      sort: state.reviewSort,
      rating: state.reviewRating,
    }),
    minimumDelayPromise,
  ]);

  if (requestToken !== state.reviewRequestToken) {
    return;
  }

  const { data: reviews, meta } = reviewsResult;

  state.reviewLastPage = Number(meta?.last_page || DEFAULTS.reviewLastPage);
  state.reviewTotal = Number(meta?.total || DEFAULTS.reviewTotal);
  state.reviews = append ? [...state.reviews, ...reviews] : [...reviews];

  setText(dom.reviewsCount, `(${state.reviewTotal})`);

  const mappedReviews = reviews.map((review) => mapReviewToCard(review));
  if (append) {
    const temp = document.createElement("ul");
    renderReviewsList(temp, mappedReviews, helpers);
    dom.reviewsList?.insertAdjacentHTML("beforeend", temp.innerHTML);
  } else {
    renderReviewsList(dom.reviewsList, mappedReviews, helpers);
    dom.reviewsList?.classList.remove(CLASS_NAMES.reviewsListFadeIn);
    dom.reviewsList?.offsetWidth;
    dom.reviewsList?.classList.add(CLASS_NAMES.reviewsListFadeIn);
  }

  announce(UI_TEXT.reviewsLoadedAnnouncement);
  setReviewsLoadMoreVisibility(state.reviewPage < state.reviewLastPage);
}

function paintProduct(product) {
  renderBreadcrumb(dom.breadcrumbList, product);
  renderImageGallery(dom.productGallery, dom.productMainImage, product);
  renderProductInfo(dom, product, helpers);

  const ratingValue = Number(product.ratingAvg ?? product.rating ?? 0);
  renderProductRatingSection(ratingValue);
  syncDiscountBadgeVisibility();
  renderFaqs(dom.productFaqsList, product.faqs || []);

  const colors = Array.isArray(product.variants?.colors)
    ? product.variants.colors
        .map((color) => ({
          id: color?.id,
          name: color?.label || color?.name || color?.id,
          colorCode: color?.colorCode || color?.id,
        }))
        .filter((color) => color.id)
    : [];
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

  const sizes = Array.isArray(product.variants?.sizes)
    ? product.variants.sizes
        .map((size) => ({
          id: size?.id,
          name: size?.label || size?.name || size?.id,
          inStock: size?.inStock ?? true,
        }))
        .filter((size) => size.id)
    : [];
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

  if (state.isBootstrapUiLocked) {
    setInitialBootstrapUiLock(true);
  }
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
    const quantity = normalizeQuantity(
      dom.quantityInput?.value || String(DEFAULTS.quantity),
    );
    addProductToCart(
      product,
      quantity,
      state.selectedColorId ?? null,
      state.selectedSizeId ?? null,
    );
    triggerAddToCartFeedback(dom.addToCartButton);
    announce(UI_TEXT.productAddedAnnouncement);
  };
}

async function loadSelectedProduct(productId) {
  const normalizedProductId = String(productId || "").trim();
  if (!normalizedProductId) {
    return;
  }

  if (state.isProductLoading) {
    return;
  }

  if (normalizedProductId === String(state.selectedProductId || "")) {
    return;
  }

  const requestToken = ++state.productRequestToken;
  state.selectedProductId = normalizedProductId;
  restoreProductSkeletonState();
  setProductTransitionLoading(true);
  relatedProductsCarousel?.destroy();
  relatedProductsCarousel = null;
  console.log("Fetching product:", normalizedProductId);

  try {
    const product = await productService.getProductById(normalizedProductId);

    if (requestToken !== state.productRequestToken) {
      return;
    }

    if (!product) {
      resetProductSections(UI_TEXT.productNotFound);
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
        const normalizedNextProductId = String(nextProductId || "").trim();
        if (
          !normalizedNextProductId ||
          normalizedNextProductId === String(state.selectedProductId || "") ||
          state.isProductLoading
        ) {
          return;
        }

        scrollToTopForProductSwitch();
        await loadSelectedProduct(normalizedNextProductId);
      },
    );
    mountRelatedProductsCarousel();

    resetReviewQueryState();
    await loadReviews(product.id, false, { showLoading: true });
  } catch (error) {
    console.error("Failed to load product detail.", error);
    resetProductSections(UI_TEXT.productNotFound);
  } finally {
    if (requestToken === state.productRequestToken) {
      setProductTransitionLoading(false);

      if (!state.hasSettledInitialBootstrap) {
        state.hasSettledInitialBootstrap = true;
        setInitialBootstrapUiLock(false);
      }
    }
  }
}

function handleDocumentClickForDropdown() {
  hideReviewFilterDropdown();
}

function handleEscapeKeyToCloseModal(event) {
  if (event.key === "Escape") {
    closeReviewModal();
  }
}

export function updateQuantityUI(value) {
  const current = normalizeQuantity(value);
  if (dom.quantityInput) {
    dom.quantityInput.value = String(current);
  }
  if (dom.quantityMinusButton) {
    dom.quantityMinusButton.disabled = current <= DEFAULTS.quantity;
  }
}

export async function initProductDetailPage() {
  bindStaticEvents();

  const productId = getQueryParam("id");
  if (!productId) {
    console.warn("No product id found in URL");
    resetProductSections(UI_TEXT.productNotFound);
    return;
  }

  setInitialBootstrapUiLock(true);

  const [productsResult] = await Promise.allSettled([
    productService.getProducts(),
  ]);

  if (productsResult.status === "fulfilled") {
    state.products = productsResult.value.products;
  } else {
    console.error("Failed to load products list.", productsResult.reason);
    state.products = [];
  }

  state.selectedProductId = null;
  await loadSelectedProduct(productId);

  if (dom.quantityInput) {
    updateQuantityUI(dom.quantityInput.value);
  }
}
