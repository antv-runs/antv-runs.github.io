const productTabs = document.querySelectorAll(".tabs__tab");
const productTabContent = document.querySelectorAll(".products-tabs__content");

productTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    productTabs.forEach((t) => t.classList.remove("tabs__tab--active"));
    productTabContent.forEach((c) =>
      c.classList.remove("products-tabs__content--active"),
    );

    tab.classList.add("tabs__tab--active");

    const tabId = tab.dataset.tab;
    console.log(tabId);
    document
      .getElementById(tabId)
      .classList.add("products-tabs__content--active");
  });
});
