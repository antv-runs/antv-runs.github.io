export function renderReviewsList(listEl, reviews, helpers) {
  listEl.innerHTML = reviews
    .map((review) => {
      const ratingValue = Number(review.ratingStar || 0);

      return `<li class="reviews__item review-card" data-stars="${ratingValue}">
        <div class="review-card__meta">
          <div class="review-card__stars">${helpers.renderStars(ratingValue, "review-card__star", { showEmpty: false })}</div>
          <button class="review-card__more-btn" aria-label="More actions" aria-haspopup="menu"></button>
        </div>
        <p class="review-card__header">${review.name}</p>
        <p class="review-card__content">${review.desc}</p>
        <p class="review-card__footer">Posted on ${helpers.formatDate(review.date)}</p>
      </li>`;
    })
    .join("");
}
