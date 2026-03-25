import { initHeader } from "../components/header.js";
import {
  renderCatalogProducts,
  renderProductSkeleton,
} from "../components/productComponents.js";
import { renderReviewCards } from "../components/reviewComponents.js";
import { getProducts } from "../services/productService.js";
import { formatDate, formatPrice } from "../utils/formatters.js";
import { renderStars } from "../utils/ratingUtils.js";

const SELECTORS = {
  linkButtons: ".js-btn-link",
  newArrivals: ".js-home-new-arrivals",
  topSelling: ".js-home-top-selling",
  reviewsViewport: ".js-home-reviews-viewport",
  reviewsTrack: ".js-home-reviews-track",
  reviewsPrev: ".js-home-review-prev",
  reviewsNext: ".js-home-review-next",
};

function initButtonLinks() {
  const buttons = document.querySelectorAll(SELECTORS.linkButtons);

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetUrl = button.dataset.href;

      if (!targetUrl) {
        return;
      }

      window.location.href = targetUrl;
    });
  });
}

const HOME_REVIEWS = [
  {
    ratingStar: 5,
    name: "Sarah M.",
    desc: "I'm blown away by the quality and style of the clothes I received from Shop.co. From casual wear to elegant dresses, every piece I've bought has exceeded my expectations.",
    isVerified: true,
  },
  {
    ratingStar: 5,
    name: "Alex K.",
    desc: "Finding clothes that align with my personal style used to be a challenge until I discovered Shop.co. The range of options they offer is truly remarkable.",
    isVerified: true,
  },
  {
    ratingStar: 5,
    name: "James L.",
    desc: "As someone who's always on the lookout for unique fashion pieces, I'm thrilled to have stumbled upon Shop.co. Their selection is diverse and on trend.",
    isVerified: true,
  },
  {
    ratingStar: 5,
    name: "Monica R.",
    desc: "The ordering process was smooth, delivery was quick, and the fit of the clothes was exactly what I hoped for. I'll definitely shop here again.",
    isVerified: true,
  },
];

function syncReviewNavState(track, prevButton, nextButton) {
  if (!track || !prevButton || !nextButton) {
    return;
  }

  const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0);
  const currentScrollLeft = Math.max(track.scrollLeft, 0);

  prevButton.disabled = currentScrollLeft <= 0;
  nextButton.disabled = currentScrollLeft >= maxScrollLeft - 1;
}

function syncReviewViewportState(viewport, track) {
  if (!viewport || !track) {
    return;
  }

  const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0);
  const currentScrollLeft = Math.max(track.scrollLeft, 0);
  const hasOverflow = maxScrollLeft > 1;
  const isAtStart = currentScrollLeft <= 1;
  const isAtEnd = currentScrollLeft >= maxScrollLeft - 1;

  viewport.classList.toggle("has-overflow", hasOverflow);
  viewport.classList.toggle("is-not-at-start", hasOverflow && !isAtStart);
  viewport.classList.toggle("is-not-at-end", hasOverflow && !isAtEnd);
}

function renderHomeReviews(reviews = HOME_REVIEWS) {
  const track = document.querySelector(SELECTORS.reviewsTrack);

  if (!track) {
    return;
  }

  renderReviewCards(
    track,
    reviews,
    {
      renderStars,
      formatDate,
    },
    {
      showMoreButton: false,
      showDate: false,
    },
  );

  track.setAttribute("aria-busy", "false");
}

function getReviewScrollStep(track) {
  const firstCard = track?.firstElementChild;

  if (!firstCard) {
    return 0;
  }

  const cardWidth = firstCard.getBoundingClientRect().width;
  const styles = window.getComputedStyle(track);
  const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;

  return cardWidth + gap;
}

function initReviewSlider() {
  const viewport = document.querySelector(SELECTORS.reviewsViewport);
  const track = document.querySelector(SELECTORS.reviewsTrack);
  const prevButton = document.querySelector(SELECTORS.reviewsPrev);
  const nextButton = document.querySelector(SELECTORS.reviewsNext);

  if (!track || !prevButton || !nextButton) {
    return;
  }

  syncReviewNavState(track, prevButton, nextButton);
  syncReviewViewportState(viewport, track);

  prevButton.addEventListener("click", () => {
    track.scrollBy({ left: -getReviewScrollStep(track), behavior: "smooth" });
  });

  nextButton.addEventListener("click", () => {
    track.scrollBy({ left: getReviewScrollStep(track), behavior: "smooth" });
  });

  track.addEventListener("scroll", () => {
    syncReviewNavState(track, prevButton, nextButton);
    syncReviewViewportState(viewport, track);
  });

  window.addEventListener("resize", () => {
    syncReviewNavState(track, prevButton, nextButton);
    syncReviewViewportState(viewport, track);
  });
}

function pickTopSelling(products, limit = 4) {
  return [...products]
    .sort((firstItem, secondItem) => {
      return Number(secondItem.rating || 0) - Number(firstItem.rating || 0);
    })
    .slice(0, limit);
}

function renderHomeProductGroup(container, products) {
  if (!container) {
    return;
  }

  renderCatalogProducts(container, products, {
    formatPrice,
    renderStars,
  });

  container.setAttribute("aria-busy", "false");
}

async function initHomeProducts() {
  const newArrivalsContainer = document.querySelector(SELECTORS.newArrivals);
  const topSellingContainer = document.querySelector(SELECTORS.topSelling);

  if (!newArrivalsContainer || !topSellingContainer) {
    return;
  }

  renderProductSkeleton(newArrivalsContainer, 4);
  renderProductSkeleton(topSellingContainer, 4);

  try {
    const productsResult = await getProducts({ per_page: 12 });
    const products = Array.isArray(productsResult.products)
      ? productsResult.products
      : [];

    const newArrivals = products.slice(0, 4);
    const topSelling = pickTopSelling(products, 4);

    renderHomeProductGroup(newArrivalsContainer, newArrivals);
    renderHomeProductGroup(topSellingContainer, topSelling);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load homepage products.";

    newArrivalsContainer.innerHTML = `<p class="catalog-products__empty">${message}</p>`;
    topSellingContainer.innerHTML = `<p class="catalog-products__empty">${message}</p>`;

    newArrivalsContainer.setAttribute("aria-busy", "false");
    topSellingContainer.setAttribute("aria-busy", "false");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initButtonLinks();
  renderHomeReviews();
  initReviewSlider();
  initHomeProducts();
});
