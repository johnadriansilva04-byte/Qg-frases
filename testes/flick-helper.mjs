/* Helper compartilhado dos E2Es: flick inteligente no futebol de botão 2D.
 * Detecta os discos do jogador (cor dominante vermelha) lendo os pixels do
 * canvas, agrupa em blobs 8-conexos e puxa para trás em direção ao gol.
 */
export async function flickInteligente(page) {
  const alvo = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    if (!c) return null;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    let data;
    try {
      data = ctx.getImageData(0, 0, c.width, c.height).data;
    } catch {
      return null;
    }
    // grade grossa de células vermelhas
    const gw = 120, gh = 84;
    const cw = c.width / gw, ch = c.height / gh;
    const grid = new Uint8Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        let n = 0;
        const x0 = Math.floor(gx * cw), x1 = Math.max(x0 + 1, Math.floor((gx + 1) * cw));
        const y0 = Math.floor(gy * ch), y1 = Math.max(y0 + 1, Math.floor((gy + 1) * ch));
        for (let y = y0; y < y1; y += 2) {
          for (let x = x0; x < x1; x += 2) {
            const i = (y * c.width + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            if (r > 150 && g < 100 && b < 100) n++;
          }
        }
        if (n > 4) grid[gy * gw + gx] = 1;
      }
    }
    // blobs 8-conexos
    const seen = new Uint8Array(gw * gh);
    const blobs = [];
    for (let i = 0; i < gw * gh; i++) {
      if (!grid[i] || seen[i]) continue;
      const q = [i]; seen[i] = 1;
      const cells = [];
      while (q.length) {
        const cur = q.pop(); cells.push(cur);
        const cx = cur % gw, cy = (cur / gw) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const ni = ny * gw + nx;
          if (grid[ni] && !seen[ni]) { seen[ni] = 1; q.push(ni); }
        }
      }
      if (cells.length >= 3) {
        let sx = 0, sy = 0;
        for (const cell of cells) { sx += (cell % gw) + 0.5; sy += ((cell / gw) | 0) + 0.5; }
        blobs.push({ gx: sx / cells.length, gy: sy / cells.length, size: cells.length });
      }
    }
    if (blobs.length === 0) return null;
    // bola = célula branca mais densa
    let ball = null, bw = 0;
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        let n = 0;
        const x0 = Math.floor(gx * cw), x1 = Math.max(x0 + 1, Math.floor((gx + 1) * cw));
        const y0 = Math.floor(gy * ch), y1 = Math.max(y0 + 1, Math.floor((gy + 1) * ch));
        for (let y = y0; y < y1; y += 2) {
          for (let x = x0; x < x1; x += 2) {
            const i = (y * c.width + x) * 4;
            if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) n++;
          }
        }
        if (n > 10 && n > bw) { bw = n; ball = { gx: gx + 0.5, gy: gy + 0.5 }; }
      }
    }
    // disco mais próximo da bola (fallback: maior blob)
    let best = blobs[0], bestD = Infinity;
    for (const b of blobs) {
      const d = ball ? Math.hypot(b.gx - ball.gx, b.gy - ball.gy) : -b.size;
      if (d < bestD) { bestD = d; best = b; }
    }
    const rect = c.getBoundingClientRect();
    const x = rect.x + best.gx * cw * (rect.width / c.width);
    const y = rect.y + best.gy * ch * (rect.height / c.height);
    // gol adversário à direita: puxa para trás/esquerda
    return { x, y, pullX: -(50 + Math.random() * 50), pullY: (Math.random() - 0.5) * 80 };
  });
  if (!alvo) return false;
  await page.mouse.move(alvo.x, alvo.y);
  await page.mouse.down();
  await page.mouse.move(alvo.x + alvo.pullX / 2, alvo.y + alvo.pullY / 2, { steps: 3 });
  await page.mouse.move(alvo.x + alvo.pullX, alvo.y + alvo.pullY, { steps: 3 });
  await page.mouse.up();
  return true;
}
