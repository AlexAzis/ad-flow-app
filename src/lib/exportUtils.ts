import { format } from 'date-fns';

// Browsers cap canvas dimensions at 16384px; html-to-image silently downscales
// captures that exceed it, so never request beyond this.
const MAX_CANVAS_SIDE = 16384;

// Keep exported files comfortably emailable (10 MB sits well under Gmail,
// Outlook and other providers' attachment limits, including MIME overhead)
const MAX_EXPORT_BYTES = 10 * 1024 * 1024;

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

// Export file names: Name_parts_Schedule_YYMMDD — spaces become underscores,
// other punctuation is stripped, "Schedule" is literal.
export function exportFileName(names: string[]) {
  const base =
    names
      .join('_')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]+/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'schedule';
  return `${base}_Schedule_${format(new Date(), 'yyMMdd')}`;
}

interface AxisCrop {
  axis: 'x' | 'y';
  keep: number; // leading region kept before the cut (weekday header / label columns)
  from: number; // where the visible range starts (current date / week)
  to: number; // where it ends (week after the last event block)
}

// Rightmost column containing any non-white pixel. The captured element can
// end up wider than the calendar itself (it is expanded to fit scrollers), so
// the DOM can't tell us where the content really ends — the pixels can.
function rightmostContentX(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const data = ctx.getImageData(0, 0, width, height).data;
  for (let x = width - 1; x >= 0; x--) {
    for (let y = 0; y < height; y += 4) {
      const i = (y * width + x) * 4;
      if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return x + 1;
    }
  }
  return 0;
}

export interface ExportHeaderData {
  title: string;
  date: string;
  scheduleLogoUrl?: string;
  campaigns: { name: string; color: string; logoUrl?: string }[];
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Loads a logo without tainting the export canvas: data URLs load directly,
// remote URLs are fetched into a same-origin blob. Failures just drop the logo.
async function loadLogo(url: string): Promise<HTMLImageElement | null> {
  try {
    if (url.startsWith('data:')) return await loadImage(url);
    const res = await fetch(url);
    if (!res.ok) return null;
    const objectUrl = URL.createObjectURL(await res.blob());
    try {
      return await loadImage(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

// Stitches the kept leading region and the current-date-onwards range into one image
async function cropCapture(dataUrl: string, crop: AxisCrop, width: number, height: number) {
  if (crop.to - crop.from <= 0) return { dataUrl, width, height };
  const img = await loadImage(dataUrl);
  // Derive the real raster scale from the image itself: the capture can be
  // downscaled to fit the browser's canvas limit, so the requested pixel
  // ratio is not guaranteed.
  const r = img.width / width;
  const outWidth = crop.axis === 'x' ? crop.keep + (crop.to - crop.from) : width;
  const outHeight = crop.axis === 'y' ? crop.keep + (crop.to - crop.from) : height;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(outWidth * r));
  canvas.height = Math.max(1, Math.round(outHeight * r));
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl, width, height };

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (crop.axis === 'y') {
    ctx.drawImage(img, 0, 0, img.width, crop.keep * r, 0, 0, img.width, crop.keep * r);
    ctx.drawImage(img, 0, crop.from * r, img.width, (crop.to - crop.from) * r, 0, crop.keep * r, img.width, (crop.to - crop.from) * r);
    // Drop the dead-white margin to the right of the calendar, if there is one
    const edge = rightmostContentX(ctx, canvas.width, canvas.height);
    if (edge > 0 && edge < canvas.width) {
      const trimmed = document.createElement('canvas');
      trimmed.width = edge;
      trimmed.height = canvas.height;
      const tctx = trimmed.getContext('2d');
      if (tctx) {
        tctx.drawImage(canvas, 0, 0);
        return { dataUrl: trimmed.toDataURL('image/png'), width: edge / r, height: outHeight };
      }
    }
  } else {
    ctx.drawImage(img, 0, 0, crop.keep * r, img.height, 0, 0, crop.keep * r, img.height);
    ctx.drawImage(img, crop.from * r, 0, (crop.to - crop.from) * r, img.height, crop.keep * r, 0, (crop.to - crop.from) * r, img.height);
  }
  return { dataUrl: canvas.toDataURL('image/png'), width: outWidth, height: outHeight };
}

// Renders the whole schedule (not just the part scrolled into view) to a PNG data URL.
// Works on a detached clone so live re-renders (realtime sync, resize observers,
// zoom changes) can't mutate the DOM mid-capture.
async function captureFullElement(element: HTMLElement) {
  const { toPng } = await import('html-to-image');

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:fixed;top:0;left:-1000000px;pointer-events:none;';
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.setProperty('zoom', '1');
  clone.style.flexShrink = '0';
  // Scrollbars never appear in exports — scoped so the live page is untouched
  clone.setAttribute('data-export-root', '');
  const noScrollbars = document.createElement('style');
  noScrollbars.textContent =
    '[data-export-root]::-webkit-scrollbar,[data-export-root] *::-webkit-scrollbar{display:none!important}' +
    '[data-export-root],[data-export-root] *{scrollbar-width:none!important}';
  clone.appendChild(noScrollbars);
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    wrapper.style.width = `${element.clientWidth}px`;
    wrapper.style.height = `${element.clientHeight}px`;
    await nextFrame();

    // Expand so nothing inside the clone needs to scroll
    const scrollers = Array.from(clone.querySelectorAll<HTMLElement>('*')).filter(el => {
      if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) return false;
      const { overflowX, overflowY } = getComputedStyle(el);
      return [overflowX, overflowY].some(v => v === 'auto' || v === 'scroll');
    });
    const extraWidth = Math.max(0, ...scrollers.map(el => el.scrollWidth - el.clientWidth));
    const extraHeight = Math.max(0, ...scrollers.map(el => el.scrollHeight - el.clientHeight));
    const width = element.clientWidth + extraWidth;
    let height = element.clientHeight + extraHeight;
    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
    scrollers.forEach(el => {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    });
    await nextFrame();

    const { top, left } = clone.getBoundingClientRect();
    const contentBottomOf = () =>
      Math.max(
        0,
        ...Array.from(clone.querySelectorAll<HTMLElement>('*'))
          .filter(el => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY))
          .flatMap(el => Array.from(el.children))
          .map(child => child.getBoundingClientRect().bottom - top)
      );

    // Trim empty space below the last row when the schedule is shorter than the window
    const contentBottom = contentBottomOf();
    if (contentBottom > 0) height = Math.min(height, Math.ceil(contentBottom) + 1);

    // Crop to the export range: views mark their time-axis cells with
    // data-export-cell, the current date/week with data-export-start, and the
    // week after the last filtered event with data-export-end.
    const cells = Array.from(clone.querySelectorAll<HTMLElement>('[data-export-cell]'));
    const startCell = clone.querySelector<HTMLElement>('[data-export-start]');
    let crop: AxisCrop | null = null;
    if (cells.length > 0 && startCell) {
      const first = cells[0].getBoundingClientRect();
      const start = startCell.getBoundingClientRect();
      const second = cells[1]?.getBoundingClientRect();
      const vertical = !second || Math.abs(second.top - first.top) > Math.abs(second.left - first.left);
      const endCell = clone.querySelector<HTMLElement>('[data-export-end]') ?? cells[cells.length - 1];
      const end = endCell.getBoundingClientRect();
      const startIdx = cells.indexOf(startCell);
      const endIdx = cells.indexOf(endCell);
      if (vertical && startIdx >= 0 && endIdx >= startIdx) {
        // Trim the DOM itself rather than the pixels afterwards: captures that
        // exceed the canvas limit get silently downscaled, which made
        // pixel-space crops land on the wrong rows. Removing the unwanted
        // rows also keeps the image small enough for full-resolution output.
        cells.forEach((c, i) => {
          if (i > endIdx) c.style.display = 'none';
        });
        if (startIdx > 0) {
          const rowsCol = cells[0].parentElement;
          const rowsOnlyCol =
            !!rowsCol &&
            Array.from(rowsCol.children).every(ch =>
              (ch as HTMLElement).hasAttribute?.('data-export-cell')
            );
          const body = rowsOnlyCol ? rowsCol!.parentElement : null;
          if (body) {
            // Cells sit in a dedicated column beside label columns (e.g. the
            // daily month gutter): slide the shared body so labels stay
            // aligned, then clip it to the wanted band.
            body.style.transform = `translateY(${-(start.top - first.top)}px)`;
            body.style.overflow = 'hidden';
            body.style.height = `${end.bottom - first.top}px`;
          } else {
            // Self-contained rows (each carries its own label): drop the
            // leading ones outright.
            cells.forEach((c, i) => {
              if (i < startIdx) c.style.display = 'none';
            });
          }
        }
        await nextFrame();
        const newBottom = contentBottomOf();
        if (newBottom > 0) height = Math.ceil(newBottom) + 1;
        clone.style.height = `${height}px`;
        await nextFrame();
      } else {
        if (vertical) {
          const keep = Math.max(0, first.top - top);
          const from = Math.max(keep, start.top - top);
          const to = Math.min(height, Math.max(end.bottom, start.bottom) - top);
          if (to > keep) crop = { axis: 'y', keep, from, to };
        } else {
          const keep = Math.max(0, first.left - left);
          const from = Math.max(keep, start.left - left);
          const to = Math.min(width, Math.max(end.right, start.right) - left);
          if (to > keep) crop = { axis: 'x', keep, from, to };
        }
      }
    }

    // Capture at up to 3x so text stays crisp when the export is zoomed, retrying
    // at smaller ratios if a browser can't allocate a canvas that big.
    let dataUrl = '';
    for (const cap of [3, 2, 1]) {
      const r = Math.min(cap, MAX_CANVAS_SIDE / width, MAX_CANVAS_SIDE / height);
      try {
        dataUrl = await toPng(clone, { width, height, pixelRatio: r, backgroundColor: '#ffffff' });
        break;
      } catch {
        // try a lower pixel ratio
      }
    }
    if (!dataUrl) throw new Error('Could not capture the schedule for export');
    if (crop) return cropCapture(dataUrl, crop, width, height);
    // The capture already contains exactly the export content; just drop any
    // dead-white margin to the right of the calendar
    return trimRightEdge(dataUrl, width, height);
  } finally {
    wrapper.remove();
  }
}

// Cuts the dead-white margin to the right of the calendar, if there is one
async function trimRightEdge(dataUrl: string, width: number, height: number) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl, width, height };
  ctx.drawImage(img, 0, 0);
  const r = img.width / width;
  const edge = rightmostContentX(ctx, canvas.width, canvas.height);
  if (edge > 0 && edge < canvas.width) {
    const trimmed = document.createElement('canvas');
    trimmed.width = edge;
    trimmed.height = canvas.height;
    const tctx = trimmed.getContext('2d');
    if (tctx) {
      tctx.drawImage(canvas, 0, 0);
      return { dataUrl: trimmed.toDataURL('image/png'), width: edge / r, height };
    }
  }
  return { dataUrl, width, height };
}

// Draws a single header row - title, export date and campaign legend on the
// left, schedule and campaign logos vertically centred on the right.
async function applyHeader(dataUrl: string, header: ExportHeaderData, width: number, height: number) {
  const img = await loadImage(dataUrl);
  const r = img.width / width;

  const padX = 16;
  const padY = 10;

  // Schedule logo first, then each visible campaign's logo (de-duplicated)
  const logoUrls = [
    ...(header.scheduleLogoUrl ? [header.scheduleLogoUrl] : []),
    ...header.campaigns.map(c => c.logoUrl).filter((u): u is string => !!u),
  ].filter((u, i, arr) => arr.indexOf(u) === i);
  const logoImgs = (await Promise.all(logoUrls.map(loadLogo))).filter(
    (img): img is HTMLImageElement => !!img
  );

  const logoMaxH = 52;
  const logoMaxW = 220;
  const logoGap = 12;
  const logoBoxes = logoImgs.map(img => {
    const s = Math.min(logoMaxH / img.height, logoMaxW / img.width);
    return { img, w: img.width * s, h: img.height * s };
  });
  const logoTotalW = logoBoxes.reduce((sum, b) => sum + b.w, 0) + logoGap * Math.max(0, logoBoxes.length - 1);
  // Logos take at most half the width so the text always keeps room
  const logoScale = Math.min(1, logoBoxes.length > 0 ? (width * 0.5) / logoTotalW : 1);
  const logoRowW = logoBoxes.length > 0 ? logoTotalW * logoScale : 0;
  const logoRowH = logoBoxes.length > 0 ? Math.max(...logoBoxes.map(b => b.h)) * logoScale : 0;
  const logoGapScaled = logoGap * logoScale;

  // Everything left of the logo zone
  const textAreaW = width - padX * 2 - (logoRowW > 0 ? logoRowW + 24 : 0);

  const titleSize = 18;
  const dateSize = 13;
  const legendSize = 13;
  const swatchSize = 11;
  const itemGap = 14;
  const legendLineHeight = 18;
  const legendBottomPad = 10;

  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) return { dataUrl, width, height };
  measure.font = `400 ${legendSize}px Arial, sans-serif`;

  const maxLegendWidth = Math.max(0, textAreaW);
  const items = header.campaigns.map(c => {
    let name = c.name;
    let nameWidth = measure.measureText(name).width;
    const maxNameWidth = maxLegendWidth - swatchSize - itemGap * 2;
    while (nameWidth > maxNameWidth && name.length > 1) {
      name = name.slice(0, -1);
      nameWidth = measure.measureText(`${name}…`).width;
      if (nameWidth <= maxNameWidth) name += '…';
    }
    return { ...c, name, width: swatchSize + itemGap + nameWidth + itemGap };
  });

  // Wrap legend items onto as many lines as needed
  const legendLines: typeof items[] = [];
  let line: typeof items = [];
  let lineWidth = 0;
  for (const item of items) {
    if (line.length > 0 && lineWidth + item.width > maxLegendWidth) {
      legendLines.push(line);
      line = [];
      lineWidth = 0;
    }
    line.push(item);
    lineWidth += item.width;
  }
  if (line.length > 0) legendLines.push(line);

  const titleBaseline = padY + titleSize;
  const legendBaseline0 = titleBaseline + legendLineHeight + 4;
  const textBottom = legendLines.length > 0
    ? legendBaseline0 + (legendLines.length - 1) * legendLineHeight + legendBottomPad
    : titleBaseline + 10;
  const headerHeight = Math.ceil(Math.max(textBottom, logoRowH + padY * 2)) + 1;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * r);
  canvas.height = Math.round((headerHeight + height) * r);
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl, width, height };
  ctx.scale(r, r);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, headerHeight + height);
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(0, headerHeight - 1, width, 1);

  // Logos: right-aligned, vertically centred in the header band
  if (logoBoxes.length > 0) {
    const bandTop = (headerHeight - 1 - logoRowH) / 2;
    let logoX = width - padX - logoRowW;
    logoBoxes.forEach(box => {
      const w = box.w * logoScale;
      const h = box.h * logoScale;
      ctx.drawImage(box.img, logoX, bandTop + (logoRowH - h) / 2, w, h);
      logoX += w + logoGapScaled;
    });
  }

  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 ${titleSize}px Arial, sans-serif`;
  ctx.fillStyle = '#111827';
  ctx.fillText(header.title, padX, titleBaseline);

  ctx.font = `400 ${dateSize}px Arial, sans-serif`;
  ctx.fillStyle = '#6b7280';
  ctx.textAlign = 'right';
  ctx.fillText(`Exported ${header.date}`, padX + textAreaW, titleBaseline);
  ctx.textAlign = 'left';

  legendLines.forEach((legendLine, i) => {
    const baseline = legendBaseline0 + i * legendLineHeight;
    let x = padX;
    legendLine.forEach(item => {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(x, baseline - swatchSize - 4, swatchSize, swatchSize, 3);
      ctx.fill();
      ctx.fillStyle = '#374151';
      ctx.fillText(item.name, x + swatchSize + itemGap, baseline);
      x += item.width;
    });
  });

  ctx.drawImage(img, 0, headerHeight, width, height);
  return { dataUrl: canvas.toDataURL('image/png'), width, height: headerHeight + height };
}

function dataUrlBytes(dataUrl: string) {
  const base64Length = dataUrl.length - dataUrl.indexOf(',') - 1;
  return Math.ceil(base64Length * 3 / 4);
}

// Re-encodes the lossless capture as JPEG, first lowering quality and then
// downscaling until the result fits inside the export size cap
async function jpegUnderLimit(dataUrl: string, maxBytes: number) {
  const img = await loadImage(dataUrl);
  let best = dataUrl;
  for (const scale of [1, 0.75, 0.5, 0.35]) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return best;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const quality of [1, 0.9, 0.8, 0.7, 0.55]) {
      const out = canvas.toDataURL('image/jpeg', quality);
      best = out;
      if (dataUrlBytes(out) <= maxBytes) return out;
    }
  }
  return best;
}

export async function exportSchedule(
  element: HTMLElement,
  format: 'jpeg' | 'pdf',
  fileName: string,
  header?: ExportHeaderData
) {
  let { dataUrl, width, height } = await captureFullElement(element);
  if (header) ({ dataUrl, width, height } = await applyHeader(dataUrl, header, width, height));

  if (format === 'jpeg') {
    const link = document.createElement('a');
    link.href = await jpegUnderLimit(dataUrl, MAX_EXPORT_BYTES);
    link.download = `${fileName}.jpg`;
    link.click();
    return;
  }

  const { jsPDF } = await import('jspdf');
  const buildPdf = (imgDataUrl: string, imgFormat: 'PNG' | 'JPEG') => {
    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height],
      hotfixes: ['px_scaling'],
    });
    pdf.addImage(imgDataUrl, imgFormat, 0, 0, width, height);
    return pdf;
  };

  // Prefer the lossless PNG, but rebuild with a compressed image if the
  // finished PDF would exceed the size cap
  let pdf = buildPdf(dataUrl, 'PNG');
  if (pdf.output('arraybuffer').byteLength > MAX_EXPORT_BYTES) {
    const compressed = await jpegUnderLimit(dataUrl, MAX_EXPORT_BYTES * 0.9);
    pdf = buildPdf(compressed, 'JPEG');
  }
  pdf.save(`${fileName}.pdf`);
}
