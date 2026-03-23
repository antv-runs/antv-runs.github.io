import * as productService from "../services/productService.js";
import { CART_STORAGE_KEY } from "../constants/storageKeys.js";
import { formatPrice } from "../utils/formatters.js";
import { getStoredCartItems, persistStoredCartItems } from "../utils/storageUtils.js";

// --- CONSTANTS ---
const CONFIG = {
  DELIVERY_FEE: 0,
  DISCOUNT_RATE: 0,
  MOCK_DELAY_MIN: 700,
  MOCK_DELAY_MAX: 1200,
};

const HYDRATION_STATES = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
};

const SELECTORS = {
  PAGE: ".js-cart-page",
  LAYOUT: ".js-cart-layout",
  EMPTY_STATE: ".js-cart-empty",
  ITEMS_CONTAINER: ".js-cart-items",
  SUMMARY: ".js-cart-summary",
  SUBTOTAL: ".js-cart-subtotal",
  DISCOUNT: ".js-cart-discount",
  DELIVERY: ".js-cart-delivery",
  TOTAL: ".js-cart-total",
  CHECKOUT_BTN: ".js-cart-checkout",
  PROMO_FORM: ".js-cart-promo-form",
  PROMO_INPUT: ".js-cart-coupon-input",
  PROMO_MSG: ".js-cart-coupon-msg",
  PROMO_APPLY_BTN: ".js-cart-coupon-apply",
  ITEM: ".cart-item",
  ITEM_IMAGE: ".js-cart-item-image",
  IMAGE_SHELL: ".js-cart-image-shell",
  ITEM_REMOVE: ".js-cart-item-remove",
  QTY_MINUS: ".js-cart-item-qty-minus",
  QTY_PLUS: ".js-cart-item-qty-plus",
  QTY_INPUT: ".js-cart-item-qty-input",
  ITEM_PRICE: ".js-cart-item-price",
  ITEM_ORIG_PRICE: ".js-cart-item-price-orig",
  RETRY: ".js-cart-retry",
  CHECKOUT_TEXT: ".cart-summary__checkout-text",
};

const CSS_CLASSES = {
  IS_DISABLED: "is-disabled",
  IS_LOADING: "is-loading",
  IMAGE_LOADING: "cart-item__image-shell--loading",
  IMAGE_LOADED: "cart-item__image-shell--loaded",
  IMAGE_ERROR: "cart-item__image-shell--error",
  CART_LOADING: "cart-items--loading",
  PAGE_LOADING: "cart-page--loading",
  PROMO_ERROR: "cart-summary__coupon-msg--error",
};

const DATA_ATTRS = {
  PRODUCT_ID: "data-cart-product-id",
  COLOR: "data-cart-color",
  SIZE: "data-cart-size",
  FALLBACK_APPLIED: "data-fallback-applied",
  DEFAULT_LABEL: "data-default-label",
};

const MESSAGES = {
  LOAD_ERROR: "We could not load your cart right now. Please check your connection and try again.",
  PROMO_INVALID: "Promo code is invalid or unavailable.",
  PROMO_ERROR: "An error occurred. Please try again.",
  IMAGE_FALLBACK_SRC: "~/images/pic_t_shirt.png",
};

const BUTTON_LABELS = {
  PROCESSING: "Processing...",
  APPLYING: "Applying...",
  REDIRECTING: "Redirecting...",
  RETRY: "Retry",
};

const FALLBACK_TEXT = {
  PRODUCT: "Product",
  IMAGE: "Product image",
  DECREASE_QTY: "Decrease quantity",
  INCREASE_QTY: "Increase quantity",
  REMOVE_ITEM: "Remove item",
};

const INTERACTIVE_CONTROLS = [
  SELECTORS.ITEM_REMOVE,
  SELECTORS.QTY_MINUS,
  SELECTORS.QTY_PLUS,
  SELECTORS.CHECKOUT_BTN,
  SELECTORS.PROMO_INPUT,
  SELECTORS.PROMO_APPLY_BTN,
  SELECTORS.RETRY,
];

// --- STATE ---
let cartItemsState = [];
let cartHydrationState = HYDRATION_STATES.IDLE;
let cartHydrationErrorMessage = "";
let activeHydrationRequestId = 0;
let activeHydrationController = null;
let isCartLoading = false;
let isPromoSubmitting = false;

const dom = {};

// --- INIT DOM ---
function initDOM() {
  dom.cartPage = document.querySelector(SELECTORS.PAGE);
  dom.cartLayout = document.querySelector(SELECTORS.LAYOUT);
  dom.cartEmpty = document.querySelector(SELECTORS.EMPTY_STATE);
  dom.cartItems = document.querySelector(SELECTORS.ITEMS_CONTAINER);
  dom.cartSummary = document.querySelector(SELECTORS.SUMMARY);
  dom.subtotal = document.querySelector(SELECTORS.SUBTOTAL);
  dom.discount = document.querySelector(SELECTORS.DISCOUNT);
  dom.delivery = document.querySelector(SELECTORS.DELIVERY);
  dom.total = document.querySelector(SELECTORS.TOTAL);
  dom.checkoutButton = document.querySelector(SELECTORS.CHECKOUT_BTN);
  dom.promoForm = document.querySelector(SELECTORS.PROMO_FORM);
  dom.promoInput = document.querySelector(SELECTORS.PROMO_INPUT);
  dom.promoMsg = document.querySelector(SELECTORS.PROMO_MSG);
  dom.applyBtn = document.querySelector(SELECTORS.PROMO_APPLY_BTN);
}

// --- HELPERS ---
function setControlDisabledState(control, isDisabled) {
  if (!(control instanceof HTMLElement)) return;

  if (["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(control.tagName)) {
    control.disabled = isDisabled;
  }

  control.setAttribute("aria-disabled", String(isDisabled));
  control.classList.toggle(CSS_CLASSES.IS_DISABLED, isDisabled);
}

function setButtonLoadingState(button, isLoading, loadingLabel = BUTTON_LABELS.PROCESSING) {
  if (!(button instanceof HTMLButtonElement)) return;

  const textElement = button.querySelector(SELECTORS.CHECKOUT_TEXT) || button;

  if (isLoading) {
    if (!button.getAttribute(DATA_ATTRS.DEFAULT_LABEL)) {
      button.setAttribute(DATA_ATTRS.DEFAULT_LABEL, textElement.textContent?.trim() || "");
    }
    textElement.textContent = loadingLabel;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.classList.add(CSS_CLASSES.IS_LOADING);
    return;
  }

  const defaultLabel = button.getAttribute(DATA_ATTRS.DEFAULT_LABEL);
  if (defaultLabel) {
    textElement.textContent = defaultLabel;
  }
  button.disabled = false;
  button.removeAttribute("aria-busy");
  button.classList.remove(CSS_CLASSES.IS_LOADING);
}

function setCartImageState(shell, stateClass) {
  if (!(shell instanceof HTMLElement)) return;
  shell.classList.remove(
    CSS_CLASSES.IMAGE_LOADING,
    CSS_CLASSES.IMAGE_LOADED,
    CSS_CLASSES.IMAGE_ERROR
  );
  shell.classList.add(stateClass);
}

function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError";
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

  const discountAmount = subtotal * CONFIG.DISCOUNT_RATE;
  const deliveryFee = items.length > 0 ? CONFIG.DELIVERY_FEE : 0;
  const total = subtotal - discountAmount + deliveryFee;

  return { subtotal, discountAmount, deliveryFee, total };
}

// --- SYNC & LOGIC ---
function syncCartItemQuantityControls(cartItemElement) {
  const input = cartItemElement.querySelector(SELECTORS.QTY_INPUT);
  const quantity = input ? (Number(input.value) || 1) : 1;
  const minusBtn = cartItemElement.querySelector(SELECTORS.QTY_MINUS);

  if (minusBtn) {
    setControlDisabledState(minusBtn, quantity <= 1);
  }
}

function syncAllCartQuantityControls() {
  if (!dom.cartItems) return;
  const items = dom.cartItems.querySelectorAll(SELECTORS.ITEM);
  items.forEach(syncCartItemQuantityControls);
}

function syncPromoApplyButtonState() {
  if (!dom.promoInput || !dom.applyBtn) return;
  const isEmpty = dom.promoInput.value.trim().length === 0;

  if (cartHydrationState === HYDRATION_STATES.SUCCESS) {
    setControlDisabledState(dom.applyBtn, isEmpty || isPromoSubmitting);
    setControlDisabledState(dom.promoInput, isPromoSubmitting);
  }
}

function setPromoFeedback(message, isError = true) {
  if (!dom.promoMsg) return;

  if (!message) {
    dom.promoMsg.hidden = true;
    return;
  }

  dom.promoMsg.textContent = message;
  dom.promoMsg.hidden = false;
  dom.promoMsg.className = `${SELECTORS.PROMO_MSG.slice(1)} ${isError ? CSS_CLASSES.PROMO_ERROR : ""}`;
}

function setCartControlsDisabled(isDisabled, options = {}) {
  const allowRetry = options.allowRetry === true;
  const controls = document.querySelectorAll(INTERACTIVE_CONTROLS.join(","));

  controls.forEach((control) => {
    if (allowRetry && control instanceof HTMLElement && control.classList.contains(SELECTORS.RETRY.slice(1))) {
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
    dom.cartItems.classList.toggle(CSS_CLASSES.CART_LOADING, isLoading);
  }
  if (dom.cartSummary) dom.cartSummary.setAttribute("aria-busy", String(isLoading));
  if (dom.cartPage) dom.cartPage.classList.toggle(CSS_CLASSES.PAGE_LOADING, isLoading);
  setCartControlsDisabled(isLoading);
}

function setCartHydrationState(nextState, errorMessage = "") {
  cartHydrationState = nextState;
  cartHydrationErrorMessage = errorMessage;

  const isLoadingState = nextState === HYDRATION_STATES.LOADING;
  setCartLoadingState(isLoadingState);

  if (nextState === HYDRATION_STATES.SUCCESS) {
    setCartControlsDisabled(false);
    return;
  }

  if (nextState === HYDRATION_STATES.ERROR) {
    setCartControlsDisabled(true, { allowRetry: true });
    return;
  }

  setCartControlsDisabled(true);
}

// --- RENDERERS ---
function bindCartItemImageState(imageElement) {
  if (!(imageElement instanceof HTMLImageElement)) return;
  const imageShell = imageElement.closest(SELECTORS.IMAGE_SHELL);
  if (!(imageShell instanceof HTMLElement)) return;

  const onImageLoad = () => setCartImageState(imageShell, CSS_CLASSES.IMAGE_LOADED);
  const onImageError = () => {
    if (imageElement.getAttribute(DATA_ATTRS.FALLBACK_APPLIED) === "true") {
      setCartImageState(imageShell, CSS_CLASSES.IMAGE_ERROR);
      return;
    }
    imageElement.setAttribute(DATA_ATTRS.FALLBACK_APPLIED, "true");
    setCartImageState(imageShell, CSS_CLASSES.IMAGE_LOADING);
    imageElement.src = MESSAGES.IMAGE_FALLBACK_SRC;
  };

  if (imageElement.complete) {
    if (imageElement.naturalWidth > 0) onImageLoad();
    else onImageError();
    return;
  }

  imageElement.addEventListener("load", onImageLoad, { once: true });
  imageElement.addEventListener("error", onImageError, { once: false });
}

function bindCartItemImages() {
  if (!dom.cartItems) return;
  const imageElements = dom.cartItems.querySelectorAll(SELECTORS.ITEM_IMAGE);
  imageElements.forEach(bindCartItemImageState);
}

function renderSummary(items) {
  if (!dom.subtotal || !dom.discount || !dom.delivery || !dom.total) return;
  const totals = calculateCartTotals(items);
  dom.subtotal.textContent = formatPrice(totals.subtotal, "USD");
  dom.discount.textContent = formatPrice(totals.discountAmount, "USD");
  dom.delivery.textContent = formatPrice(totals.deliveryFee, "USD");
  dom.total.textContent = formatPrice(totals.total, "USD");
}

function renderSummaryUnavailable() {
  if (!dom.subtotal || !dom.discount || !dom.delivery || !dom.total) return;
  dom.subtotal.textContent = "--";
  dom.discount.textContent = "--";
  dom.delivery.textContent = "--";
  dom.total.textContent = "--";
}

function createCartSkeletonItemMarkup() {
  return `<article class="${SELECTORS.ITEM.slice(1)} cart-item--skeleton" aria-hidden="true">
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

function renderCartItemsSkeleton(itemsCount = 2) {
  if (!dom.cartItems) return;
  const skeletonCount = Math.max(1, Number(itemsCount) || 3);
  dom.cartItems.innerHTML = Array.from({ length: skeletonCount }, createCartSkeletonItemMarkup).join("");
}

function renderSummarySkeleton() {
  if (!dom.subtotal || !dom.discount || !dom.delivery || !dom.total) return;
  dom.subtotal.innerHTML = createSummarySkeletonMarkup();
  dom.discount.innerHTML = createSummarySkeletonMarkup();
  dom.delivery.innerHTML = createSummarySkeletonMarkup();
  dom.total.innerHTML = createSummarySkeletonMarkup(true);
}

function renderInitialLoadingState(itemsCount = 2) {
  setCartHydrationState(HYDRATION_STATES.LOADING);
  renderCartItemsSkeleton(itemsCount);
  renderSummarySkeleton();
}

function renderCartFetchError(message = MESSAGES.LOAD_ERROR) {
  if (!dom.cartItems) return;
  dom.cartItems.innerHTML = `<div class="cart-fetch-state cart-fetch-state--error" role="status" aria-live="polite">
    <p class="cart-fetch-state__title">Unable to load cart items</p>
    <p class="cart-fetch-state__description">${message}</p>
    <button class="cart-fetch-state__retry ${SELECTORS.RETRY.slice(1)}" type="button">${BUTTON_LABELS.RETRY}</button>
  </div>`;
  renderSummaryUnavailable();
  setCartHydrationState(HYDRATION_STATES.ERROR, message);
}

function renderEmptyCart() {
  if (!dom.cartItems) return;
  cartItemsState = [];
  dom.cartItems.innerHTML = "";
  renderSummary([]);
  setCartHydrationState(HYDRATION_STATES.SUCCESS);

  if (dom.cartLayout) dom.cartLayout.style.display = "none";
  if (dom.cartEmpty) dom.cartEmpty.style.display = "flex";
}

function renderCartItem(item) {
  const quantity = Number(item.quantity || 1);
  const currentPrice = Number(item.pricing?.current || 0);
  const originalPrice = item.pricing?.original ?? null;
  const discountPercent = item.pricing?.discountPercent ?? null;
  const currency = item.pricing?.currency || "USD";
  const lineCurrentPrice = currentPrice * quantity;
  const lineOriginalPrice = originalPrice && originalPrice > currentPrice ? originalPrice * quantity : null;
  const thumbnailUrl = item.thumbnail || item.images?.[0]?.url || MESSAGES.IMAGE_FALLBACK_SRC;

  return `<article class="${SELECTORS.ITEM.slice(1)}" ${DATA_ATTRS.PRODUCT_ID}="${item.id}" ${DATA_ATTRS.COLOR}="${item.color ?? ""}" ${DATA_ATTRS.SIZE}="${item.size ?? ""}">
    <div class="cart-item__image-shell ${CSS_CLASSES.IMAGE_LOADING} ${SELECTORS.IMAGE_SHELL.slice(1)}" aria-busy="true">
      <span class="cart-item__image-placeholder cart-skeleton-block" aria-hidden="true"></span>
      <img class="cart-item__image ${SELECTORS.ITEM_IMAGE.slice(1)}" src="${thumbnailUrl}" alt="${item.thumbnailAlt || item.name || FALLBACK_TEXT.IMAGE}" loading="lazy" decoding="async" />
    </div>
    <div class="cart-item__content">
      <div class="cart-item__head">
        <h2 class="cart-item__name">${item.name || FALLBACK_TEXT.PRODUCT}</h2>
        <button class="cart-item__remove ${SELECTORS.ITEM_REMOVE.slice(1)}" type="button" aria-label="${FALLBACK_TEXT.REMOVE_ITEM}"></button>
      </div>
      ${item.size ? `<p class="cart-item__meta">Size: ${item.size}</p>` : ""}
      ${item.color ? `<p class="cart-item__meta">Color: ${item.color}</p>` : ""}
      <div class="cart-item__foot">
        <div class="cart-item__price-wrap">
          <p class="cart-item__price ${SELECTORS.ITEM_PRICE.slice(1)}">${formatPrice(lineCurrentPrice, currency)}</p>
          ${lineOriginalPrice ? `<p class="cart-item__price-original ${SELECTORS.ITEM_ORIG_PRICE.slice(1)}">${formatPrice(lineOriginalPrice, currency)}</p>` : ""}
          ${discountPercent ? `<p class="cart-item__price-discount">-${discountPercent}%</p>` : ""}
        </div>
        <div class="cart-item__quantity" aria-label="Quantity controls">
          <button class="cart-item__qty-btn ${SELECTORS.QTY_MINUS.slice(1)} ${quantity <= 1 ? CSS_CLASSES.IS_DISABLED : ""}" type="button" aria-label="${FALLBACK_TEXT.DECREASE_QTY}" ${quantity <= 1 ? "disabled" : ""}></button>
          <input class="${SELECTORS.QTY_INPUT.slice(1)}" type="number" min="1" value="${quantity}" aria-label="Quantity" />
          <button class="cart-item__qty-btn ${SELECTORS.QTY_PLUS.slice(1)}" type="button" aria-label="${FALLBACK_TEXT.INCREASE_QTY}"></button>
        </div>
      </div>
    </div>
  </article>`;
}

function renderCartItems(items) {
  if (!dom.cartItems) return;

  if (dom.cartLayout) dom.cartLayout.style.display = "";
  if (dom.cartEmpty) dom.cartEmpty.style.display = "none";

  dom.cartItems.innerHTML = items.map(renderCartItem).join("");

  renderSummary(items);
  bindCartItemImages();
  setCartHydrationState(HYDRATION_STATES.SUCCESS);

  syncAllCartQuantityControls();
  syncPromoApplyButtonState();
}

// --- UPDATES ---
function updateCartItemDOM(item, cartItemElement) {
  const input = cartItemElement.querySelector(SELECTORS.QTY_INPUT);
  if (input) input.value = item.quantity;

  syncCartItemQuantityControls(cartItemElement);

  const currentPrice = Number(item.pricing?.current || 0);
  const originalPrice = item.pricing?.original ?? null;
  const currency = item.pricing?.currency || "USD";

  const lineCurrentPrice = currentPrice * item.quantity;
  const lineOriginalPrice = originalPrice && originalPrice > currentPrice ? originalPrice * item.quantity : null;

  const priceEl = cartItemElement.querySelector(SELECTORS.ITEM_PRICE);
  if (priceEl) priceEl.textContent = formatPrice(lineCurrentPrice, currency);

  const origPriceEl = cartItemElement.querySelector(SELECTORS.ITEM_ORIG_PRICE);
  if (origPriceEl) {
    if (lineOriginalPrice) {
      origPriceEl.textContent = formatPrice(lineOriginalPrice, currency);
      origPriceEl.style.display = "";
    } else {
      origPriceEl.style.display = "none";
    }
  }

  renderSummary(cartItemsState);
}

function updateCartItemQuantity(productId, color, size, delta, absoluteValue = null) {
  const item = cartItemsState.find(
    (cartItem) =>
      String(cartItem.id) === String(productId) &&
      (cartItem.color ?? "") === (color ?? "") &&
      (cartItem.size ?? "") === (size ?? "")
  );

  if (!item) return;

  item.quantity = absoluteValue !== null ? Math.max(1, absoluteValue) : Math.max(1, Number(item.quantity || 1) + delta);
  persistStoredCart(cartItemsState);

  const cartItemElement = document.querySelector(
    `[${DATA_ATTRS.PRODUCT_ID}="${productId}"]` +
    (color ? `[${DATA_ATTRS.COLOR}="${color}"]` : `[${DATA_ATTRS.COLOR}=""]`) +
    (size ? `[${DATA_ATTRS.SIZE}="${size}"]` : `[${DATA_ATTRS.SIZE}=""]`)
  );

  if (cartItemElement) {
    updateCartItemDOM(item, cartItemElement);
  } else {
    renderCartItems(cartItemsState);
  }
}

function removeCartItem(productId, color, size) {
  cartItemsState = cartItemsState.filter(
    (item) =>
      !(
        String(item.id) === String(productId) &&
        (item.color ?? "") === (color ?? "") &&
        (item.size ?? "") === (size ?? "")
      )
  );

  persistStoredCart(cartItemsState);

  if (cartItemsState.length === 0) {
    renderEmptyCart();
    return;
  }

  renderCartItems(cartItemsState);
}

async function mockApplyPromoCode(code) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: false, message: MESSAGES.PROMO_INVALID });
    }, CONFIG.MOCK_DELAY_MIN + Math.random() * (CONFIG.MOCK_DELAY_MAX - CONFIG.MOCK_DELAY_MIN));
  });
}

function handlePromoApply(e) {
  e.preventDefault();
  if (isCartLoading || cartHydrationState !== HYDRATION_STATES.SUCCESS || isPromoSubmitting) return;

  if (dom.applyBtn && !dom.applyBtn.disabled) {
    const code = dom.promoInput?.value.trim();
    if (!code) return;

    isPromoSubmitting = true;
    syncPromoApplyButtonState();
    setButtonLoadingState(dom.applyBtn, true, BUTTON_LABELS.APPLYING);
    setPromoFeedback(null);

    mockApplyPromoCode(code)
      .then((response) => {
        if (!response.success) setPromoFeedback(response.message, true);
      })
      .catch(() => setPromoFeedback(MESSAGES.PROMO_ERROR, true))
      .finally(() => {
        isPromoSubmitting = false;
        setButtonLoadingState(dom.applyBtn, false);
        syncPromoApplyButtonState();
      });
  }
}

// --- EVENTS ---
function bindCartEvents() {
  dom.cartItems?.addEventListener("click", (event) => {
    if (isCartLoading) return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest(SELECTORS.RETRY)) {
      hydrateCartItems();
      return;
    }

    if (cartHydrationState !== HYDRATION_STATES.SUCCESS) return;

    const cartItemElement = target.closest(`[${DATA_ATTRS.PRODUCT_ID}]`);
    if (!cartItemElement) return;

    const productId = cartItemElement.getAttribute(DATA_ATTRS.PRODUCT_ID);
    const productColor = cartItemElement.getAttribute(DATA_ATTRS.COLOR) ?? "";
    const productSize = cartItemElement.getAttribute(DATA_ATTRS.SIZE) ?? "";
    if (!productId) return;

    if (target.closest(SELECTORS.ITEM_REMOVE)) {
      removeCartItem(productId, productColor, productSize);
      return;
    }
    if (target.closest(SELECTORS.QTY_MINUS)) {
      updateCartItemQuantity(productId, productColor, productSize, -1);
      return;
    }
    if (target.closest(SELECTORS.QTY_PLUS)) {
      updateCartItemQuantity(productId, productColor, productSize, 1);
    }
  });

  dom.checkoutButton?.addEventListener("click", () => {
    if (isCartLoading || cartHydrationState !== HYDRATION_STATES.SUCCESS) return;
    setButtonLoadingState(dom.checkoutButton, true, BUTTON_LABELS.REDIRECTING);
    window.location.href = "checkout.html";
  });

  dom.cartItems?.addEventListener("change", (event) => {
    if (isCartLoading || cartHydrationState !== HYDRATION_STATES.SUCCESS) return;
    const target = event.target;

    if (target.classList.contains(SELECTORS.QTY_INPUT.slice(1))) {
      const cartItemElement = target.closest(`[${DATA_ATTRS.PRODUCT_ID}]`);
      if (!cartItemElement) return;

      const productId = cartItemElement.getAttribute(DATA_ATTRS.PRODUCT_ID);
      const productColor = cartItemElement.getAttribute(DATA_ATTRS.COLOR) ?? "";
      const productSize = cartItemElement.getAttribute(DATA_ATTRS.SIZE) ?? "";

      let newQty = parseInt(target.value, 10);
      if (isNaN(newQty) || newQty < 1) newQty = 1;
      target.value = newQty;

      updateCartItemQuantity(productId, productColor, productSize, 0, newQty);
    }
  });

  dom.promoInput?.addEventListener("input", () => {
    setPromoFeedback(null);
    syncPromoApplyButtonState();
  });
  dom.promoInput?.addEventListener("change", syncPromoApplyButtonState);
  dom.promoForm?.addEventListener("submit", handlePromoApply);
  dom.applyBtn?.addEventListener("click", () => {
    if (dom.promoForm) {
      dom.promoForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }
  });
}

// --- CORE ---
async function hydrateCartItems() {
  const storedCart = getStoredCart();
  if (storedCart.length === 0) {
    renderEmptyCart();
    return;
  }

  if (activeHydrationController) activeHydrationController.abort();

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
        if (!product) return null;
        return {
          ...product,
          quantity: item.quantity,
          color: item?.color ?? null,
          size: item?.size ?? null,
        };
      })
    );

    if (requestId !== activeHydrationRequestId) return;

    let failedRequestCount = 0;
    const validItems = cartProductResults.reduce((items, result) => {
      if (result.status === "fulfilled") {
        if (result.value) items.push(result.value);
        return items;
      }
      if (!isAbortError(result.reason)) failedRequestCount += 1;
      return items;
    }, []);

    if (failedRequestCount > 0 && validItems.length === 0) {
      renderCartFetchError();
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
    if (requestId !== activeHydrationRequestId || isAbortError(error)) return;
    console.error("Failed to load cart items.", error);
    renderCartFetchError();
  } finally {
    if (requestId === activeHydrationRequestId) {
      activeHydrationController = null;
    }
  }
}

export async function initCartPage() {
  initDOM();
  bindCartEvents();
  await hydrateCartItems();
}
