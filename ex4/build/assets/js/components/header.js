function debounce(callback, delay) {
  let timeoutId = null;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

export function initHeader(options = {}) {
  const dom = {
    cartButton: document.querySelector(".js-cart-button"),
    searchForm: document.querySelector(".js-search-form"),
    searchInput: document.querySelector(".js-search-input"),
    searchButton: document.querySelector(".header-search__button"),
    announcementBar: document.querySelector(".js-announcement-bar"),
    announcementBarClose: document.querySelector(".js-announcement-bar__close"),
  };

  dom.cartButton?.addEventListener("click", () => {
    window.location.href = "cart.html";
  });

  dom.announcementBarClose?.addEventListener("click", () => {
    if (dom.announcementBar) {
      dom.announcementBar.classList.add("announcement-bar--hidden");
    }
  });

  const { onSearch } = options;

  const handleSearchIntent = (keyword) => {
    if (onSearch) {
      onSearch(keyword);
    } else {
      window.location.href = `index.html?search=${encodeURIComponent(keyword)}`;
    }
  };

  if (dom.searchForm) {
    dom.searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      // On submission we don't dispatch if disabled? We could add a guard, but the button should be disabled when loading.
      if (dom.searchForm.classList.contains("is-disabled")) {
        return;
      }
      handleSearchIntent((dom.searchInput?.value || "").trim());
    });
  }

  if (dom.searchInput) {
    const SEARCH_DEBOUNCE_DELAY = 1000;
    const debouncedSearch = debounce((value) => {
      if (dom.searchForm?.classList.contains("is-disabled")) {
        return;
      }
      handleSearchIntent((value || "").trim());
    }, SEARCH_DEBOUNCE_DELAY);

    dom.searchInput.addEventListener("input", (event) => {
      // If we are on a page without onSearch handler, we shouldn't trigger search navigation on every keystroke. Let user press Enter instead.
      if (!onSearch) {
        return;
      }
      debouncedSearch(event.target.value);
    });
  }

  return {
    setSearchDisabled: (isDisabled) => {
      if (dom.searchForm) {
        dom.searchForm.classList.toggle("is-disabled", isDisabled);
        dom.searchForm.setAttribute("aria-busy", String(isDisabled));
      }
      if (dom.searchButton) {
        dom.searchButton.disabled = isDisabled;
      }
      if (dom.searchInput) {
        dom.searchInput.disabled = isDisabled;
      }
    },
  };
}
