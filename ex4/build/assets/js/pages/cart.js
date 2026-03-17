import * as productService from "../services/productService.js";
import { CART_STORAGE_KEY } from "../constants/storageKeys.js";
import { formatPrice } from "../utils/formatters.js";

const DELIVERY_FEE = 15;
const DISCOUNT_RATE = 0;

let cartItemsState = [];

const dom = {
  cartItems: document.querySelector(".js-cart-items"),
  subtotal: document.querySelector(".js-cart-subtotal"),
  discount: document.querySelector(".js-cart-discount"),
  delivery: document.querySelector(".js-cart-delivery"),
  total: document.querySelector(".js-cart-total"),
  checkoutButton: document.querySelector(".js-cart-checkout"),
};

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

      return `<article class="cart-item" data-cart-product-id="${item.id}">
        <img class="cart-item__image" src="${thumbnailUrl}" alt="${item.thumbnailAlt || item.name || "Product image"}" />
        <div class="cart-item__content">
          <div class="cart-item__head">
            <h2 class="cart-item__name">${item.name || "Product"}</h2>
            <button class="cart-item__remove js-cart-item-remove" type="button" aria-label="Remove item">
            </button>
          </div>
          <p class="cart-item__meta">Size: Large</p>
          <p class="cart-item__meta">Color: White</p>
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
}

function updateCartItemQuantity(productId, delta) {
  const item = cartItemsState.find(
    (cartItem) => String(cartItem.id) === String(productId),
  );

  if (!item) {
    return;
  }

  item.quantity = Math.max(1, Number(item.quantity || 1) + delta);
  persistStoredCart(cartItemsState);
  renderCartItems(cartItemsState);
}

function removeCartItem(productId) {
  cartItemsState = cartItemsState.filter(
    (item) => String(item.id) !== String(productId),
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
    if (!productId) {
      return;
    }

    const minusButton = target.closest(".js-cart-item-qty-minus");
    const plusButton = target.closest(".js-cart-item-qty-plus");
    const removeButton = target.closest(".js-cart-item-remove");

    if (removeButton) {
      removeCartItem(productId);
      return;
    }

    if (minusButton) {
      updateCartItemQuantity(productId, -1);
      return;
    }

    if (plusButton) {
      updateCartItemQuantity(productId, 1);
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

  const cartProducts = await Promise.all(
    storedCart.map(async (item) => {
      const product = await productService.getProductById(item.id);
      if (!product) {
        return null;
      }

      return {
        ...product,
        quantity: item.quantity,
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
}

export async function initCartPage() {
  bindCartEvents();
  await loadCartItems();
}
