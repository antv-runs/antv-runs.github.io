const dom = {
  cartButton: document.querySelector(".js-cart-button"),
};

function bindStaticEvents() {
  dom.cartButton?.addEventListener("click", () => {
    window.location.href = "cart.html";
  });
}

export async function initHeader() {
  bindStaticEvents();
}
