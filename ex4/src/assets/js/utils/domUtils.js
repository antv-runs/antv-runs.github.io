export function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

export function normalizeQuantity(value) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
