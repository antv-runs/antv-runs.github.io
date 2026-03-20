import * as productService from "../services/productService.js";
import { CART_STORAGE_KEY } from "../constants/storageKeys.js";
import { formatPrice } from "../utils/formatters.js";

const DELIVERY_FEE = 0;
const DISCOUNT_RATE = 0;

let cartItemsState = [];

const dom = {
  cartItems: document.querySelector(".js-cart-items"),
  cartSummary: document.querySelector(".js-cart-summary"),
  subtotal: document.querySelector(".js-cart-subtotal"),
  discount: document.querySelector(".js-cart-discount"),
  delivery: document.querySelector(".js-cart-delivery"),
  total: document.querySelector(".js-cart-total"),
  checkoutButton: document.querySelector(".js-cart-checkout"),
};

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

function setLoadingState(isLoading) {
  if (dom.cartItems) {
    dom.cartItems.setAttribute("aria-busy", String(isLoading));
  }

  if (dom.cartSummary) {
    dom.cartSummary.setAttribute("aria-busy", String(isLoading));
  }

  if (dom.checkoutButton instanceof HTMLButtonElement) {
    dom.checkoutButton.disabled = isLoading;
  }
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

function renderInitialLoadingState() {
  setLoadingState(true);
  renderCartItemsSkeleton();
  renderSummarySkeleton();
}

function getStoredCart() {
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

function persistStoredCart(items) {
  const serializableItems = items.map((item) => ({
    id: String(item.id),
    quantity: Math.max(1, Number(item.quantity) || 1),
    color: item?.color ?? null,
    size: item?.size ?? null,
  }));

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(serializableItems));
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

  dom.cartItems.innerHTML = "<p>Your cart is empty.</p>";
  renderSummary([]);
  setLoadingState(false);
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
        item.thumbnail || item.images?.[0]?.url || "./assets/images/pic_t_shirt.png";

      return `<article class="cart-item" data-cart-product-id="${item.id}" data-cart-color="${item.color ?? ""}" data-cart-size="${item.size ?? ""}">
        <img class="cart-item__image" src="${thumbnailUrl}" alt="${item.thumbnailAlt || item.name || "Product image"}" />
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
  setLoadingState(false);
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
    const target = event.target;
    if (!(target instanceof Element)) {
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
    window.location.href = "checkout.html";
  });
}

async function loadCartItems() {
  const storedCart = getStoredCart();
  if (storedCart.length === 0) {
    renderEmptyCart();
    return;
  }

  try {
    const cartProducts = await Promise.all(
      storedCart.map(async (item) => {
        const product = await productService.getProductById(item.id);
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

    const validItems = cartProducts.filter(Boolean);
    if (validItems.length === 0) {
      renderEmptyCart();
      return;
    }

    cartItemsState = validItems;
    persistStoredCart(cartItemsState);
    renderCartItems(cartItemsState);
  } catch (error) {
    console.error("Failed to load cart items.", error);
    renderEmptyCart();
  }
}

export async function initCartPage() {
  renderInitialLoadingState();
  bindCartEvents();
  await loadCartItems();
}
