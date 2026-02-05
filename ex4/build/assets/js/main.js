const productTabs = document.querySelectorAll(".tabs__tab");
const productTabContent = document.querySelectorAll(".products-tabs__content");
const filterByStarsBtn = document.getElementById("btn-filter-by-stars");
const filterDropdown = document.getElementById("dropdown-filter-by-stars");
const filterOptions = document.querySelectorAll(".reviews__filter-option");
const reviews = document.querySelectorAll(".reviews__item");

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

filterOptions.forEach((option) => {
  option.addEventListener("click", (e) => {
    e.stopPropagation();
    console.log("Click on the filter option");
    filterOptions.forEach((opt) => {
      opt.classList.remove("reviews__filter-option--active");
    });

    option.classList.add("reviews__filter-option--active");
    const selectedOption = option.dataset.option;
    reviews.forEach((review) => {
      const reviewStars = review.dataset.stars;
      if (selectedOption === "All" || reviewStars === selectedOption) {
        review.style.display = "block";
      } else {
        review.style.display = "none";
      }
    });
  });
});

document.addEventListener("click", (e) => {
  if (
    !filterDropdown.contains(e.target) &&
    !filterByStarsBtn.contains(e.target)
  )
    filterDropdown.classList.remove("reviews__filter-dropdown--show");
});
