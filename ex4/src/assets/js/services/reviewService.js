import { mockReviews } from "../../data/data.js";
import { requestJson } from "./httpClient.js";

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function normalizeReview(review) {
  if (!review) {
    return null;
  }

  return {
    ...review,
    id: String(review.id),
    productId: String(review.productId || review.product_id || ""),
  };
}

function getCollectionItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function getSingleItem(payload) {
  return payload?.data || payload || null;
}

function getMockReviewList() {
  return mockReviews.map((review) => normalizeReview(review));
}

function normalizeReviews(reviews) {
  return reviews.map((review) => normalizeReview(review)).filter(Boolean);
}

function buildReviewsResult(payload) {
  return normalizeReviews(getCollectionItems(payload));
}

function filterMockReviews(reviews, productId) {
  const normalizedProductId =
    productId === undefined || productId === null
      ? null
      : String(productId).trim();

  return reviews.filter((review) => {
    return (
      !normalizedProductId || String(review.productId) === normalizedProductId
    );
  });
}

function buildMockReviewsResult(productId) {
  const allReviews = filterMockReviews(clone(getMockReviewList()), productId);
  return allReviews;
}

export async function getReviewsByProductId(
  productId,
  { page = 1, perPage = 10, rating = null, sort = "latest", signal } = {},
) {
  const normalizedProductId = String(productId || "").trim();

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort: String(sort),
  });

  if (rating !== null) {
    params.set("rating", String(rating));
  }

  const url = `/api/products/${encodeURIComponent(normalizedProductId)}/reviews?${params}`;

  try {
    const payload = await requestJson(url, {
      signal,
    });
    return buildReviewsResult(payload);
  } catch (error) {
    console.error(
      "Failed to load reviews from API. Falling back to mock data.",
      error,
    );
    return buildMockReviewsResult(normalizedProductId);
  }
}

export async function submitReview(productId, payload, options = {}) {
  const normalizedProductId = String(productId || "").trim();

  try {
    const responsePayload = await requestJson(
      `/api/products/${encodeURIComponent(normalizedProductId)}/reviews`,
      {
        method: "POST",
        body: JSON.stringify({
          rating: payload?.rating,
          comment: payload?.comment,
        }),
        signal: options.signal,
      },
    );
    return normalizeReview(getSingleItem(responsePayload));
  } catch (error) {
    console.error(
      "Failed to submit review via API. Simulating success with mock data.",
      error,
    );
    return normalizeReview({
      ...payload,
      id: String(Date.now()),
      date: new Date().toISOString(),
    });
  }
}
