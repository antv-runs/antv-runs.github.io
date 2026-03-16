import { CART_STORAGE_KEY } from "../constants/storageKeys.js";
import { createOrder } from "../services/orderService.js";

const checkoutForm = document.querySelector(".js-checkout-form");
const checkoutMessage = document.querySelector(".js-checkout-message");

function setCheckoutMessage(message, isError = false) {
  if (!checkoutMessage) {
    return;
  }

  checkoutMessage.textContent = message;
  checkoutMessage.style.color = isError ? "#b42318" : "#067647";
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
    setCheckoutMessage("Your cart is empty.", true);
    return;
  }

  const formData = new FormData(checkoutForm);
  const customer = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    address: String(formData.get("address") || "").trim(),
  };

  const submitButton = checkoutForm.querySelector("button[type='submit']");
  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = true;
  }

  setCheckoutMessage("Placing your order...");

  try {
    await createOrder({
      customer,
      items: cartItems,
    });

    localStorage.removeItem(CART_STORAGE_KEY);
    setCheckoutMessage("Order placed successfully. Redirecting...");
    window.setTimeout(() => {
      window.location.href = "index.html?order=success";
    }, 700);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to place order.";
    setCheckoutMessage(message, true);
  } finally {
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = false;
    }
  }
}

checkoutForm?.addEventListener("submit", handleCheckoutSubmit);
