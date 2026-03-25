function buildReviewCardMarkup(review, helpers, options = {}) {
  const ratingValue = Number(review.ratingStar || 0);
  const userName = review.name ?? "Guest";
  const verifiedClass = review.isVerified
    ? " review-card__header--verified"
    : "";
  const showMoreButton = options.showMoreButton !== false;
  const showDate = options.showDate !== false;
  const formattedDate = showDate && review.date
    ? `Posted on ${helpers.formatDate(review.date)}`
    : "";

  return `<li class="reviews__item review-card" data-stars="${ratingValue}">
    <div class="review-card__meta">
      <div class="review-card__stars">${helpers.renderStars(ratingValue, "review-card__star", { showEmpty: false })}</div>
      ${showMoreButton ? '<button class="review-card__more-btn" aria-label="More actions" aria-haspopup="menu"></button>' : ""}
    </div>
    <p class="review-card__header${verifiedClass}">${userName}</p>
    <p class="review-card__content">${review.desc}</p>
    ${showDate ? `<p class="review-card__footer">${formattedDate}</p>` : ""}
  </li>`;
}

export function renderReviewCards(listEl, reviews, helpers, options = {}) {
  if (!listEl) {
    return;
  }

  listEl.innerHTML = reviews
    .map((review) => buildReviewCardMarkup(review, helpers, options))
    .join("");
}

export function renderReviewsList(listEl, reviews, helpers) {
  renderReviewCards(listEl, reviews, helpers, {
    showMoreButton: true,
    showDate: true,
  });
}
