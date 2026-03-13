import * as productService from "./services/productService.js";
import * as categoryService from "./services/categoryService.js";
import * as reviewService from "./services/reviewService.js";

const state = {
  categories: [],
  products: [],
  selectedProductId: null,
  selectedColorId: null,
  selectedSizeId: null,
  reviews: [],
  reviewFilter: "All",
  reviewSort: "latest",
  reviewPage: 1,
  reviewPageSize: 6,
};

const dom = {
  navCategories: document.getElementById("nav-categories"),
  breadcrumbList: document.getElementById("breadcrumb-list"),
  productThumbnails: document.getElementById("product-thumbnails"),
  productMainImage: document.getElementById("product-main-image"),
  productTitle: document.getElementById("product-title"),
  productRatingStars: document.getElementById("product-rating-stars"),
  productRatingText: document.getElementById("product-rating-text"),
  productPriceCurrent: document.getElementById("product-price-current"),
  productPriceOld: document.getElementById("product-price-old"),
  productPriceDiscount: document.getElementById("product-price-discount"),
  productDescription: document.getElementById("product-description"),
  productColorOptions: document.getElementById("product-color-options"),
  productSizeOptions: document.getElementById("product-size-options"),
  quantityInput: document.getElementById("quantity-input"),
  productDetailsContent: document.getElementById("product-details-content"),
  productFaqsList: document.getElementById("product-faqs-list"),
  reviewsCount: document.getElementById("reviews-count"),
  reviewsList: document.getElementById("reviews-list"),
  reviewsSortSelect: document.getElementById("reviews-sort-select"),
  reviewsLoadMore: document.getElementById("reviews-load-more"),
  reviewsFilterBtn: document.getElementById("btn-filter-by-stars"),
  reviewsFilterDropdown: document.getElementById("dropdown-filter-by-stars"),
  reviewsFilterOptions: document.querySelectorAll(".js-reviews__filter-option"),
  otherProductsList: document.getElementById("other-products-list"),
  otherProductsPrev: document.querySelector(".js-other-products__prev"),
  otherProductsNext: document.querySelector(".js-other-products__next"),
  productTabs: document.querySelectorAll(".js-tabs__tab"),
  productTabContents: document.querySelectorAll(".js-products-tabs__content"),
};

function formatPrice(value, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderStars(rating, className) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  let html = "";

  for (let index = 1; index <= 5; index += 1) {
    if (index <= fullStars) {
      html += `<svg class="${className} ${className}--active" viewBox="0 0 22 21"><path d="M10.737 0L13.9355 6.8872L21.4739 7.80085L15.9122 12.971L17.3728 20.4229L10.737 16.731L4.10121 20.4229L5.56179 12.971L0 7.80085L7.53855 6.8872L10.737 0Z"/></svg>`;
    } else if (index === fullStars + 1 && hasHalfStar) {
      html += `<svg class="${className} ${className}--active" viewBox="0 0 11 21"><path d="M4.10115 20.4229L10.7369 16.731V0L7.53849 6.8872L0 7.80085L5.56174 12.971L4.10115 20.4229Z"/></svg>`;
    } else {
      html += `<svg class="${className}" viewBox="0 0 22 21"><path d="M10.737 0L13.9355 6.8872L21.4739 7.80085L15.9122 12.971L17.3728 20.4229L10.737 16.731L4.10121 20.4229L5.56179 12.971L0 7.80085L7.53855 6.8872L10.737 0Z"/></svg>`;
    }
  }

  return html;
}

function normalizeQuantity(value) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function renderCategories(categories) {
  dom.navCategories.innerHTML = categories
    .map((category) => {
      const icon = category.hasChildren
        ? '<img src="./assets/images/icn_arrow-down.png" alt="Expand" />'
        : "";

      return `<li><a href="${category.href}">${category.name}</a>${icon}</li>`;
    })
    .join("");
}

function renderBreadcrumb(product) {
  const breadcrumb = Array.isArray(product.breadcrumb)
    ? product.breadcrumb
    : ["Home", "Shop", product.name || "Product"];

  dom.breadcrumbList.innerHTML = breadcrumb
    .map((crumb) => `<li>${crumb}</li>`)
    .join("");
}

function renderImageGallery(product) {
  const images = Array.isArray(product.images) ? product.images : [];

  if (images.length === 0 && product.thumbnail) {
    dom.productMainImage.src = product.thumbnail;
    dom.productMainImage.alt =
      product.thumbnailAlt || product.name || "Product";
    dom.productThumbnails.innerHTML = "";
    return;
  }

  if (images.length === 0) {
    dom.productThumbnails.innerHTML = "";
    return;
  }

  const [mainImage] = images;
  dom.productMainImage.src = mainImage.url;
  dom.productMainImage.alt = mainImage.alt;

  dom.productThumbnails.innerHTML = images
    .map((image, index) => {
      return `<div class="image-wrapper"><img data-image-index="${index}" src="${image.url}" alt="${image.alt}" /></div>`;
    })
    .join("");

  dom.productThumbnails.querySelectorAll("img").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const imageIndex = Number(thumb.dataset.imageIndex);
      const selectedImage = images[imageIndex];
      dom.productMainImage.src = selectedImage.url;
      dom.productMainImage.alt = selectedImage.alt;
    });
  });
}

function renderProductInfo(product) {
  setText(dom.productTitle, product.name);
  dom.productRatingStars.innerHTML = renderStars(
    product.rating || 0,
    "review-card__star",
  );
  dom.productRatingText.innerHTML = `${product.rating || 0}/<span>5</span>`;

  setText(
    dom.productPriceCurrent,
    formatPrice(product.price.current, product.price.currency),
  );

  if (product.price.original) {
    setText(
      dom.productPriceOld,
      formatPrice(product.price.original, product.price.currency),
    );
  } else {
    setText(dom.productPriceOld, "");
  }

  if (product.price.discountPercent) {
    setText(dom.productPriceDiscount, `-${product.price.discountPercent}%`);
  } else {
    setText(dom.productPriceDiscount, "");
  }

  setText(
    dom.productDescription,
    product.description || "No description available.",
  );
  setText(dom.productDetailsContent, product.details || "No detail available.");
}

function renderFaqs(product) {
  const faqs = product.faqs || [];

  if (faqs.length === 0) {
    dom.productFaqsList.innerHTML = "<li>No FAQs available.</li>";
    return;
  }

  dom.productFaqsList.innerHTML = faqs
    .map(
      (faq) => `<li><strong>${faq.question}</strong><p>${faq.answer}</p></li>`,
    )
    .join("");
}

function renderColorOptions(product) {
  const colors = product.variants?.colors || [];

  if (!colors.some((item) => item.id === state.selectedColorId)) {
    state.selectedColorId = colors[0] ? colors[0].id : null;
  }

  dom.productColorOptions.innerHTML = colors
    .map((color) => {
      const isActive = color.id === state.selectedColorId ? " is-active" : "";
      return `<button class="color-option${isActive}" type="button" style="background-color: ${color.colorCode};" aria-label="${color.name}" data-color-id="${color.id}"></button>`;
    })
    .join("");

  dom.productColorOptions
    .querySelectorAll(".color-option")
    .forEach((option) => {
      option.addEventListener("click", () => {
        state.selectedColorId = option.dataset.colorId;
        renderColorOptions(product);
      });
    });
}

function renderSizeOptions(product) {
  const sizes = product.variants?.sizes || [];

  if (!sizes.some((item) => item.id === state.selectedSizeId)) {
    state.selectedSizeId = sizes[0] ? sizes[0].id : null;
  }

  dom.productSizeOptions.innerHTML = sizes
    .map((size) => {
      const isActive = size.id === state.selectedSizeId ? " is-active" : "";
      const disabled = size.inStock ? "" : " disabled";
      return `<button class="size-option${isActive}" type="button" data-size-id="${size.id}"${disabled}>${size.name}</button>`;
    })
    .join("");

  dom.productSizeOptions.querySelectorAll(".size-option").forEach((option) => {
    option.addEventListener("click", () => {
      state.selectedSizeId = option.dataset.sizeId;
      renderSizeOptions(product);
    });
  });
}

function getCurrentRelatedProducts(product) {
  if (!product.relatedProductIds || product.relatedProductIds.length === 0) {
    return state.products.filter((item) => item.id !== product.id);
  }

  return product.relatedProductIds
    .map((relatedId) => state.products.find((item) => item.id === relatedId))
    .filter(Boolean);
}

function renderOtherProducts(relatedProducts) {
  dom.otherProductsList.innerHTML = relatedProducts
    .map((product) => {
      return `<li class="other-products__item" data-product-id="${product.id}">
        <img class="product-item__image" src="${product.thumbnail}" alt="${product.thumbnailAlt}" />
        <h3 class="product-item__title">${product.name}</h3>
        <div class="product-item__rating">
          <div class="product-item__stars">${renderStars(product.rating, "product-item__star")}</div>
          <p>${product.rating}/5</p>
        </div>
        <div class="product-item__prices">
          <p class="product-item__prices--discounted">${formatPrice(product.price.current, product.price.currency)}</p>
          ${product.price.original ? `<p class="product-item__prices--original">${formatPrice(product.price.original, product.price.currency)}</p>` : ""}
          ${product.price.discountPercent ? `<p class="product-item__prices--percent">-${product.price.discountPercent}%</p>` : ""}
        </div>
      </li>`;
    })
    .join("");

  dom.otherProductsList
    .querySelectorAll(".other-products__item")
    .forEach((item) => {
      item.addEventListener("click", async () => {
        const nextProductId = item.dataset.productId;
        if (!nextProductId || nextProductId === state.selectedProductId) {
          return;
        }
        await loadSelectedProduct(nextProductId);
      });
    });
}

function sortedReviews(reviews) {
  const items = [...reviews];

  if (state.reviewSort === "latest") {
    items.sort((first, second) => new Date(second.date) - new Date(first.date));
  } else if (state.reviewSort === "oldest") {
    items.sort((first, second) => new Date(first.date) - new Date(second.date));
  } else if (state.reviewSort === "highest") {
    items.sort((first, second) => second.ratingStar - first.ratingStar);
  }

  return items;
}

function filteredReviews(reviews) {
  if (state.reviewFilter === "All") {
    return reviews;
  }

  return reviews.filter(
    (review) => Math.floor(review.ratingStar) === Number(state.reviewFilter),
  );
}

function renderReviews() {
  const filtered = filteredReviews(sortedReviews(state.reviews));
  const maxItems = state.reviewPage * state.reviewPageSize;
  const visibleItems = filtered.slice(0, maxItems);

  dom.reviewsList.innerHTML = visibleItems
    .map((review) => {
      return `<li class="reviews__item review-card" data-stars="${Math.floor(review.ratingStar)}">
        <div class="review-card__meta">
          <div class="review-card__stars">${renderStars(review.ratingStar, "review-card__star")}</div>
          <button class="review-card__more-btn" aria-label="More actions" aria-haspopup="menu"></button>
        </div>
        <p class="review-card__header">${review.name}</p>
        <p class="review-card__content">${review.desc}</p>
        <p class="review-card__footer">Posted on ${formatDate(review.date)}</p>
      </li>`;
    })
    .join("");

  dom.reviewsLoadMore.style.display =
    visibleItems.length < filtered.length ? "inline-block" : "none";
}

function bindStaticEvents() {
  dom.productTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      dom.productTabs.forEach((item) =>
        item.classList.remove("tabs__tab--active"),
      );
      dom.productTabContents.forEach((content) =>
        content.classList.remove("products-tabs__content--active"),
      );

      tab.classList.add("tabs__tab--active");

      const tabId = tab.dataset.tab;
      const target = document.getElementById(tabId);
      if (target) {
        target.classList.add("products-tabs__content--active");
      }
    });
  });

  dom.reviewsFilterBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    dom.reviewsFilterDropdown.classList.toggle(
      "reviews__filter-dropdown--show",
    );
  });

  document.addEventListener("click", () => {
    dom.reviewsFilterDropdown.classList.remove(
      "reviews__filter-dropdown--show",
    );
  });

  dom.reviewsFilterOptions.forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      state.reviewFilter = option.dataset.stars;
      state.reviewPage = 1;
      dom.reviewsFilterOptions.forEach((item) =>
        item.classList.remove("reviews__filter-option--active"),
      );
      option.classList.add("reviews__filter-option--active");
      dom.reviewsFilterDropdown.classList.remove(
        "reviews__filter-dropdown--show",
      );
      renderReviews();
    });
  });

  dom.reviewsSortSelect.addEventListener("change", () => {
    state.reviewSort = dom.reviewsSortSelect.value;
    state.reviewPage = 1;
    renderReviews();
  });

  dom.reviewsLoadMore.addEventListener("click", () => {
    state.reviewPage += 1;
    renderReviews();
  });

  const minusButton = document.querySelector(".quantity-button-minus");
  const plusButton = document.querySelector(".quantity-button-plus");

  minusButton.addEventListener("click", () => {
    const current = normalizeQuantity(dom.quantityInput.value);
    dom.quantityInput.value = String(Math.max(1, current - 1));
  });

  plusButton.addEventListener("click", () => {
    const current = normalizeQuantity(dom.quantityInput.value);
    dom.quantityInput.value = String(current + 1);
  });

  dom.quantityInput.addEventListener("input", () => {
    dom.quantityInput.value = dom.quantityInput.value.replace(/[^0-9]/g, "");
  });

  dom.quantityInput.addEventListener("blur", () => {
    dom.quantityInput.value = String(
      normalizeQuantity(dom.quantityInput.value),
    );
  });

  dom.otherProductsPrev.addEventListener("click", () => {
    dom.otherProductsList.parentElement.scrollBy({
      left: -320,
      behavior: "smooth",
    });
  });

  dom.otherProductsNext.addEventListener("click", () => {
    dom.otherProductsList.parentElement.scrollBy({
      left: 320,
      behavior: "smooth",
    });
  });
}

async function loadReviews(productId) {
  state.reviews = await reviewService.getReviewsByProductId(productId);
  state.reviewFilter = "All";
  state.reviewSort = "latest";
  state.reviewPage = 1;
  dom.reviewsSortSelect.value = "latest";
  setText(dom.reviewsCount, `(${state.reviews.length})`);

  dom.reviewsFilterOptions.forEach((item) => {
    const isAll = item.dataset.stars === "All";
    item.classList.toggle("reviews__filter-option--active", isAll);
  });

  renderReviews();
}

async function loadSelectedProduct(productId) {
  state.selectedProductId = productId;

  setText(dom.productTitle, "Loading product...");
  dom.reviewsList.innerHTML = "";

  const product = await productService.getProductById(productId);
  if (!product) {
    setText(dom.productTitle, "Product not found.");
    return;
  }

  renderBreadcrumb(product);
  renderImageGallery(product);
  renderProductInfo(product);
  renderFaqs(product);
  renderColorOptions(product);
  renderSizeOptions(product);

  const relatedProducts = getCurrentRelatedProducts(product);
  renderOtherProducts(relatedProducts);

  await loadReviews(product.id);
}

async function initPage() {
  bindStaticEvents();

  state.categories = await categoryService.getCategories();
  renderCategories(state.categories);

  state.products = await productService.getProducts();
  if (state.products.length === 0) {
    setText(dom.productTitle, "No product available.");
    return;
  }

  await loadSelectedProduct(state.products[0].id);
}

initPage();
