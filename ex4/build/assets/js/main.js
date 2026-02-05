const productTabs = document.querySelectorAll(".tabs__tab");
const productTabContent = document.querySelectorAll(".products-tabs__content");
const filterByStarsBtn = document.getElementById("btn-filter-by-stars");
const filterDropdown = document.getElementById("dropdown-filter-by-stars");
const filterOptions = document.querySelectorAll(".reviews__filter-option");
const reviews = document.querySelectorAll("reviews__item");

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

filterByStarsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  console.log("click on filter by stars button");
  filterDropdown.classList.toggle("reviews__filter-dropdown--show");
});
