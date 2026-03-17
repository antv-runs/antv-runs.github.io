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
        product_id: Number(item?.product_id ?? item?.id),
        quantity: Math.max(1, Number(item?.quantity) || 1),
      }))
      .filter(
        (item) => Number.isInteger(item.product_id) && item.product_id > 0,
      );
  } catch {
    return [];
  }
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

  const formData = new FormData(checkoutForm);
  const customer = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    address: String(formData.get("address") || "").trim(),
  };

  const submitButton = checkoutSubmit;
  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = true;
  }

  setCheckoutMessage("Placing your order...", "pending");

  try {
    await createOrder({
      customer,
      items: cartItems,
    });

    localStorage.removeItem(CART_STORAGE_KEY);
    setCheckoutMessage("Order placed successfully. Redirecting...", "success");
    window.setTimeout(() => {
      window.location.href = "index.html?order=success";
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
