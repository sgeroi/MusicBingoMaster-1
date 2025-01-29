export function drawBingoPreview(
  canvas: HTMLCanvasElement,
  artists: string[],
  cardNumber: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  
  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);
  
  // Grid lines
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width/6), 0);
    ctx.lineTo(i * (width/6), height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, i * (height/6));
    ctx.lineTo(width, i * (height/6));
    ctx.stroke();
  }
  
  // Add artists
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const artist = artists[i * 6 + j];
      if (artist) {
        ctx.fillText(
          artist,
          (j + 0.5) * (width/6),
          (i + 0.5) * (height/6),
          width/6 - 10
        );
      }
    }
  }
  
  // Add card number
  ctx.font = 'bold 24px Arial';
  ctx.fillText(`#${cardNumber}`, 60, 30);
}
