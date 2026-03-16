const exercises = [
  {
    category: "HTML",
    name: "Tuần 1 ngày 1 - đề 1",
    links: {
      "Bài làm": "ex1/",
      "Mã nguồn":
        "https://github.com/antv-runs/antv-runs.github.io/tree/main/ex1",
      "Hình tham chiếu":
        "https://github.com/antv-runs/antv-runs.github.io/blob/main/ex1/de%201.png?raw=true",
    },
  },
  {
    category: "HTML",
    name: "Tuần 1 ngày 2 - đề 2",
    links: {
      "Bài làm": "ex2/",
      "Mã nguồn":
        "https://github.com/antv-runs/antv-runs.github.io/tree/main/ex2",
      "Hình tham chiếu":
        "https://github.com/antv-runs/antv-runs.github.io/blob/main/ex2/de%202.png?raw=true",
    },
  },
  {
    category: "HTML",
    name: "Tuần 1 ngày 2 - đề 3",
    links: {
      "Bài làm": "ex3/",
      "Mã nguồn":
        "https://github.com/antv-runs/antv-runs.github.io/tree/main/ex3",
      "Hình tham chiếu":
        "https://github.com/antv-runs/antv-runs.github.io/blob/main/ex3/de%203.png?raw=true",
    },
  },
  {
    category: "HTML",
    name: "Tuần 1 ngày 3/4 - đề 4",
    links: {
      "Bài làm": "ex4/build/",
      "Mã nguồn":
        "https://github.com/antv-runs/antv-runs.github.io/tree/main/ex4",
      "Hình tham chiếu":
        "https://github.com/antv-runs/antv-runs.github.io/blob/main/ex4/Product%20Detail%20Page.jpg?raw=true",
    },
  },
  {
    category: "HTML",
    name: "Tuần 1 ngày 5 - Biểu đồ cột",
    links: {
      "Bài làm": "ex5",
      "Mã nguồn":
        "https://github.com/antv-runs/antv-runs.github.io/tree/main/ex5",
      "Hình tham chiếu":
        "https://github.com/antv-runs/antv-runs.github.io/blob/main/ex5/chart2.png?raw=true",
    },
  },
  {
    category: "PHP",
    name: "Tuần 1 ngày 1",
    links: {
      "Tìm hiểu MVC (Docs)":
        "https://docs.google.com/document/d/1xGnF0cNXlnCE_vhDiqpsyQC8mZ1g4FqrsQfwn9-f9AY/edit?usp=sharing",
    },
  },
  {
    category: "PHP",
    name: "Tuần 1 ngày 2",
    links: {
      "MVC với PHP thuần":
        "https://github.com/antv-runs/php-training/tree/main/week1-day2/src",
    },
  },
  {
    category: "PHP",
    name: "Tuần 1 ngày 3->5 (Blade), Tuần 2, Tuần 3",
    links: {
      "Source code": "https://github.com/antv-runs/shop-admin",
      "Postman Documentation":
        "https://documenter.getpostman.com/view/52643477/2sBXcKAcwh",
      "Blade (Deploy)": "https://api.vanannek.blog",
      "RESTful API (Deploy)": "https://api.vanannek.blog/api/documentation",
    },
  },
  {
    category: "HTML + PHP",
    name: "Shop quần áo",
    links: {
      "Source code": "https://github.com/antv-runs/antv-runs.github.io/ex4",
      Deploy: "https://antv-runs.github.io/ex4/build/",
    },
  },
];

const container = document.getElementById("exercise-list");

const grouped = exercises.reduce((acc, item) => {
  if (!acc[item.category]) acc[item.category] = [];
  acc[item.category].push(item);
  return acc;
}, {});

container.innerHTML = Object.entries(grouped)
  .map(
    ([categoryName, items]) => `
      <h2>${categoryName}</h2>
      ${items
        .map((item) => {
          const links = Object.entries(item.links)
            .map(
              ([label, url]) => `<a target="_blank" href="${url}">${label}</a>`,
            )
            .join(", ");
          return `<p>- ${item.name}: ${links}.</p>`;
        })
        .join("")}
    `,
  )
  .join("");
