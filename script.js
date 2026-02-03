const GITHUB_BASE = "https://github.com/antv-runs/antv-runs.github.io";

const exercises = [
  {
    week: 1,
    day: 1,
    slug: "ex1",
    image: "de 1.png",
  },
  {
    week: 1,
    day: 2,
    label: "de1",
    slug: "ex2",
    image: "de 2.png",
  },
  {
    week: 1,
    day: 2,
    label: "de2",
    slug: "ex3",
    image: "de 3.png",
  },
  {
    week: 1,
    day: 3,
    label: "Figma",
    slug: "ex4/build",
    image: "Product Detail Page.jpg",
  },
];

const listEl = document.getElementById("exercise-list");

listEl.innerHTML = exercises
  .map((item) => {
    const title = `Tuần ${item.week} ngày ${item.day}${
      item.label ? " - " + item.label : ""
    }`;

    return `
      <li>
        ${title}:
        <a target="_blank" href="${item.slug}/">bài làm</a>,
        <a target="_blank" href="${GITHUB_BASE}/tree/main/${item.slug}">
          GitHub
        </a>,
        <a
          target="_blank"
          href="${GITHUB_BASE}/tree/main/${item.slug}/${item.image}"
        >
          Hình dùng cho Perfect Pixel
        </a>
      </li>
    `;
  })
  .join("");
