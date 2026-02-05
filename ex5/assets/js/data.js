const canvas = document.getElementById("barChart");
const ctx = canvas.getContext("2d");

const charHeight = 200;
const barWidth = 50;
const gap = 40;
const startX = 50;
const startY = 250;

ctx.beginPath();
ctx.moveTo(30, 30);
ctx.lineTo(30, startY);
ctx.stroke();

ctx.beginPath();
ctx.moveTo(30, startY);
ctx.lineTo(350, startY);
ctx.stroke();

data.forEach((item, index) => {
  const barHeight = item.value * 2;
  const x = startX + index * (barWidth + gap);
  const y = startY - barHeight;

  ctx.fillStyle = item.color;
  ctx.fillRect(x, y, barWidth, barHeight);

  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.fillText(item.value, x + barWidth / 2, y - 5);

  ctx.fillText(item.label, x + barWidth / 2, startY + 15);
});

console.log(`data: ${data}`);
