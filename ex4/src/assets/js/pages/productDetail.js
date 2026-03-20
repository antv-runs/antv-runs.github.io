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
  reviewSort: "latest",
  reviewPage: 1,
  reviewPageSize: 6,
  reviewRating: null,
  reviewLastPage: 1,
  reviewTotal: 0,
  reviewDraftStars: 5,
  reviewRequestToken: 0,
  isLoadingMoreReviews: false,
  isSubmittingReview: false,
  isLoadingReviews: false,
  productRequestToken: 0,
  isProductLoading: false,
  hasSettledInitialBootstrap: false,
  isBootstrapUiLocked: false,
};

const REVIEW_LOADING_MIN_DELAY_MS = 300;
const LOAD_MORE_DEFAULT_TEXT = "Load More Reviews";
const LOAD_MORE_LOADING_TEXT = "Loading...";
const REVIEW_SUBMIT_DEFAULT_TEXT = "Submit Review";
const REVIEW_SUBMIT_LOADING_TEXT = "Submitting...";

const dom = {
  productOverview: document.querySelector(".js-product-overview"),
  productsTabs: document.querySelector(".js-products-tabs"),
  breadcrumbList: document.querySelector(".js-breadcrumb-list"),
  productGallery: document.querySelector(".js-product-gallery"),
  productMainImage: document.querySelector(".js-product-main-image"),
  productTitle: document.querySelector(".js-product-title"),
  productRatingSection: document.querySelector(".product-overview__rating"),
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

function setSectionInteractivity(section, isDisabled) {
  if (!section) {
    return;
  }

  section.setAttribute("aria-busy", String(Boolean(isDisabled)));

  if ("inert" in section) {
    section.inert = Boolean(isDisabled);
    return;
  }

  section.style.pointerEvents = isDisabled ? "none" : "";
}

function setProductTransitionLoading(isLoading) {
  state.isProductLoading = Boolean(isLoading);
  dom.productOverview?.classList.toggle("product-overview--loading", isLoading);

  [dom.productOverview, dom.productsTabs, dom.relatedProductsRoot].forEach(
    (section) => {
      setSectionInteractivity(section, isLoading);
    },
  );

  if (isLoading) {
    dom.reviewsFilterDropdown?.classList.remove(
      "reviews__filter-dropdown--show",
    );
    dom.reviewsFilterBtn?.setAttribute("aria-expanded", "false");
  }
}

function restoreProductSkeletonState() {
  if (dom.productGallery) {
    dom.productGallery.innerHTML = initialSkeletonMarkup.productGallery;
  }

  if (dom.productTitle) {
    dom.productTitle.innerHTML = initialSkeletonMarkup.productTitle;
  }

  if (dom.productRatingSection) {
    dom.productRatingSection.style.display = "";
  }

  if (dom.productRatingStars) {
    dom.productRatingStars.innerHTML = initialSkeletonMarkup.productRatingStars;
  }

  if (dom.productRatingText) {
    dom.productRatingText.innerHTML = initialSkeletonMarkup.productRatingText;
  }

  if (dom.productPriceCurrent) {
    dom.productPriceCurrent.innerHTML =
      initialSkeletonMarkup.productPriceCurrent;
  }

  if (dom.productPriceOld) {
    dom.productPriceOld.innerHTML = initialSkeletonMarkup.productPriceOld;
  }

  if (dom.productPriceDiscount) {
    dom.productPriceDiscount.innerHTML =
      initialSkeletonMarkup.productPriceDiscount;
  }

  if (dom.productDescription) {
    dom.productDescription.innerHTML = initialSkeletonMarkup.productDescription;
  }

  if (dom.productColorOptions) {
    dom.productColorOptions.innerHTML =
      initialSkeletonMarkup.productColorOptions;
  }

  if (dom.productSizeOptions) {
    dom.productSizeOptions.innerHTML = initialSkeletonMarkup.productSizeOptions;
  }

  if (dom.productDetailsContent) {
    setText(dom.productDetailsContent, "Product details are loading...");
  }

  if (dom.productFaqsList) {
    dom.productFaqsList.innerHTML = initialSkeletonMarkup.productFaqsList;
  }

  if (dom.otherProductsList) {
    dom.otherProductsList.innerHTML = initialSkeletonMarkup.relatedProductsList;
  }

  if (dom.reviewsList) {
    dom.reviewsList.classList.remove("reviews__list--fade-in");
    dom.reviewsList.innerHTML = initialSkeletonMarkup.reviewsList;
  }

  if (dom.reviewsCount) {
    setText(dom.reviewsCount, "(0)");
  }

  if (dom.reviewsLoadMore) {
    dom.reviewsLoadMore.style.display = "none";
  }

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
    name: review?.user?.name ?? review?.username ?? review?.name ?? "Anonymous",
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

  dom.reviewsList.classList.remove("reviews__list--fade-in");
  dom.reviewsList.innerHTML = buildReviewSkeletonMarkup(itemsCount);
}

function setReviewControlsDisabled(isDisabled) {
  const nextIsDisabled = Boolean(isDisabled);

  // Disable filter button
  if (dom.reviewsFilterBtn) {
    dom.reviewsFilterBtn.disabled = nextIsDisabled;
  }

  // Disable sort select
  if (dom.reviewsSortSelect) {
    dom.reviewsSortSelect.disabled = nextIsDisabled;
  }

  // Disable load-more button
  if (dom.reviewsLoadMore) {
    dom.reviewsLoadMore.disabled =
      nextIsDisabled || state.reviewPage >= state.reviewLastPage;
  }
}

function setInitialBootstrapUiLock(isLocked) {
  const nextIsLocked = Boolean(isLocked);
  state.isBootstrapUiLocked = nextIsLocked;

  dom.productOverview?.classList.toggle(
    "product-overview--bootstrap-locked",
    nextIsLocked,
  );
  dom.productsTabs?.classList.toggle("products-tabs--bootstrap-locked", nextIsLocked);

  dom.quantityInput && (dom.quantityInput.disabled = nextIsLocked);
  dom.quantityMinusButton && (dom.quantityMinusButton.disabled = nextIsLocked);
  dom.quantityPlusButton && (dom.quantityPlusButton.disabled = nextIsLocked);
  dom.addToCartButton && (dom.addToCartButton.disabled = nextIsLocked);
  dom.writeReviewButton && (dom.writeReviewButton.disabled = nextIsLocked);

  dom.productColorOptions
    ?.querySelectorAll(".js-color-option")
    .forEach((item) => {
      item.disabled = nextIsLocked;
    });

  dom.productSizeOptions
    ?.querySelectorAll(".js-size-option")
    .forEach((item) => {
      if (nextIsLocked) {
        item.dataset.initialDisabled = String(item.disabled);
        item.disabled = true;
        return;
      }

      const shouldRestoreDisabled = item.dataset.initialDisabled === "true";
      item.disabled = shouldRestoreDisabled;
      item.removeAttribute("data-initial-disabled");
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
  dom.reviewsLoadMore.classList.toggle("is-loading", nextIsLoading);
  dom.reviewsLoadMore.textContent = nextIsLoading
    ? LOAD_MORE_LOADING_TEXT
    : LOAD_MORE_DEFAULT_TEXT;
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

function renderFilledStarsOnly(rating, className) {
  return renderStars(rating, className, { showEmpty: false });
}

function normalizeHalfStarValue(value, fallback = 5) {
  const parsedValue = Number(value);
  const safeValue = Number.isFinite(parsedValue) ? parsedValue : fallback;
  return Math.round(Math.max(1, Math.min(5, safeValue)) * 2) / 2;
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
  const keyCandidates = ["currentUser", "authUser", "user", "profile"];

  for (const key of keyCandidates) {
    try {
      const rawValue = localStorage.getItem(key);
      if (!rawValue) {
        continue;
      }

      const parsedValue = JSON.parse(rawValue);
      const username = findUsernameFromStorageRecord(parsedValue);
      if (username) {
        return username;
      }
    } catch {
      continue;
    }
  }

  return "Guest";
}

function setActiveReviewFilterOption(activeStars) {
  const isAllOption = String(activeStars) === "All";
  const normalizedActiveStars = Number(activeStars);

  dom.reviewsFilterOptions.forEach((item) => {
    const itemStars = item.dataset.stars;
    const isMatched = isAllOption
      ? itemStars === "All"
      : itemStars !== "All" && Number(itemStars) === normalizedActiveStars;

    item.classList.toggle("reviews__filter-option--active", isMatched);
  });
}

function renderReviewDraftStars() {
  if (!dom.reviewRatingStars || !dom.reviewRatingValue) {
    return;
  }

  dom.reviewRatingStars.innerHTML = renderStars(
    state.reviewDraftStars,
    "review-modal__star",
    { showEmpty: true },
  );
  dom.reviewRatingValue.textContent = `${state.reviewDraftStars.toFixed(1)}/5`;
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

  dom.reviewRatingHitzones.innerHTML = Array.from({ length: 5 }, (_, index) => {
    const starIndex = index + 1;
    const leftValue = starIndex === 1 ? 1 : starIndex - 0.5;
    const rightValue = starIndex;

    return `<button type="button" class="review-modal__rating-hit" data-rating="${leftValue}" aria-label="Rate ${leftValue} stars"></button>
      <button type="button" class="review-modal__rating-hit" data-rating="${rightValue}" aria-label="Rate ${rightValue} stars"></button>`;
  }).join("");

  dom.reviewRatingHitzones
    .querySelectorAll(".review-modal__rating-hit")
    .forEach((hitArea) => {
      hitArea.addEventListener("click", () => {
        setReviewDraftStars(hitArea.dataset.rating);
      });
    });
}

function openReviewModal() {
  if (!dom.reviewModal) {
    return;
  }

  state.reviewDraftStars = 5;
  renderReviewDraftStars();

  if (dom.reviewUsernameInput) {
    dom.reviewUsernameInput.value = getLoggedInUsername();
  }

  if (dom.reviewCommentInput) {
    dom.reviewCommentInput.value = "";
  }

  dom.reviewModal.classList.add("review-modal--open");
  dom.reviewModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("review-modal-open");

  if (dom.reviewCommentInput) {
    dom.reviewCommentInput.focus();
  }
}

function closeReviewModal() {
  if (!dom.reviewModal) {
    return;
  }

  dom.reviewModal.classList.remove("review-modal--open");
  dom.reviewModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("review-modal-open");
}

async function handleReviewSubmit(event) {
  event.preventDefault();

  // Prevent duplicate submits
  if (state.isSubmittingReview) {
    return;
  }

  const normalizedProductId = String(state.selectedProductId || "").trim();
  if (!normalizedProductId) {
    return;
  }

  const username =
    String(dom.reviewUsernameInput?.value || "").trim() || "Guest";
  const comment = String(dom.reviewCommentInput?.value || "").trim();
  const stars = normalizeHalfStarValue(state.reviewDraftStars, 5);

  if (!comment) {
    dom.reviewCommentInput?.focus();
    return;
  }

  const submitButton = dom.reviewModalForm?.querySelector(
    "button[type='submit']",
  );

  // Set loading state
  state.isSubmittingReview = true;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.classList.add("is-loading");
    setText(submitButton, REVIEW_SUBMIT_LOADING_TEXT);
  }

  try {
    await reviewService.submitReview(normalizedProductId, {
      username,
      comment,
      stars,
    });
    closeReviewModal();
    state.reviewPage = 1;
    await loadReviews(normalizedProductId);
  } catch (error) {
    console.error("Failed to submit review", error);
  } finally {
    // Restore button state
    state.isSubmittingReview = false;
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.classList.remove("is-loading");
      setText(submitButton, REVIEW_SUBMIT_DEFAULT_TEXT);
    }
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
      ? Math.min(5, normalizedRating)
      : 0;

  if (safeRating === 0) {
    dom.productRatingSection.style.display = "none";
    dom.productRatingStars.innerHTML = "";
    dom.productRatingText.innerHTML = "";
    return;
  }

  dom.productRatingSection.style.display = "";
  dom.productRatingText.innerHTML = `${safeRating}/<span>5</span>`;
  dom.productRatingStars.innerHTML = renderFilledStarsOnly(
    safeRating,
    "review-card__star",
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

function resetProductSections(message) {
  relatedProductsCarousel?.destroy();
  relatedProductsCarousel = null;
  setText(dom.productTitle, message);
  setText(dom.productPriceCurrent, "");
  setText(dom.productPriceOld, "");
  setText(dom.productPriceDiscount, "");
  setText(dom.productDescription, "");
  setText(dom.productDetailsContent, "");
  if (dom.productRatingSection) {
    dom.productRatingSection.style.display = "none";
  }
  if (dom.productRatingText) {
    dom.productRatingText.innerHTML = "";
  }
  if (dom.productRatingStars) {
    dom.productRatingStars.innerHTML = "";
  }
  dom.productGallery.innerHTML = "";
  dom.productMainImage.removeAttribute("src");
  dom.productFaqsList.innerHTML = "";
  dom.otherProductsList.innerHTML = "";
  dom.reviewsList.innerHTML = "";
  dom.reviewsList.classList.remove("reviews__list--fade-in");
  setText(dom.reviewsCount, "(0)");
  if (dom.reviewsLoadMore) {
    dom.reviewsLoadMore.style.display = "none";
  }
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
        color: item?.color ?? null,
        size: item?.size ?? null,
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
    color: item?.color ?? null,
    size: item?.size ?? null,
  }));

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(serializableItems));
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
  quantityToAdd = 1,
  color = null,
  size = null,
) {
  if (!product?.id) {
    return;
  }

  const quantity = Math.max(1, Number(quantityToAdd) || 1);
  const cartItems = getStoredCartItems();
  const existingItem = cartItems.find(
    (item) =>
      String(item.id) === String(product.id) &&
      item.color === color &&
      item.size === size,
  );

  if (existingItem) {
    existingItem.quantity = Math.max(
      1,
      Number(existingItem.quantity || 0) + quantity,
    );
  } else {
    cartItems.push(toCartItem(product, quantity, color, size));
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
    const isOpen = dom.reviewsFilterDropdown?.classList.toggle(
      "reviews__filter-dropdown--show",
    );
    dom.reviewsFilterBtn?.setAttribute(
      "aria-expanded",
      String(Boolean(isOpen)),
    );
  });

  document.addEventListener("click", () => {
    dom.reviewsFilterDropdown?.classList.remove(
      "reviews__filter-dropdown--show",
    );
    dom.reviewsFilterBtn?.setAttribute("aria-expanded", "false");
  });

  dom.reviewsFilterOptions.forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();

      // Prevent duplicate requests
      if (state.isLoadingReviews) {
        return;
      }

      const stars = option.dataset.stars;
      setActiveReviewFilterOption(stars);
      state.reviewRating = stars === "All" ? null : Number(stars);
      state.reviewPage = 1;

      dom.reviewsFilterDropdown.classList.remove(
        "reviews__filter-dropdown--show",
      );
      dom.reviewsFilterBtn?.setAttribute("aria-expanded", "false");

      // Disable controls during load
      state.isLoadingReviews = true;
      setReviewControlsDisabled(true);

      loadReviews(state.selectedProductId, false, { showLoading: true }).finally(
        () => {
          state.isLoadingReviews = false;
          setReviewControlsDisabled(state.isBootstrapUiLocked);
        },
      );
    });
  });

  dom.reviewsSortSelect?.addEventListener("change", () => {
    // Prevent duplicate requests
    if (state.isLoadingReviews) {
      return;
    }

    state.reviewSort = dom.reviewsSortSelect.value;
    state.reviewPage = 1;

    // Disable controls during load
    state.isLoadingReviews = true;
    setReviewControlsDisabled(true);

    loadReviews(state.selectedProductId, false, { showLoading: true }).finally(
      () => {
        state.isLoadingReviews = false;
        setReviewControlsDisabled(state.isBootstrapUiLocked);
      },
    );
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

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeReviewModal();
    }
  });

  dom.reviewModalForm?.addEventListener("submit", handleReviewSubmit);

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
        window.setTimeout(resolve, REVIEW_LOADING_MIN_DELAY_MS);
      })
    : Promise.resolve();

  if (shouldShowLoading) {
    showReviewsSkeleton(state.reviewPageSize);
    if (dom.reviewsLoadMore) {
      dom.reviewsLoadMore.style.display = "none";
    }
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

  state.reviewLastPage = Number(meta?.last_page || 1);
  state.reviewTotal = Number(meta?.total || 0);
  state.reviews = append ? [...state.reviews, ...reviews] : [...reviews];

  setText(dom.reviewsCount, `(${state.reviewTotal})`);

  const mappedReviews = reviews.map((review) => mapReviewToCard(review));
  if (append) {
    const temp = document.createElement("ul");
    renderReviewsList(temp, mappedReviews, helpers);
    dom.reviewsList.insertAdjacentHTML("beforeend", temp.innerHTML);
  } else {
    renderReviewsList(dom.reviewsList, mappedReviews, helpers);
    dom.reviewsList.classList.remove("reviews__list--fade-in");
    dom.reviewsList.offsetWidth;
    dom.reviewsList.classList.add("reviews__list--fade-in");
  }

  if (dom.reviewsLoadMore) {
    dom.reviewsLoadMore.style.display =
      state.reviewPage >= state.reviewLastPage ? "none" : "";
  }
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
    const quantity = normalizeQuantity(dom.quantityInput?.value || "1");
    addProductToCart(
      product,
      quantity,
      state.selectedColorId ?? null,
      state.selectedSizeId ?? null,
    );
    triggerAddToCartFeedback(dom.addToCartButton);
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

    state.reviewPage = 1;
    state.reviewSort = "latest";
    state.reviewRating = null;
    state.reviewLastPage = 1;
    state.reviewTotal = 0;
    dom.reviewsSortSelect.value = "latest";
    setActiveReviewFilterOption("All");
    dom.reviewsFilterBtn?.setAttribute("aria-expanded", "false");

    await loadReviews(product.id, false, { showLoading: true });
  } catch (error) {
    console.error("Failed to load product detail.", error);
    resetProductSections("Product not found");
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

export async function initProductDetailPage() {
  bindStaticEvents();

  const productId = getQueryParam("id");
  if (!productId) {
    console.warn("No product id found in URL");
    resetProductSections("Product not found");
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
}
