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
              <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.25 3H13.5V2.25C13.5 1.65326 13.2629 1.08097 12.841 0.65901C12.419 0.237053 11.8467 0 11.25 0H6.75C6.15326 0 5.58097 0.237053 5.15901 0.65901C4.73705 1.08097 4.5 1.65326 4.5 2.25V3H0.75C0.551088 3 0.360322 3.07902 0.21967 3.21967C0.0790178 3.36032 0 3.55109 0 3.75C0 3.94891 0.0790178 4.13968 0.21967 4.28033C0.360322 4.42098 0.551088 4.5 0.75 4.5H1.5V18C1.5 18.3978 1.65804 18.7794 1.93934 19.0607C2.22064 19.342 2.60218 19.5 3 19.5H15C15.3978 19.5 15.7794 19.342 16.0607 19.0607C16.342 18.7794 16.5 18.3978 16.5 18V4.5H17.25C17.4489 4.5 17.6397 4.42098 17.7803 4.28033C17.921 4.13968 18 3.94891 18 3.75C18 3.55109 17.921 3.36032 17.7803 3.21967C17.6397 3.07902 17.4489 3 17.25 3ZM7.5 14.25C7.5 14.4489 7.42098 14.6397 7.28033 14.7803C7.13968 14.921 6.94891 15 6.75 15C6.55109 15 6.36032 14.921 6.21967 14.7803C6.07902 14.6397 6 14.4489 6 14.25V8.25C6 8.05109 6.07902 7.86032 6.21967 7.71967C6.36032 7.57902 6.55109 7.5 6.75 7.5C6.94891 7.5 7.13968 7.57902 7.28033 7.71967C7.42098 7.86032 7.5 8.05109 7.5 8.25V14.25ZM12 14.25C12 14.4489 11.921 14.6397 11.7803 14.7803C11.6397 14.921 11.4489 15 11.25 15C11.0511 15 10.8603 14.921 10.7197 14.7803C10.579 14.6397 10.5 14.4489 10.5 14.25V8.25C10.5 8.05109 10.579 7.86032 10.7197 7.71967C10.8603 7.57902 11.0511 7.5 11.25 7.5C11.4489 7.5 11.6397 7.57902 11.7803 7.71967C11.921 7.86032 12 8.05109 12 8.25V14.25ZM12 3H6V2.25C6 2.05109 6.07902 1.86032 6.21967 1.71967C6.36032 1.57902 6.55109 1.5 6.75 1.5H11.25C11.4489 1.5 11.6397 1.57902 11.7803 1.71967C11.921 1.86032 12 2.05109 12 2.25V3Z" fill="#FF3333"/>
              </svg>
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
