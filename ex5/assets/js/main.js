window.onload = () => {
  const canvas = document.getElementById("barChart");
  const ctx = canvas.getContext("2d");

  const width = canvas.width;
  const height = canvas.height;

  const padding = 60;
  const barWidth = 40;
  const spaceBetweenBars = 50;

  const maxValue = 4;
  const yAxisSteps = 5;

  ctx.clearRect(0, 0, width, height);

  ctx.font = "20px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "#000";
  ctx.fillText(chartData.title, width / 2, 40);

  ctx.save();
  ctx.translate(20, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "16px Arial";
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.fillStyle(chartData.yLabel, 0, 0);
  ctx.restore();

  ctx.font = "italic 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(chartData.xLabel, width / 2, height - 20);

  ctx.font = "14px Arial";
  ctx.textAlign = "right";
  ctx.fillStyle = "#000";

  for (let i = 0; i <= yAxisSteps; i++) {
    const y = height - padding - (i * (height - 2 * padding)) / yAxisSteps;
    const value = (maxValue * i) / yAxisSteps;

    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.strokeStyle = "#ccc";
    ctx.stroke();

    ctx.fillText(value.toFixed(1), padding - 10, y + 5);
  }

  const totalBars = chartData.bars.length;
  const totalCharWidth = totalBars * (barWidth + spaceBetweenBars);
  const startX = (width - totalCharWidth) / 2 + padding / 2;

  chartData.bars.forEach((data, index) => {
    const x = startX + index * (barWidth + spaceBetweenBars);
    const barHeight = (data.value / maxValue) * (height - 2 * padding);
    const y = height - padding - barHeight;

    ctx.fillStyle = data.color;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(data.label, x + barWidth / 2, height - padding + 20);
  });

  const legendX = width - padding + 10;
  const legendY = padding;

  ctx.fillStyle = "#000";
  ctx.font = "16px Arial";
  ctx.textAlign = "left";
  ctx.fillText("LEVEL", legendX, legendY);
  ctx.fillText("OF", legendX, legendY + 16);
  ctx.fillText("POSITION", legendX, legendY + 32);

  ctx.fillStyle = chartData.bars[0].color;
  ctx.fillRect(legendX - 20, legendY, 12, 12);
};
