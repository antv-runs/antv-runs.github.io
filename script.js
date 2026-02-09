const exercises = [
  {
    title: "Tuần 1 ngày 1 - đề 1",
    links: {
      demo: "ex1/",
      github: "https://github.com/antv-runs/antv-runs.github.io/tree/main/ex1",
      image:
        "https://github.com/antv-runs/antv-runs.github.io/tree/main/ex1/de%201.png",
    },
  },
  {
    title: "Tuần 1 ngày 2 - đề 2",
    links: {
      demo: "ex2/",
      github: "https://github.com/antv-runs/antv-runs.github.io/tree/main/ex2",
      image:
        "https://github.com/antv-runs/antv-runs.github.io/tree/main/ex2/de%202.png",
    },
  },
  {
    title: "Tuần 1 ngày 2 - đề 3",
    links: {
      demo: "ex3/",
      github: "https://github.com/antv-runs/antv-runs.github.io/tree/main/ex3",
      image:
        "https://github.com/antv-runs/antv-runs.github.io/tree/main/ex3/de%203.png",
    },
  },
  {
    title: "Tuần 1 ngày 3/4 - đề 4",
    links: {
      demo: "ex4/build/",
      github: "https://github.com/antv-runs/antv-runs.github.io/tree/main/ex4",
      image:
        "https://github.com/antv-runs/antv-runs.github.io/tree/main/ex4/Product%20Detail%20Page.jpg",
    },
  },
  {
    title: "Tuần 1 ngày 5 - Biểu đồ cột",
    links: {
      demo: "ex5",
      github: "https://github.com/antv-runs/antv-runs.github.io/tree/main/ex5",
      image:
        "https://github.com/antv-runs/antv-runs.github.io/tree/main/ex5/chart2.png",
    },
  },
];

const listEl = document.getElementById("exercise-list");

listEl.innerHTML = exercises
  .map(
    (item) => `
    <li>
      ${item.title}:
      <a target="_blank" href="${item.links.demo}">bài làm</a>,
      <a target="_blank" href="${item.links.github}">GitHub</a>,
      <a target="_blank" href="${item.links.image}">
        Hình dùng cho Perfect Pixel
      </a>
    </li>
  `,
  )
  .join("");
