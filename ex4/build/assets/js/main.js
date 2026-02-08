const productTabs = document.querySelectorAll(".js-tabs__tab");
const productTabContent = document.querySelectorAll(
  ".js-products-tabs__content",
);
const filterByStarsBtn = document.getElementById("btn-filter-by-stars");
const filterDropdown = document.getElementById("dropdown-filter-by-stars");
const filterOptions = document.querySelectorAll(".js-reviews__filter-option");
const reviews = document.querySelectorAll(".js-reviews__item");
const otherProducts = document.querySelector(".js-other-products__list");
const otherProdItem = document.querySelector(".js-other-products__item");
const OTHER_PROD_ITEM_WIDTH = otherProdItem.offsetWidth;
const OTHER_PROD_LIST_GAP = 20;
const prevBtn = document.querySelector(".js-other-products__prev");
const nextBtn = document.querySelector(".js-other-products__next");
const TOTAL_OTHER_PRODUCTS = otherProducts.querySelectorAll("li").length;
const VISIBLE_OTHER_PRODUCTS = 4;
let currentIndex = 0;
const otherProdItems = Array.from(otherProducts.children);
const firstClone = otherProdItems[0].cloneNode(true);
const lastClone = otherProdItems[TOTAL_OTHER_PRODUCTS - 1].cloneNode(true);

// Clone: [4*][1][2][3][4][1*]
// otherProducts.appendChild(firstClone);
// otherProducts.insertBefore(lastClone, otherProdItems[0]);

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
    filterDropdown.classList.remove("reviews__filter-dropdown--show");
    filterOptions.forEach((opt) => {
      opt.classList.remove("reviews__filter-option--active");
    });

    option.classList.add("reviews__filter-option--active");
    const selectedOption = option.dataset.stars;
    console.log(
      `onClick Filter icon - selectedOption: reviews.length: ${reviews.length}`,
    );
    reviews.forEach((review) => {
      const reviewStars = review.dataset.stars;
      if (selectedOption === "All" || reviewStars === selectedOption) {
        review.classList.remove("reviews__item--hidden");
      } else {
        review.classList.add("reviews__item--hidden");
      }
    });
  });
});

const updateSlider = (index, enableAnimation = true) => {
  const translateX = -index * (OTHER_PROD_ITEM_WIDTH + OTHER_PROD_LIST_GAP);
  console.log(`transformX: ${translateX}px`);
  otherProducts.style.transition = enableAnimation
    ? "transform 0.5s ease-in-out"
    : "none";
  otherProducts.style.transform = `translateX(${translateX}px)`;
};

const moveToNextItem = () => {
  if (currentIndex < TOTAL_OTHER_PRODUCTS - VISIBLE_OTHER_PRODUCTS) {
    currentIndex++;
    updateSlider(currentIndex);
  } else {
    currentIndex = 1;
    updateSlider(currentIndex, false);
  }
  console.log(`Click Next button - currentIndex: ${currentIndex}`);
  updateSlider(currentIndex);
};

prevBtn.addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    updateSlider(currentIndex);
  } else {
    currentIndex = TOTAL_OTHER_PRODUCTS - VISIBLE_OTHER_PRODUCTS;
    updateSlider(currentIndex, false);
  }
  console.log(`Click Prev button - currentIndex: ${currentIndex}`);
});

nextBtn.addEventListener("click", moveToNextItem);

setInterval(moveToNextItem, 30000);
