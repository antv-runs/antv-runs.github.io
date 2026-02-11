const reviewsListEl = document.getElementById("reviews-list");

/* ===== Helpers ===== */
function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const totalStars = 5;

  let starsHtml = "";

  for (let i = 1; i <= totalStars; i++) {
    if (i <= fullStars) {
      starsHtml += fullStarSvg();
    } else if (i === fullStars + 1 && hasHalfStar) {
      starsHtml += halfStarSvg();
    } else {
      starsHtml += emptyStarSvg();
    }
  }

  return starsHtml;
}

/* ===== SVG ===== */
function fullStarSvg() {
  return `
    <svg class="review-card__star review-card__star--active" viewBox="0 0 22 21">
      <path d="M10.737 0L13.9355 6.8872L21.4739 7.80085L15.9122 12.971L17.3728 20.4229L10.737 16.731L4.10121 20.4229L5.56179 12.971L0 7.80085L7.53855 6.8872L10.737 0Z"/>
    </svg>
  `;
}

function halfStarSvg() {
  return `
    <svg class="review-card__star review-card__star--active" viewBox="0 0 11 21">
      <path d="M4.10115 20.4229L10.7369 16.731V0L7.53849 6.8872L0 7.80085L5.56174 12.971L4.10115 20.4229Z"/>
    </svg>
  `;
}

function emptyStarSvg() {
  return `
    <svg class="review-card__star" viewBox="0 0 22 21">
      <path d="M10.737 0L13.9355 6.8872L21.4739 7.80085L15.9122 12.971L17.3728 20.4229L10.737 16.731L4.10121 20.4229L5.56179 12.971L0 7.80085L7.53855 6.8872L10.737 0Z"/>
    </svg>
  `;
}

function renderReviews(reviews) {
  reviewsListEl.innerHTML = reviews
    .map((review) => {
      return `
        <li
          class="reviews__item js-reviews__item review-card"
          data-stars="${Math.floor(review.ratingStar)}"
        >
          <div class="review-card__meta">
            <div class="review-card__stars">
              ${renderStars(review.ratingStar)}
            </div>

            <button
              class="review-card__more-btn"
              aria-label="More actions"
              aria-haspopup="menu"
            ></button>
          </div>

          <p class="review-card__header">${review.name}</p>

          <p class="review-card__content">
            ${review.desc}
          </p>

          <p class="review-card__footer">
            Posted on ${formatDate(review.date)}
          </p>
        </li>
      `;
    })
    .join("");
}
