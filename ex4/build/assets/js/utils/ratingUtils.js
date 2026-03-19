export function renderStars(rating, className, { showEmpty = true } = {}) {
  const normalizedRating = Number(rating);
  const safeRating = Number.isFinite(normalizedRating)
    ? Math.max(0, Math.min(5, normalizedRating))
    : 0;
  const displayRating = Math.round(safeRating * 2) / 2;
  const fullStars = Math.floor(displayRating);
  const hasHalfStar = displayRating - fullStars >= 0.5;
  let html = "";

  for (let index = 1; index <= 5; index += 1) {
    if (index <= fullStars) {
      html += `<svg class="${className} ${className}--active" viewBox="0 0 22 21"><path d="M10.737 0L13.9355 6.8872L21.4739 7.80085L15.9122 12.971L17.3728 20.4229L10.737 16.731L4.10121 20.4229L5.56179 12.971L0 7.80085L7.53855 6.8872L10.737 0Z"/></svg>`;
    } else if (index === fullStars + 1 && hasHalfStar) {
      html += `<svg class="${className} ${className}--active" viewBox="0 0 22 21"><path d="M4.10115 20.4229L10.7369 16.731V0L7.53849 6.8872L0 7.80085L5.56174 12.971L4.10115 20.4229Z"/></svg>`;
    } else if (showEmpty) {
      html += `<svg class="${className}" viewBox="0 0 22 21"><path d="M10.737 0L13.9355 6.8872L21.4739 7.80085L15.9122 12.971L17.3728 20.4229L10.737 16.731L4.10121 20.4229L5.56179 12.971L0 7.80085L7.53855 6.8872L10.737 0Z"/></svg>`;
    }
  }

  return html;
}
