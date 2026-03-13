(function () {
  // Bai4 tabs compatibility (only runs when Bai4 tab markup exists)
  const tabContent = document.querySelectorAll(".tab-content");
  const listLink = document.querySelector(".links__list");

  if (listLink && tabContent.length > 0) {
    Array.from(listLink.children).forEach((item) => {
      item.addEventListener("click", () => {
        Array.from(listLink.children).forEach((tab) =>
          tab.classList.remove("links__item--active"),
        );
        tabContent.forEach((content) => content.classList.remove("active"));

        item.classList.add("links__item--active");
        const targetId = item.dataset.target;
        if (!targetId) return;

        const target = document.getElementById(targetId);
        if (target) {
          target.classList.add("active");
        }
      });
    });

    tabContent.forEach((content) => content.classList.remove("active"));
    Array.from(listLink.children).forEach((tab) =>
      tab.classList.remove("links__item--active"),
    );

    tabContent[0].classList.add("active");
    listLink.firstElementChild.classList.add("links__item--active");
  }

  // Bai4 related-products slider compatibility
  const list = document.querySelector(".related-products__list");
  const prevBtn = document.querySelector(".related-products__prev");
  const nextBtn = document.querySelector(".related-products__next");

  if (list && prevBtn && nextBtn && list.children.length > 0) {
    const items = Array.from(list.children);
    const visibleItems = 4;
    const clonesStart = items
      .slice(-visibleItems)
      .map((li) => li.cloneNode(true));
    const clonesEnd = items
      .slice(0, visibleItems)
      .map((li) => li.cloneNode(true));

    clonesStart.forEach((clone) => list.insertBefore(clone, list.firstChild));
    clonesEnd.forEach((clone) => list.appendChild(clone));

    let currentIndex = visibleItems;

    function updateCarousel(animate = true) {
      const firstItem = list.children[0];
      if (!firstItem) return;

      const itemWidth = firstItem.offsetWidth + 20;
      list.style.transition = animate ? "transform 0.5s ease-in-out" : "none";
      list.style.transform = "translateX(-" + currentIndex * itemWidth + "px)";
    }

    function prevSlide() {
      currentIndex -= 1;
      updateCarousel(true);

      if (currentIndex < visibleItems) {
        setTimeout(function () {
          currentIndex = items.length + visibleItems - 1;
          updateCarousel(false);
        }, 500);
      }
    }

    function nextSlide() {
      currentIndex += 1;
      updateCarousel(true);

      if (currentIndex >= items.length + visibleItems) {
        setTimeout(function () {
          currentIndex = visibleItems;
          updateCarousel(false);
        }, 500);
      }
    }

    updateCarousel(false);
    nextBtn.addEventListener("click", nextSlide);
    prevBtn.addEventListener("click", prevSlide);
    setInterval(nextSlide, 30000);
  }

  // Bai4 reviews filter compatibility
  const filterBtn = document.getElementById("reviews-filter-btn");
  const filterDropdown = document.getElementById("reviews-filter-dropdown");
  const filterOptions = document.querySelectorAll(".reviews__filter-option");
  const reviews = document.querySelectorAll("#reviews-list .review");

  if (
    filterBtn &&
    filterDropdown &&
    filterOptions.length > 0 &&
    reviews.length > 0
  ) {
    filterBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      filterDropdown.classList.toggle("reviews__filter-dropdown--show");
    });

    document.addEventListener("click", function (e) {
      if (!filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
        filterDropdown.classList.remove("reviews__filter-dropdown--show");
      }
    });

    filterOptions.forEach((option) => {
      option.addEventListener("click", function (e) {
        e.stopPropagation();
        filterOptions.forEach((opt) =>
          opt.classList.remove("reviews__filter-option--active"),
        );
        option.classList.add("reviews__filter-option--active");

        const selectedRating = option.dataset.rating;
        reviews.forEach((review) => {
          const reviewRating = review.dataset.rating;
          review.style.display =
            selectedRating === "all" || reviewRating === selectedRating
              ? "block"
              : "none";
        });

        filterDropdown.classList.remove("reviews__filter-dropdown--show");
      });
    });

    filterOptions[0].classList.add("reviews__filter-option--active");
  }

  // Product overview interactions
  const mainImage = document.querySelector(".image-wrapper-main img");
  const thumbnails = document.querySelectorAll(
    ".product-overview__images-wrapper .image-wrapper img",
  );

  if (mainImage && thumbnails.length > 0) {
    thumbnails.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        mainImage.src = thumb.src;
        mainImage.alt = thumb.alt;
      });
    });
  }

  const colorOptions = document.querySelectorAll(
    ".product-overview__choose-colors .color-option",
  );
  if (colorOptions.length > 0) {
    colorOptions[0].classList.add("is-active");
    colorOptions.forEach((option) => {
      option.addEventListener("click", () => {
        colorOptions.forEach((item) => item.classList.remove("is-active"));
        option.classList.add("is-active");
      });
    });
  }

  const sizeOptions = document.querySelectorAll(
    ".product-overview__size-options .size-option",
  );
  if (sizeOptions.length > 0) {
    sizeOptions[1] && sizeOptions[1].classList.add("is-active");
    sizeOptions.forEach((option) => {
      option.addEventListener("click", () => {
        sizeOptions.forEach((item) => item.classList.remove("is-active"));
        option.classList.add("is-active");
      });
    });
  }

  const quantityMinusBtn = document.querySelector(".quantity-button-minus");
  const quantityPlusBtn = document.querySelector(".quantity-button-plus");
  const quantityInput = document.querySelector(
    ".product-overview__actions form input",
  );

  if (quantityMinusBtn && quantityPlusBtn && quantityInput) {
    const normalize = (value) => {
      const parsed = parseInt(value, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    };

    quantityInput.value = String(normalize(quantityInput.value));

    quantityMinusBtn.addEventListener("click", () => {
      const current = normalize(quantityInput.value);
      quantityInput.value = String(Math.max(1, current - 1));
    });

    quantityPlusBtn.addEventListener("click", () => {
      const current = normalize(quantityInput.value);
      quantityInput.value = String(current + 1);
    });

    quantityInput.addEventListener("input", () => {
      quantityInput.value = quantityInput.value.replace(/[^0-9]/g, "");
    });

    quantityInput.addEventListener("blur", () => {
      quantityInput.value = String(normalize(quantityInput.value));
    });
  }
})();
