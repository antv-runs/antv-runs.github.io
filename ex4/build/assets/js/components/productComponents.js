import { setText } from "../utils/domUtils.js";

export function renderCategories(container, categories) {
  container.innerHTML = categories
    .map((category) => {
      const icon = category.hasChildren
        ? '<img src="./assets/images/icn_arrow-down.png" alt="Expand" />'
        : "";

      return `<li><a href="${category.href}">${category.name}</a>${icon}</li>`;
    })
    .join("");
}

export function renderBreadcrumb(container, product) {
  const breadcrumb = Array.isArray(product.breadcrumb)
    ? product.breadcrumb
    : ["Home", "Shop", product.name || "Product"];

  container.innerHTML = breadcrumb.map((crumb) => `<li>${crumb}</li>`).join("");
}

export function renderImageGallery(thumbnailsContainer, mainImage, product) {
  const images = Array.isArray(product.images) ? product.images : [];

  if (images.length === 0 && product.thumbnail) {
    mainImage.src = product.thumbnail;
    mainImage.alt = product.thumbnailAlt || product.name || "Product";
    thumbnailsContainer.innerHTML = "";
    return;
  }

  if (images.length === 0) {
    thumbnailsContainer.innerHTML = "";
    return;
  }

  const [firstImage] = images;
  mainImage.src = firstImage.url;
  mainImage.alt = firstImage.alt;

  thumbnailsContainer.innerHTML = images
    .map((image, index) => {
      return `<div class="image-wrapper"><img data-image-index="${index}" src="${image.url}" alt="${image.alt}" /></div>`;
    })
    .join("");

  thumbnailsContainer.querySelectorAll("img").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const imageIndex = Number(thumb.dataset.imageIndex);
      const selectedImage = images[imageIndex];
      mainImage.src = selectedImage.url;
      mainImage.alt = selectedImage.alt;
    });
  });
}

export function renderProductInfo(dom, product, helpers) {
  setText(dom.productTitle, product.name);
  dom.productRatingStars.innerHTML = helpers.renderStars(
    product.rating || 0,
    "review-card__star",
  );
  dom.productRatingText.innerHTML = `${product.rating || 0}/<span>5</span>`;

  setText(
    dom.productPriceCurrent,
    helpers.formatPrice(product.price.current, product.price.currency),
  );

  if (product.price.original) {
    setText(
      dom.productPriceOld,
      helpers.formatPrice(product.price.original, product.price.currency),
    );
  } else {
    setText(dom.productPriceOld, "");
  }

  if (product.price.discountPercent) {
    setText(dom.productPriceDiscount, `-${product.price.discountPercent}%`);
  } else {
    setText(dom.productPriceDiscount, "");
  }

  setText(dom.productDescription, product.description || "No description available.");
  setText(dom.productDetailsContent, product.details || "No detail available.");
}

export function renderFaqs(listEl, faqs = []) {
  if (faqs.length === 0) {
    listEl.innerHTML = "<li>No FAQs available.</li>";
    return;
  }

  listEl.innerHTML = faqs
    .map((faq) => `<li><strong>${faq.question}</strong><p>${faq.answer}</p></li>`)
    .join("");
}

export function renderColorOptions(container, colors, selectedColorId, onSelect) {
  container.innerHTML = colors
    .map((color) => {
      const isActive = color.id === selectedColorId ? " is-active" : "";
      return `<button class="color-option${isActive}" type="button" style="background-color: ${color.colorCode};" aria-label="${color.name}" data-color-id="${color.id}"></button>`;
    })
    .join("");

  container.querySelectorAll(".color-option").forEach((option) => {
    option.addEventListener("click", () => {
      onSelect(option.dataset.colorId);
    });
  });
}

export function renderSizeOptions(container, sizes, selectedSizeId, onSelect) {
  container.innerHTML = sizes
    .map((size) => {
      const isActive = size.id === selectedSizeId ? " is-active" : "";
      const disabled = size.inStock ? "" : " disabled";
      return `<button class="size-option${isActive}" type="button" data-size-id="${size.id}"${disabled}>${size.name}</button>`;
    })
    .join("");

  container.querySelectorAll(".size-option").forEach((option) => {
    option.addEventListener("click", () => {
      onSelect(option.dataset.sizeId);
    });
  });
}

export function renderRelatedProducts(container, relatedProducts, helpers, onSelectProduct) {
  container.innerHTML = relatedProducts
    .map((product) => {
      return `<li class="other-products__item" data-product-id="${product.id}">
        <img class="product-item__image" src="${product.thumbnail}" alt="${product.thumbnailAlt}" />
        <h3 class="product-item__title">${product.name}</h3>
        <div class="product-item__rating">
          <div class="product-item__stars">${helpers.renderStars(product.rating, "product-item__star")}</div>
          <p>${product.rating}/5</p>
        </div>
        <div class="product-item__prices">
          <p class="product-item__prices--discounted">${helpers.formatPrice(product.price.current, product.price.currency)}</p>
          ${product.price.original ? `<p class="product-item__prices--original">${helpers.formatPrice(product.price.original, product.price.currency)}</p>` : ""}
          ${product.price.discountPercent ? `<p class="product-item__prices--percent">-${product.price.discountPercent}%</p>` : ""}
        </div>
      </li>`;
    })
    .join("");

  container.querySelectorAll(".other-products__item").forEach((item) => {
    item.addEventListener("click", () => {
      const nextProductId = item.dataset.productId;
      if (nextProductId) {
        onSelectProduct(nextProductId);
      }
    });
  });
}

