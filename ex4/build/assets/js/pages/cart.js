import * as productService from "../services/productService.js";
import { CART_STORAGE_KEY } from "../constants/storageKeys.js";
import { formatPrice } from "../utils/formatters.js";
import {
  getStoredCartItems,
  persistStoredCartItems,
} from "../utils/storageUtils.js";

const DELIVERY_FEE = 0;
const DISCOUNT_RATE = 0;
const CART_HYDRATION_STATES = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
};
const CART_LOAD_ERROR_MESSAGE =
  "We could not load your cart right now. Please check your connection and try again.";
const CART_IMAGE_FALLBACK_SRC = "./assets/images/pic_t_shirt.png";

let cartItemsState = [];
let cartHydrationState = CART_HYDRATION_STATES.IDLE;
let cartHydrationErrorMessage = "";
let activeHydrationRequestId = 0;
let activeHydrationController = null;
let isCartLoading = false;

const dom = {
  cartPage: document.querySelector(".cart-page"),
  cartItems: document.querySelector(".js-cart-items"),
  cartSummary: document.querySelector(".js-cart-summary"),
  subtotal: document.querySelector(".js-cart-subtotal"),
  discount: document.querySelector(".js-cart-discount"),
  delivery: document.querySelector(".js-cart-delivery"),
  total: document.querySelector(".js-cart-total"),
  checkoutButton: document.querySelector(".js-cart-checkout"),
};

const CART_INTERACTIVE_CONTROL_SELECTORS = [
  ".js-cart-item-remove",
  ".js-cart-item-qty-minus",
  ".js-cart-item-qty-plus",
  ".js-cart-checkout",
  ".js-cart-coupon-input",
  ".js-cart-coupon-apply",
  ".js-cart-retry",
];

function setButtonLoadingState(button, isLoading, loadingLabel = "Processing...") {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const textElement = button.querySelector(".cart-summary__checkout-text");
  if (!(textElement instanceof HTMLElement)) {
    return;
  }

  if (isLoading) {
    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = textElement.textContent?.trim() || "";
    }

    textElement.textContent = loadingLabel;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    return;
  }

  textElement.textContent = button.dataset.defaultLabel || textElement.textContent;
  button.disabled = false;
  button.removeAttribute("aria-busy");
}

function setCartImageState(shell, state) {
  if (!(shell instanceof HTMLElement)) {
    return;
  }

  shell.classList.remove(
    "cart-item__image-shell--loading",
    "cart-item__image-shell--loaded",
    "cart-item__image-shell--error",
  );
  shell.classList.add(`cart-item__image-shell--${state}`);
}

function bindCartItemImageState(imageElement) {
  if (!(imageElement instanceof HTMLImageElement)) {
    return;
  }

  const imageShell = imageElement.closest(".js-cart-image-shell");
  if (!(imageShell instanceof HTMLElement)) {
    return;
  }

  const onImageLoad = () => {
    setCartImageState(imageShell, "loaded");
  };

  const onImageError = () => {
    if (imageElement.dataset.fallbackApplied === "true") {
      setCartImageState(imageShell, "error");
      return;
    }

    imageElement.dataset.fallbackApplied = "true";
    setCartImageState(imageShell, "loading");
    imageElement.src = CART_IMAGE_FALLBACK_SRC;
  };

  if (imageElement.complete) {
    if (imageElement.naturalWidth > 0) {
      onImageLoad();
    } else {
      onImageError();
    }
    return;
  }

  imageElement.addEventListener("load", onImageLoad, { once: true });
  imageElement.addEventListener("error", onImageError, { once: false });
}

function bindCartItemImages() {
  if (!dom.cartItems) {
    return;
  }

  const imageElements = dom.cartItems.querySelectorAll(".js-cart-item-image");
  imageElements.forEach((imageElement) => bindCartItemImageState(imageElement));
}

function createCartSkeletonItemMarkup() {
  return `<article class="cart-item cart-item--skeleton" aria-hidden="true">
    <div class="cart-item__image cart-skeleton-block"></div>
    <div class="cart-item__content">
      <div class="cart-item__head">
        <div class="cart-skeleton-block cart-skeleton-block--title"></div>
        <div class="cart-skeleton-block cart-skeleton-block--icon"></div>
      </div>
      <div class="cart-skeleton-block cart-skeleton-block--meta"></div>
      <div class="cart-skeleton-block cart-skeleton-block--meta cart-skeleton-block--meta-short"></div>
      <div class="cart-item__foot">
        <div class="cart-skeleton-block cart-skeleton-block--price"></div>
        <div class="cart-item__quantity cart-item__quantity--skeleton">
          <div class="cart-skeleton-block cart-skeleton-block--qty-icon"></div>
          <div class="cart-skeleton-block cart-skeleton-block--qty-value"></div>
          <div class="cart-skeleton-block cart-skeleton-block--qty-icon"></div>
        </div>
      </div>
    </div>
  </article>`;
}

function createSummarySkeletonMarkup(isTotal = false) {
  const summaryClass = isTotal
    ? "cart-skeleton-block cart-skeleton-block--summary cart-skeleton-block--summary-total"
    : "cart-skeleton-block cart-skeleton-block--summary";

  return `<span class="${summaryClass}"></span>`;
}

function setControlDisabledState(control, isDisabled) {
  if (!(control instanceof HTMLElement)) {
    return;
  }

  if (
    control instanceof HTMLButtonElement ||
    control instanceof HTMLInputElement ||
    control instanceof HTMLSelectElement ||
    control instanceof HTMLTextAreaElement
  ) {
    control.disabled = isDisabled;
  }

  control.setAttribute("aria-disabled", String(isDisabled));
  control.classList.toggle("is-disabled", isDisabled);
}

function setCartControlsDisabled(isDisabled, options = {}) {
  const allowRetry = options.allowRetry === true;
  const controls = document.querySelectorAll(
    CART_INTERACTIVE_CONTROL_SELECTORS.join(","),
  );

  controls.forEach((control) => {
    if (
      allowRetry &&
      control instanceof HTMLElement &&
      control.classList.contains("js-cart-retry")
    ) {
      setControlDisabledState(control, false);
      return;
    }

    setControlDisabledState(control, isDisabled);
  });
}

function setCartLoadingState(isLoading) {
  isCartLoading = isLoading;

  if (dom.cartItems) {
    dom.cartItems.setAttribute("aria-busy", String(isLoading));
    dom.cartItems.classList.toggle("cart-items--loading", isLoading);
  }

  if (dom.cartSummary) {
    dom.cartSummary.setAttribute("aria-busy", String(isLoading));
  }

  if (dom.cartPage) {
    dom.cartPage.classList.toggle("cart-page--loading", isLoading);
  }

  setCartControlsDisabled(isLoading);
}

function setCartHydrationState(nextState, errorMessage = "") {
  cartHydrationState = nextState;
  cartHydrationErrorMessage = errorMessage;

  const isLoadingState = nextState === CART_HYDRATION_STATES.LOADING;
  setCartLoadingState(isLoadingState);

  if (nextState === CART_HYDRATION_STATES.SUCCESS) {
    setCartControlsDisabled(false);
    return;
  }

  if (nextState === CART_HYDRATION_STATES.ERROR) {
    setCartControlsDisabled(true, { allowRetry: true });
    return;
  }

  setCartControlsDisabled(true);
}

function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError";
}

function renderCartItemsSkeleton(itemsCount = 2) {
  if (!dom.cartItems) {
    return;
  }

  const skeletonCount = Math.max(1, Number(itemsCount) || 3);
  dom.cartItems.innerHTML = Array.from({ length: skeletonCount }, () =>
    createCartSkeletonItemMarkup(),
  ).join("");
}

function renderSummarySkeleton() {
  if (!dom.subtotal || !dom.discount || !dom.delivery || !dom.total) {
    return;
  }

  dom.subtotal.innerHTML = createSummarySkeletonMarkup();
  dom.discount.innerHTML = createSummarySkeletonMarkup();
  dom.delivery.innerHTML = createSummarySkeletonMarkup();
  dom.total.innerHTML = createSummarySkeletonMarkup(true);
}

function renderSummaryUnavailable() {
  if (!dom.subtotal || !dom.discount || !dom.delivery || !dom.total) {
    return;
  }

  dom.subtotal.textContent = "--";
  dom.discount.textContent = "--";
  dom.delivery.textContent = "--";
  dom.total.textContent = "--";
}

function renderInitialLoadingState(itemsCount = 2) {
  setCartHydrationState(CART_HYDRATION_STATES.LOADING);
  renderCartItemsSkeleton(itemsCount);
  renderSummarySkeleton();
}

function renderCartFetchError(message = CART_LOAD_ERROR_MESSAGE) {
  if (!dom.cartItems) {
    return;
  }

  const contentMessage = String(message || CART_LOAD_ERROR_MESSAGE).trim();
  dom.cartItems.innerHTML = `<div class="cart-fetch-state cart-fetch-state--error" role="status" aria-live="polite">
    <p class="cart-fetch-state__title">Unable to load cart items</p>
    <p class="cart-fetch-state__description">${contentMessage}</p>
    <button class="cart-fetch-state__retry js-cart-retry" type="button">Retry</button>
  </div>`;

  renderSummaryUnavailable();
  setCartHydrationState(CART_HYDRATION_STATES.ERROR, contentMessage);
}

function getStoredCart() {
  return getStoredCartItems(CART_STORAGE_KEY);
}

function persistStoredCart(items) {
  persistStoredCartItems(CART_STORAGE_KEY, items);
}

function calculateCartTotals(items) {
  const subtotal = items.reduce((total, item) => {
    const unitPrice = Number(item.pricing?.current || 0);
    return total + unitPrice * Number(item.quantity || 1);
  }, 0);

  const discountAmount = subtotal * DISCOUNT_RATE;
  const deliveryFee = items.length > 0 ? DELIVERY_FEE : 0;
  const total = subtotal - discountAmount + deliveryFee;

  return {
    subtotal,
    discountAmount,
    deliveryFee,
    total,
  };
}

function renderSummary(items) {
  const totals = calculateCartTotals(items);

  dom.subtotal.textContent = formatPrice(totals.subtotal, "USD");
  dom.discount.textContent = formatPrice(totals.discountAmount, "USD");
  dom.delivery.textContent = formatPrice(totals.deliveryFee, "USD");
  dom.total.textContent = formatPrice(totals.total, "USD");
}

function renderEmptyCart() {
  if (!dom.cartItems) {
    return;
  }

  cartItemsState = [];
  dom.cartItems.innerHTML = "<p>Your cart is empty.</p>";
  renderSummary([]);
  setCartHydrationState(CART_HYDRATION_STATES.SUCCESS);
}

function renderCartItems(items) {
  if (!dom.cartItems) {
    return;
  }

  dom.cartItems.innerHTML = items
    .map((item) => {
      const quantity = Number(item.quantity || 1);
      const currentPrice = Number(item.pricing?.current || 0);
      const originalPrice =
        item.pricing?.original === null || item.pricing?.original === undefined
          ? null
          : Number(item.pricing.original);
      const discountPercent =
        item.pricing?.discountPercent === null ||
        item.pricing?.discountPercent === undefined
          ? null
          : Number(item.pricing.discountPercent);
      const currency = item.pricing?.currency || "USD";
      const lineCurrentPrice = currentPrice * quantity;
      const lineOriginalPrice =
        originalPrice && originalPrice > currentPrice
          ? originalPrice * quantity
          : null;
      const thumbnailUrl =
        item.thumbnail || item.images?.[0]?.url || CART_IMAGE_FALLBACK_SRC;

      return `<article class="cart-item" data-cart-product-id="${item.id}" data-cart-color="${item.color ?? ""}" data-cart-size="${item.size ?? ""}">
        <div class="cart-item__image-shell cart-item__image-shell--loading js-cart-image-shell" aria-busy="true">
          <span class="cart-item__image-placeholder cart-skeleton-block" aria-hidden="true"></span>
          <img class="cart-item__image js-cart-item-image" src="${thumbnailUrl}" alt="${item.thumbnailAlt || item.name || "Product image"}" loading="lazy" decoding="async" />
        </div>
        <div class="cart-item__content">
          <div class="cart-item__head">
            <h2 class="cart-item__name">${item.name || "Product"}</h2>
            <button class="cart-item__remove js-cart-item-remove" type="button" aria-label="Remove item">
            </button>
          </div>
          ${item.size ? `<p class="cart-item__meta">Size: ${item.size}</p>` : ""}
          ${item.color ? `<p class="cart-item__meta">Color: ${item.color}</p>` : ""}
          <div class="cart-item__foot">
            <div class="cart-item__price-wrap">
              <p class="cart-item__price">${formatPrice(lineCurrentPrice, currency)}</p>
              ${lineOriginalPrice ? `<p class="cart-item__price-original">${formatPrice(lineOriginalPrice, currency)}</p>` : ""}
              ${discountPercent ? `<p class="cart-item__price-discount">-${discountPercent}%</p>` : ""}
            </div>
            <div class="cart-item__quantity" aria-label="Quantity controls">
              <button class="js-cart-item-qty-minus" type="button" aria-label="Decrease quantity">
                <img src="./assets/images/icn_minus.svg" alt="Minus" />
              </button>
              <input class="js-cart-item-qty-input" type="text" value="${item.quantity}" aria-label="Quantity" readonly />
              <button class="js-cart-item-qty-plus" type="button" aria-label="Increase quantity">
                <img src="./assets/images/icn_plus.svg" alt="Plus" />
              </button>
            </div>
          </div>
        </div>
      </article>`;
    })
    .join("");

  renderSummary(items);
  bindCartItemImages();
  setCartHydrationState(CART_HYDRATION_STATES.SUCCESS);
}

function updateCartItemQuantity(productId, color, size, delta) {
  const item = cartItemsState.find(
    (cartItem) =>
      String(cartItem.id) === String(productId) &&
      (cartItem.color ?? "") === (color ?? "") &&
      (cartItem.size ?? "") === (size ?? ""),
  );

  if (!item) {
    return;
  }

  item.quantity = Math.max(1, Number(item.quantity || 1) + delta);
  persistStoredCart(cartItemsState);
  renderCartItems(cartItemsState);
}

function removeCartItem(productId, color, size) {
  cartItemsState = cartItemsState.filter(
    (item) =>
      !(
        String(item.id) === String(productId) &&
        (item.color ?? "") === (color ?? "") &&
        (item.size ?? "") === (size ?? "")
      ),
  );

  persistStoredCart(cartItemsState);

  if (cartItemsState.length === 0) {
    renderEmptyCart();
    return;
  }

  renderCartItems(cartItemsState);
}

function bindCartEvents() {
  dom.cartItems?.addEventListener("click", (event) => {
    if (isCartLoading) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const retryButton = target.closest(".js-cart-retry");
    if (retryButton) {
      hydrateCartItems();
      return;
    }

    if (cartHydrationState !== CART_HYDRATION_STATES.SUCCESS) {
      return;
    }

    const cartItemElement = target.closest("[data-cart-product-id]");
    if (!cartItemElement) {
      return;
    }

    const productId = cartItemElement.getAttribute("data-cart-product-id");
    const productColor = cartItemElement.getAttribute("data-cart-color") ?? "";
    const productSize = cartItemElement.getAttribute("data-cart-size") ?? "";
    if (!productId) {
      return;
    }

    const minusButton = target.closest(".js-cart-item-qty-minus");
    const plusButton = target.closest(".js-cart-item-qty-plus");
    const removeButton = target.closest(".js-cart-item-remove");

    if (removeButton) {
      removeCartItem(productId, productColor, productSize);
      return;
    }

    if (minusButton) {
      updateCartItemQuantity(productId, productColor, productSize, -1);
      return;
    }

    if (plusButton) {
      updateCartItemQuantity(productId, productColor, productSize, 1);
    }
  });

  dom.checkoutButton?.addEventListener("click", () => {
    if (isCartLoading) {
      return;
    }

    if (cartHydrationState !== CART_HYDRATION_STATES.SUCCESS) {
      return;
    }

    setButtonLoadingState(dom.checkoutButton, true, "Redirecting...");
    window.location.href = "checkout.html";
  });
}

async function hydrateCartItems() {
  const storedCart = getStoredCart();
  if (storedCart.length === 0) {
    renderEmptyCart();
    return;
  }

  if (activeHydrationController) {
    activeHydrationController.abort();
  }

  activeHydrationRequestId += 1;
  const requestId = activeHydrationRequestId;
  activeHydrationController = new AbortController();
  const skeletonCount = Math.min(Math.max(storedCart.length, 1), 3);
  renderInitialLoadingState(skeletonCount);

  try {
    const cartProductResults = await Promise.allSettled(
      storedCart.map(async (item) => {
        const product = await productService.getProductById(item.id, {
          signal: activeHydrationController?.signal,
          allowMockFallback: false,
        });

        if (!product) {
          return null;
        }

        return {
          ...product,
          quantity: item.quantity,
          color: item?.color ?? null,
          size: item?.size ?? null,
        };
      }),
    );

    if (requestId !== activeHydrationRequestId) {
      return;
    }

    let failedRequestCount = 0;
    const validItems = cartProductResults.reduce((items, result) => {
      if (result.status === "fulfilled") {
        if (result.value) {
          items.push(result.value);
        }

        return items;
      }

      if (!isAbortError(result.reason)) {
        failedRequestCount += 1;
      }

      return items;
    }, []);

    if (failedRequestCount > 0 && validItems.length === 0) {
      renderCartFetchError(CART_LOAD_ERROR_MESSAGE);
      return;
    }

    if (validItems.length === 0) {
      renderEmptyCart();
      return;
    }

    cartItemsState = validItems;
    persistStoredCart(cartItemsState);
    renderCartItems(cartItemsState);
  } catch (error) {
    if (requestId !== activeHydrationRequestId || isAbortError(error)) {
      return;
    }

    console.error("Failed to load cart items.", error);
    renderCartFetchError(CART_LOAD_ERROR_MESSAGE);
  } finally {
    if (requestId === activeHydrationRequestId) {
      activeHydrationController = null;
    }
  }
}

export async function initCartPage() {
  bindCartEvents();
  await hydrateCartItems();
}
