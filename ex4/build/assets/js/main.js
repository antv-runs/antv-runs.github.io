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
const otherProdItems = Array.from(otherProducts.children);
const firstClones = otherProdItems
  .slice(-VISIBLE_OTHER_PRODUCTS)
  .map((li) => li.cloneNode(true));
const lastClones = otherProdItems
  .slice(0, VISIBLE_OTHER_PRODUCTS)
  .map((li) => li.cloneNode(true));

// Clone: [last*][1][2][3][4][...][n][first*]
firstClones.forEach((clone) =>
  otherProducts.insertBefore(clone, otherProducts.firstChild),
);
lastClones.forEach((clone) => otherProducts.appendChild(clone));

let currentIndex = VISIBLE_OTHER_PRODUCTS;
// updateSlider(currentIndex, false);

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

  if (enableAnimation) {
    otherProducts.classList.add("is-animated");
  } else {
    otherProducts.classList.remove("is-animated");
    otherProducts.getBoundingClientRect();
  }
  otherProducts.style.transform = `translateX(${translateX}px)`;
};

const moveToPrevItem = () => {
  currentIndex--;
  updateSlider(currentIndex, true);

  if (currentIndex < VISIBLE_OTHER_PRODUCTS) {
    setTimeout(() => {
      currentIndex = TOTAL_OTHER_PRODUCTS + VISIBLE_OTHER_PRODUCTS - 1;
      updateSlider(currentIndex, false);
    }, 500);
  }
  console.log(`Click Prev button - currentIndex: ${currentIndex}`);
};

const moveToNextItem = () => {
  currentIndex++;
  updateSlider(currentIndex, true);

  if (currentIndex >= otherProdItems.length + VISIBLE_OTHER_PRODUCTS) {
    setTimeout(() => {
      currentIndex = VISIBLE_OTHER_PRODUCTS;
      updateSlider(currentIndex, false);
    }, 500);
  }
  console.log(`Click Next button - currentIndex: ${currentIndex}`);
};

prevBtn.addEventListener("click", moveToPrevItem);
nextBtn.addEventListener("click", moveToNextItem);
setInterval(moveToNextItem, 30000);
