import { CART_STORAGE_KEY } from "../constants/storageKeys.js";
import { createOrder } from "../services/orderService.js";

const checkoutForm = document.querySelector(".js-checkout-form");
const checkoutMessage = document.querySelector(".js-checkout-message");
const checkoutSubmit = document.querySelector(".js-checkout-submit");

function setCheckoutMessage(message, status = "success") {
  if (!checkoutMessage) {
    return;
  }

  checkoutMessage.textContent = message;
  checkoutMessage.classList.remove(
    "checkout-page__message--error",
    "checkout-page__message--success",
    "checkout-page__message--pending",
  );

  if (status) {
    checkoutMessage.classList.add(`checkout-page__message--${status}`);
  }
}

function getCartItemsFromStorage() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        id: String(item?.id || item?.product_id || "").trim(),
        quantity: Math.max(1, Number(item?.quantity) || 1),
        color: item?.color ?? null,
        size: item?.size ?? null,
      }))
      .filter((item) => item.id);
  } catch {
    return [];
  }
}

function buildOrderItems(cartItems) {
  return cartItems
    .map((item) => ({
      product_id: Number(item.id),
      quantity: Math.max(1, Number(item.quantity) || 1),
      color: item.color ?? null,
      size: item.size ?? null,
    }))
    .filter((item) => Number.isInteger(item.product_id) && item.product_id > 0);
}

function buildOrderPayload(form, cartItems) {
  if (!(form instanceof HTMLFormElement)) {
    return null;
  }

  const formData = new FormData(form);

  return {
    customer: {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      address: String(formData.get("address") || "").trim(),
    },
    items: buildOrderItems(cartItems),
  };
}

async function handleCheckoutSubmit(event) {
  event.preventDefault();

  if (!(checkoutForm instanceof HTMLFormElement)) {
    return;
  }

  const cartItems = getCartItemsFromStorage();
  if (cartItems.length === 0) {
    setCheckoutMessage("Your cart is empty.", "error");
    return;
  }

  const payload = buildOrderPayload(checkoutForm, cartItems);
  if (!payload || payload.items.length === 0) {
    setCheckoutMessage("Your cart is empty.", "error");
    return;
  }

  const submitButton = checkoutSubmit;
  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = true;
  }

  setCheckoutMessage("Placing your order...", "pending");

  try {
    const response = await createOrder(payload);

    if (!response?.success) {
      setCheckoutMessage(
        response?.message || "Order failed. Please try again.",
        "error",
      );
      return;
    }

    localStorage.removeItem(CART_STORAGE_KEY);
    setCheckoutMessage("Order placed successfully. Redirecting...", "success");
    window.setTimeout(() => {
      const orderId = response?.data?.id;
      window.location.href = orderId
        ? `index.html?order=success&id=${encodeURIComponent(orderId)}`
        : "index.html?order=success";
    }, 700);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to place order.";
    setCheckoutMessage(message, "error");
  } finally {
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = false;
    }
  }
}

checkoutForm?.addEventListener("submit", handleCheckoutSubmit);
