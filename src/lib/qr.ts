import qrcode from 'qrcode-generator';

export function generateQRSVG(data: string, size: number = 180): string {
  const qr = qrcode(0, 'M');
  qr.addData(data);
  qr.make();
  const count = qr.getModuleCount();
  const cellSize = size / count;
  let paths = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        paths += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#000">${paths}</g></svg>`;
}
