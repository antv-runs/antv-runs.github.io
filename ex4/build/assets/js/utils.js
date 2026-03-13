// Shared utility helpers can be centralized here.
export function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
