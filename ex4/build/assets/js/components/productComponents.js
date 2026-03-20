import { setText } from "../utils/domUtils.js";

function createCatalogImagePlaceholder(productName) {
  const safeProductName = String(productName || "Product").trim() || "Product";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="${safeProductName}"><rect width="320" height="320" fill="#f2f0f1"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif" font-size="24">${safeProductName}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createCatalogProductUrl(productId) {
  return `product.html?id=${encodeURIComponent(productId)}`;
}

export function renderCatalogProducts(container, products, helpers) {
  container.innerHTML = products
    .map((product) => {
      const pricing = product.pricing || {};
      const currentPrice = Number(pricing.current || 0);
      const originalPrice =
        pricing.original === null || pricing.original === undefined
          ? null
          : Number(pricing.original);
      const hasComparePrice =
        originalPrice !== null &&
        Number.isFinite(originalPrice) &&
        originalPrice > currentPrice;
      const discountPercent = Number(
        pricing.discountPercent ||
          (hasComparePrice && originalPrice
            ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
            : 0),
      );
      const productUrl = createCatalogProductUrl(product.id);
      const productImage =
        product.thumbnail || createCatalogImagePlaceholder(product.name);
      const ratingValue = Number(product.ratingAvg ?? 0);

      return `<article class="product-tile js-product-card" data-product-id="${product.id}">
        <a class="product-tile__image-link js-product-link" href="${productUrl}" data-product-id="${product.id}" aria-label="View ${product.name}">
          <img src="${productImage}" alt="${product.name}" class="product-tile__image" />
        </a>
        <h2 class="product-tile__title">
          <a class="js-product-link" href="${productUrl}" data-product-id="${product.id}">${product.name}</a>
        </h2>
        <div class="product-tile__rating" aria-label="Rating ${ratingValue} out of 5">
          ${
            ratingValue > 0
              ? `
            <span>${helpers.renderStars(ratingValue, "product-item__star", { showEmpty: false })}</span>
            <span>${ratingValue.toFixed(1)}/5</span>
          `
              : ""
          }
        </div>
        <p class="product-tile__price">
          <span class="product-tile__price-current">${helpers.formatPrice(currentPrice, pricing.currency || "USD")}</span>
          ${hasComparePrice ? `<span class="product-tile__price-original">${helpers.formatPrice(originalPrice, pricing.currency || "USD")}</span>` : ""}
          ${hasComparePrice && discountPercent > 0 ? `<span class="product-tile__price-badge">-${discountPercent}%</span>` : ""}
        </p>
      </article>`;
    })
    .join("");
}

export function renderCatalogEmptyState(container, message) {
  container.innerHTML = `<p class="catalog-products__empty">${message}</p>`;
}

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
    : [
        "Home",
        "Shop",
        product.category?.name || "Catalog",
        product.name || "Product",
      ];

  const getBreadcrumbHref = (label, index) => {
    if (index === 0) {
      return "/";
    }

    if (index === 1) {
      return "/shop";
    }

    const slug = String(label || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug ? `/shop/${slug}` : "/shop";
  };

  container.innerHTML = breadcrumb
    .map((crumb, index) => {
      const isLast = index === breadcrumb.length - 1;

      if (isLast) {
        return `<li aria-current="page">${crumb}</li>`;
      }

      const href = getBreadcrumbHref(crumb, index);
      return `<li><a href="${href}">${crumb}</a></li>`;
    })
    .join("");
}

export function renderImageGallery(thumbnailsContainer, mainImage, product) {
  const mainImageSkeleton = mainImage
    ?.closest(".image-wrapper-main")
    ?.querySelector(".product-overview__skeleton-image");
  const fallbackImage = createCatalogImagePlaceholder(
    product?.name || "Product",
  );

  function setMainImageWithLoadingState(src, alt) {
    if (!mainImage) {
      return;
    }

    const nextLoadToken = String(Number(mainImage.dataset.loadToken || 0) + 1);
    const targetSrc = String(src || "").trim() || fallbackImage;
    const targetAlt = String(alt || product?.name || "Product image").trim();

    mainImage.dataset.loadToken = nextLoadToken;
    mainImage.dataset.fallbackAppliedToken = "";
    mainImage.classList.remove("is-loaded", "is-error");

    const isStaleRequest = () => mainImage.dataset.loadToken !== nextLoadToken;

    const markLoaded = () => {
      if (isStaleRequest()) {
        return;
      }

      mainImage.classList.add("is-loaded");
      mainImage.classList.remove("is-error");
    };

    const handleError = () => {
      if (isStaleRequest()) {
        return;
      }

      if (mainImage.dataset.fallbackAppliedToken === nextLoadToken) {
        mainImage.classList.add("is-error");
        mainImage.classList.remove("is-loaded");
        return;
      }

      mainImage.dataset.fallbackAppliedToken = nextLoadToken;
      mainImage.alt = product?.name || "Product image unavailable";
      mainImage.src = fallbackImage;
    };

    mainImage.onload = markLoaded;
    mainImage.onerror = handleError;
    mainImage.alt = targetAlt;
    mainImage.src = targetSrc;

    if (mainImage.complete && mainImage.naturalWidth > 0) {
      markLoaded();
    }

    if (mainImageSkeleton) {
      mainImageSkeleton.setAttribute("aria-hidden", "true");
    }
  }

  const images = Array.isArray(product.images) ? product.images : [];

  if (images.length === 0 && product.thumbnail) {
    setMainImageWithLoadingState(
      product.thumbnail,
      product.thumbnailAlt || product.name || "Product",
    );
    thumbnailsContainer.innerHTML = "";
    return;
  }

  if (images.length === 0) {
    setMainImageWithLoadingState(fallbackImage, product.name || "Product");
    thumbnailsContainer.innerHTML = "";
    return;
  }

  const [firstImage] = images;
  setMainImageWithLoadingState(
    firstImage.url || firstImage.image_url,
    firstImage.alt || firstImage.alt_text,
  );

  thumbnailsContainer.innerHTML = images
    .map((image, index) => {
      const imageUrl = image.url || image.image_url;
      const imageAlt = image.alt || image.alt_text;
      return `<div class="image-wrapper"><img class="js-product-thumbnail" data-image-index="${index}" src="${imageUrl}" alt="${imageAlt}" /></div>`;
    })
    .join("");

  thumbnailsContainer
    .querySelectorAll(".js-product-thumbnail")
    .forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const imageIndex = Number(thumb.dataset.imageIndex);
        const selectedImage = images[imageIndex];
        setMainImageWithLoadingState(
          selectedImage?.url || selectedImage?.image_url,
          selectedImage?.alt || selectedImage?.alt_text,
        );
      });
    });
}

export function renderProductInfo(dom, product, helpers) {
  const pricing = product.pricing || product.price || {};
  const hasDiscount =
    pricing.original && pricing.current && pricing.original > pricing.current;
  const discountPercent = Number(pricing.discountPercent ?? 0);

  setText(dom.productTitle, product.name);
  dom.productRatingStars.innerHTML = helpers.renderStars(
    product.rating || 0,
    "review-card__star",
  );
  dom.productRatingText.innerHTML = `${product.rating || 0}/<span>5</span>`;

  setText(
    dom.productPriceCurrent,
    helpers.formatPrice(pricing.current || 0, pricing.currency || "USD"),
  );

  if (hasDiscount) {
    setText(
      dom.productPriceOld,
      helpers.formatPrice(pricing.original, pricing.currency || "USD"),
    );
  } else {
    setText(dom.productPriceOld, "");
  }

  if (Number.isFinite(discountPercent) && discountPercent > 0) {
    setText(dom.productPriceDiscount, `-${discountPercent}%`);
  } else {
    setText(dom.productPriceDiscount, "");
  }

  setText(
    dom.productDescription,
    product.description || "No description available.",
  );
  setText(dom.productDetailsContent, product.details || "No detail available.");
}

export function renderFaqs(listEl, faqs = []) {
  if (faqs.length === 0) {
    listEl.innerHTML = "<li>No FAQs available.</li>";
    return;
  }

  listEl.innerHTML = faqs
    .map(
      (faq) => `<li><strong>${faq.question}</strong><p>${faq.answer}</p></li>`,
    )
    .join("");
}

export function renderColorOptions(
  container,
  colors,
  selectedColorId,
  onSelect,
) {
  const EMPTY_STRING = "";
  const HEX_SHORT_PATTERN = /^#[0-9a-f]{3}$/;
  const HEX_FULL_PATTERN = /^#[0-9a-f]{6}$/;
  const RGB_PATTERN = /^rgba?\((\d+),(\d+),(\d+)/;
  const RGB_CHANNEL_MIN = 0;
  const RGB_CHANNEL_MAX = 255;
  const SRGB_THRESHOLD = 0.04045;
  const SRGB_DIVISOR = 12.92;
  const GAMMA_OFFSET = 0.055;
  const GAMMA_DIVISOR = 1.055;
  const GAMMA_EXPONENT = 2.4;
  const LUMINANCE_RED_COEFFICIENT = 0.2126;
  const LUMINANCE_GREEN_COEFFICIENT = 0.7152;
  const LUMINANCE_BLUE_COEFFICIENT = 0.0722;
  const LIGHT_COLOR_LUMINANCE_THRESHOLD = 0.179;
  const ACTIVE_CLASS = " is-active";
  const LIGHT_CLASS = " is-light";
  const COLOR_OPTION_SELECTOR = ".js-color-option";

  const clampChannel = (value) =>
    Math.min(RGB_CHANNEL_MAX, Math.max(RGB_CHANNEL_MIN, Number(value) || 0));

  // Parse any CSS color string into {r, g, b} components
  const parseColor = (colorCode) => {
    const normalized = String(colorCode || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

    // Handle shorthand hex: #fff
    if (HEX_SHORT_PATTERN.test(normalized)) {
      const [r, g, b] = normalized
        .slice(1)
        .split("")
        .map((c) => parseInt(c + c, 16));
      return { r, g, b };
    }

    // Handle full hex: #ffffff
    if (HEX_FULL_PATTERN.test(normalized)) {
      const r = parseInt(normalized.slice(1, 1 + HEX_CHANNEL_LENGTH), 16);
      const g = parseInt(
        normalized.slice(1 + HEX_CHANNEL_LENGTH, 1 + HEX_CHANNEL_LENGTH * 2),
        16,
      );
      const b = parseInt(
        normalized.slice(1 + HEX_CHANNEL_LENGTH * 2, 1 + HEX_FULL_LENGTH),
        16,
      );
      return { r, g, b };
    }

    // Handle rgb() / rgba()
    const rgbMatch = normalized.match(RGB_PATTERN);
    if (rgbMatch) {
      return { r: +rgbMatch[1], g: +rgbMatch[2], b: +rgbMatch[3] };
    }

    // Fallback: use Canvas API to resolve any named CSS color (e.g. "beige", "white", "black").
    // Returns null if the color string is invalid or unrecognized.
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = colorCode;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return { r, g, b };
    } catch {
      return null;
    }
  };

  // Calculate relative luminance per WCAG 2.1 formula
  const getLuminance = ({ r, g, b }) => {
    const toLinear = (c) => {
      const s = c / RGB_CHANNEL_MAX;
      return s <= SRGB_THRESHOLD
        ? s / SRGB_DIVISOR
        : Math.pow((s + GAMMA_OFFSET) / GAMMA_DIVISOR, GAMMA_EXPONENT);
    };
    return (
      LUMINANCE_RED_COEFFICIENT * toLinear(r) +
      LUMINANCE_GREEN_COEFFICIENT * toLinear(g) +
      LUMINANCE_BLUE_COEFFICIENT * toLinear(b)
    );
  };

  // Determine if a color is light enough to require a dark icon for contrast.
  // Threshold 0.179 is derived from WCAG contrast ratio guidelines.
  const isLightColor = (colorCode) => {
    const rgb = parseColor(colorCode);
    // Unknown/unparsed colors are intentionally treated as dark backgrounds
    // so the UI falls back to a white tick for safer contrast.
    if (!rgb) return false;

    const clampedRgb = {
      r: clampChannel(rgb.r),
      g: clampChannel(rgb.g),
      b: clampChannel(rgb.b),
    };

    return getLuminance(clampedRgb) > LIGHT_COLOR_LUMINANCE_THRESHOLD;
  };

  container.innerHTML = colors
    .map((color) => {
      const isActive = String(color.id) === String(selectedColorId);
      const isLight = isLightColor(color.colorCode);

      const activeClass = isActive ? ACTIVE_CLASS : EMPTY_STRING;
      // is-light triggers dark tick icon to ensure contrast on light swatches
      const lightClass = isLight ? LIGHT_CLASS : EMPTY_STRING;

      return `<button class="color-option js-color-option${activeClass}${lightClass}" type="button" style="background-color: ${color.colorCode};" aria-label="${color.name}" data-color-id="${color.id}"></button>`;
    })
    .join("");

  container.querySelectorAll(COLOR_OPTION_SELECTOR).forEach((option) => {
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
      return `<button class="size-option js-size-option${isActive}" type="button" data-size-id="${size.id}"${disabled}>${size.name}</button>`;
    })
    .join("");

  container.querySelectorAll(".js-size-option").forEach((option) => {
    option.addEventListener("click", () => {
      onSelect(option.dataset.sizeId);
    });
  });
}

export function renderRelatedProducts(
  container,
  relatedProducts,
  helpers,
  onSelectProduct,
) {
  container.innerHTML = relatedProducts
    .map((product) => {
      const pricing = product.pricing || {};
      const hasDiscount =
        pricing.original &&
        pricing.current &&
        pricing.original > pricing.current;
      // Use normalized rating field with fallback for API variations
      const ratingValue = Number(product.ratingAvg ?? 0);

      return `<li class="other-products__item js-other-products__item js-related-item" data-product-id="${product.id}">
        <img class="product-item__image" src="${product.thumbnail}" alt="${product.thumbnailAlt}" />
        <h3 class="product-item__title">${product.name}</h3>
        <div class="product-item__rating">
          <div class="product-item__stars">
            ${ratingValue > 0 ? helpers.renderStars(ratingValue, "product-item__star", { showEmpty: false }) : ""}
          </div>
          <p class="product-item__rating-text">${ratingValue > 0 ? `${ratingValue}/5` : "No ratings yet"}</p>
        </div>
        <div class="product-item__prices">
          <p class="product-item__prices--discounted">${helpers.formatPrice(pricing.current || 0, pricing.currency || "USD")}</p>
          ${hasDiscount ? `<p class="product-item__prices--original">${helpers.formatPrice(pricing.original, pricing.currency || "USD")}</p>` : ""}
          ${pricing.discountPercent ? `<p class="product-item__prices--percent">-${pricing.discountPercent}%</p>` : ""}
        </div>
      </li>`;
    })
    .join("");

  container.querySelectorAll(".js-other-products__item").forEach((item) => {
    item.addEventListener("click", () => {
      const nextProductId = item.dataset.productId;
      if (nextProductId) {
        onSelectProduct(nextProductId);
      }
    });
  });
}
