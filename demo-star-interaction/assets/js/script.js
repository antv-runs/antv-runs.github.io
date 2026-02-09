const stars = document.querySelectorAll(".js-star");
const ratingText = document.getElementById("ratingText");

const labels = {
  1: "Very Poor",
  2: "Poor",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

let currentRating = 2; // default

function updateStars(rating) {
  stars.forEach((star) => {
    const value = Number(star.dataset.value);
    star.classList.toggle("active", value <= rating);
  });

  ratingText.textContent = labels[rating];
}

// click để chọn
stars.forEach((star) => {
  star.addEventListener("click", () => {
    currentRating = Number(star.dataset.value);
    updateStars(currentRating);

    // demo "đổ data"
    console.log("Rating value:", currentRating);
  });

  // hover preview
  star.addEventListener("mouseenter", () => {
    updateStars(Number(star.dataset.value));
  });

  star.addEventListener("mouseleave", () => {
    updateStars(currentRating);
  });
});

// init
updateStars(currentRating);
