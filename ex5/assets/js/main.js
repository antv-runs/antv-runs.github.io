const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

const COLORS = {
  bar: "#3366cc",
  textPrimary: "#111",
  textSecondary: "#555",
  gridLine: "#e5e7eb",
  axis: "#000",
};

const FONT = {
  title: "18px Arial",
  label: "10px Arial",
  legend: "12px Arial",
  axisText: "italic 13px Arial",
};

const PADDING = {
  left: 80,
  right: 80,
  top: 68,
  bottom: 80,
};

const BAR_CONFIG = {
  width: 35,
  gap: 25,
};

const OFFSETS = {
  y: 13,
};

const CHART = {
  x: 90,
  y: 30,
  width: canvas.width - PADDING.left * 2,
  height: canvas.height - PADDING.top * 2,
};

const { title, projectName, labels, values } = chartData;
const MAX_VALUE = Math.max(...values);

const drawTitle = () => {
  ctx.font = FONT.title;
  ctx.fillStyle = COLORS.textPrimary;
  ctx.textAlign = "center";
  ctx.fillText(title, canvas.width / 2, 30);
};

const drawYAxisLabel = () => {
  ctx.save();
  ctx.translate(25, 205);
  ctx.rotate(-Math.PI / 2);
  ctx.font = FONT.axisText;
  ctx.fillStyle = COLORS.textPrimary;
  ctx.textAlign = "left";
  ctx.fillText("LEVEL OF POSITION", 0, 5);
  ctx.restore();
};

const drawAxisLines = () => {
  const baseY = canvas.height - PADDING.bottom + OFFSETS.y;

  ctx.beginPath();
  ctx.moveTo(CHART.x, baseY);
  ctx.lineTo(canvas.width - PADDING.right, baseY);
  ctx.strokeStyle = COLORS.axis;
  ctx.stroke();

  ctx.font = FONT.label;
  ctx.fillStyle = "#666";
  ctx.textAlign = "right";
  for (let level = 0; level <= 4; level++) {
    const y = baseY - (level / MAX_VALUE) * CHART.height;

    ctx.beginPath();
    ctx.moveTo(CHART.x, y);
    ctx.lineTo(canvas.width - PADDING.right, y);
    ctx.strokeStyle = COLORS.gridLine;
    ctx.stroke();

    ctx.fillText(level, CHART.x - 15, y + 4);
  }
};

const drawBars = () => {
  const baseY = canvas.height - PADDING.bottom + OFFSETS.y;

  values.forEach((value, index) => {
    const barHeight = (value / MAX_VALUE) * CHART.height;
    const x = CHART.x + index * (BAR_CONFIG.width + BAR_CONFIG.gap);
    const y = baseY - barHeight;

    ctx.fillStyle = COLORS.bar;
    ctx.fillRect(x, y, BAR_CONFIG.width, barHeight);
    ctx.font = FONT.label;
    ctx.fillStyle = COLORS.textPrimary;
    ctx.textAlign = "center";
    ctx.fillText(labels[index], x + BAR_CONFIG.width / 2, baseY + 15);
  });
};

const drawLegend = () => {
  const legendX = CHART.x + CHART.width - 5;
  const boxY = CHART.y + OFFSETS.y + 25;
  const boxHeight = 15;

  ctx.fillStyle = COLORS.bar;
  ctx.fillRect(legendX, boxY, 38, boxHeight);

  ctx.font = FONT.legend;
  ctx.fillStyle = COLORS.textPrimary;
  ctx.textAlign = "left";

  let textY = boxY + boxHeight + 18;
  ctx.fillText("LEVEL", legendX, textY);
  ctx.fillText("OF", legendX, textY + 20);
  ctx.fillText("POSITION", legendX, textY + 40);
};

const drawProjectName = () => {
  ctx.font = FONT.axisText;
  ctx.fillStyle = COLORS.textSecondary;
  ctx.textAlign = "center";
  ctx.fillText(projectName, canvas.width / 2, canvas.height - 18);
};

const draw = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawTitle();
  drawYAxisLabel();
  drawAxisLines();
  drawBars();
  drawLegend();
  drawProjectName();
};

draw();
