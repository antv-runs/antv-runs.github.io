export function renderReviewsList(listEl, reviews, helpers) {
  listEl.innerHTML = reviews
    .map((review) => {
      return `<li class="reviews__item review-card" data-stars="${Math.floor(review.ratingStar)}">
        <div class="review-card__meta">
          <div class="review-card__stars">${helpers.renderStars(review.ratingStar, "review-card__star")}</div>
          <button class="review-card__more-btn" aria-label="More actions" aria-haspopup="menu"></button>
        </div>
        <p class="review-card__header">${review.name}</p>
        <p class="review-card__content">${review.desc}</p>
        <p class="review-card__footer">Posted on ${helpers.formatDate(review.date)}</p>
      </li>`;
    })
    .join("");
}
