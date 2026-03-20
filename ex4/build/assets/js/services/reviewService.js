import { mockReviews } from "../../data/data.js";
import { requestJson } from "./httpClient.js";
import { cloneData, getCollectionItems, getSingleItem } from "./serviceUtils.js";

const mockSubmittedReviews = [];

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


function getMockReviewList() {
  return [...mockReviews, ...mockSubmittedReviews].map((review) =>
    normalizeReview(review),
  );
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
  const allReviews = filterMockReviews(
    cloneData(getMockReviewList()),
    productId,
  );
  return allReviews;
}

function getReviewRatingValue(review) {
  return Number(review?.rating ?? review?.ratingStar ?? review?.stars ?? 0);
}

function sortMockReviews(reviews, sort) {
  const nextReviews = [...reviews];

  if (sort === "oldest") {
    nextReviews.sort(
      (firstItem, secondItem) =>
        new Date(firstItem?.date || firstItem?.created_at || 0).getTime() -
        new Date(secondItem?.date || secondItem?.created_at || 0).getTime(),
    );
    return nextReviews;
  }

  if (sort === "highest") {
    nextReviews.sort(
      (firstItem, secondItem) =>
        getReviewRatingValue(secondItem) - getReviewRatingValue(firstItem),
    );
    return nextReviews;
  }

  nextReviews.sort(
    (firstItem, secondItem) =>
      new Date(secondItem?.date || secondItem?.created_at || 0).getTime() -
      new Date(firstItem?.date || firstItem?.created_at || 0).getTime(),
  );

  return nextReviews;
}

function paginateMockReviews(reviews, page, perPage) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePerPage = Math.max(1, Number(perPage) || 10);
  const total = reviews.length;
  const lastPage = Math.max(1, Math.ceil(total / safePerPage));
  const startIndex = (safePage - 1) * safePerPage;

  return {
    data: reviews.slice(startIndex, startIndex + safePerPage),
    meta: {
      current_page: safePage,
      last_page: lastPage,
      total,
    },
  };
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
    return {
      data: buildReviewsResult(payload),
      meta: payload?.meta ?? { current_page: 1, last_page: 1, total: 0 },
    };
  } catch (error) {
    console.error(
      "Failed to load reviews from API. Falling back to mock data.",
      error,
    );
    const normalizedRating = Number(rating);
    const filteredByRating = buildMockReviewsResult(normalizedProductId).filter(
      (review) => {
        if (rating === null || !Number.isFinite(normalizedRating)) {
          return true;
        }

        return Math.abs(getReviewRatingValue(review) - normalizedRating) < 0.001;
      },
    );
    const sortedReviews = sortMockReviews(filteredByRating, sort);
    const paginated = paginateMockReviews(sortedReviews, page, perPage);

    return {
      data: paginated.data,
      meta: paginated.meta,
    };
  }
}

export async function submitReview(productId, payload, options = {}) {
  const normalizedProductId = String(productId || "").trim();
  const stars = Number(payload?.stars ?? payload?.rating ?? 0);
  const normalizedStars =
    Math.round(Math.max(1, Math.min(5, Number.isFinite(stars) ? stars : 1)) * 2) /
    2;
  const normalizedComment = String(payload?.comment || "").trim();
  const normalizedUsername =
    String(payload?.username || "").trim() || "Guest";

  try {
    const responsePayload = await requestJson(
      `/api/products/${encodeURIComponent(normalizedProductId)}/reviews`,
      {
        method: "POST",
        body: JSON.stringify({
          username: normalizedUsername,
          comment: normalizedComment,
          stars: normalizedStars,
          rating: normalizedStars,
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
    const fallbackReview = normalizeReview({
      ...payload,
      productId: normalizedProductId,
      name: normalizedUsername,
      desc: normalizedComment,
      stars: normalizedStars,
      rating: normalizedStars,
      ratingStar: normalizedStars,
      id: String(Date.now()),
      date: new Date().toISOString(),
    });

    if (fallbackReview) {
      mockSubmittedReviews.unshift(fallbackReview);
    }

    return fallbackReview;
  }
}
