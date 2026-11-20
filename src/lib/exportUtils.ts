const MAX_CANVAS_SIDE = 16000;

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

interface AxisCrop {
  axis: 'x' | 'y';
  keep: number; // leading region kept before the cut (weekday header / label columns)
  from: number; // where the visible range starts (current date / week)
  to: number; // where it ends (week after the last event block)
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
async function cropCapture(dataUrl: string, crop: AxisCrop, width: number, height: number, pixelRatio: number) {
  if (crop.to - crop.from <= 0) return { dataUrl, width, height };
  const img = await loadImage(dataUrl);
  const r = pixelRatio;
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
  } else {
    ctx.drawImage(img, 0, 0, crop.keep * r, img.height, 0, 0, crop.keep * r, img.height);
    ctx.drawImage(img, crop.from * r, 0, (crop.to - crop.from) * r, img.height, crop.keep * r, 0, (crop.to - crop.from) * r, img.height);
  }
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.95), width: outWidth, height: outHeight };
}

// Renders the whole schedule (not just the part scrolled into view) to a JPEG data URL.
// The element is temporarily expanded so nothing inside it needs to scroll, then restored.
async function captureFullElement(element: HTMLElement) {
  const { toJpeg } = await import('html-to-image');

  const saved = {
    width: element.style.width,
    height: element.style.height,
    flexShrink: element.style.flexShrink,
    zoom: element.style.getPropertyValue('zoom'),
  };

  element.style.setProperty('zoom', '1');
  await nextFrame();

  const scrollers = Array.from(element.querySelectorAll<HTMLElement>('*')).filter(el => {
    if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) return false;
    const { overflowX, overflowY } = getComputedStyle(el);
    return [overflowX, overflowY].some(v => v === 'auto' || v === 'scroll');
  });
  const scrollPositions = scrollers.map(el => ({ el, top: el.scrollTop, left: el.scrollLeft }));
  const extraWidth = Math.max(0, ...scrollers.map(el => el.scrollWidth - el.clientWidth));
  const extraHeight = Math.max(0, ...scrollers.map(el => el.scrollHeight - el.clientHeight));
  const width = element.clientWidth + extraWidth;
  let height = element.clientHeight + extraHeight;

  try {
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.flexShrink = '0';
    // The captured clone always renders unscrolled, so measurements must match
    scrollers.forEach(el => {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    });
    await nextFrame();
    await nextFrame();

    const elRect = element.getBoundingClientRect();
    const { top, left } = elRect;

    // Trim empty space below the last row when the schedule is shorter than the window
    const contentBottom = Math.max(
      0,
      ...Array.from(element.querySelectorAll<HTMLElement>('*'))
        .filter(el => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY))
        .flatMap(el => Array.from(el.children))
        .map(child => child.getBoundingClientRect().bottom - top)
    );
    if (contentBottom > 0) height = Math.min(height, Math.ceil(contentBottom) + 1);

    // Crop to the visible range: views mark their time-axis cells with
    // data-export-cell, the current date/week with data-export-start, and the
    // week after the last filtered event with data-export-end.
    const cells = Array.from(element.querySelectorAll<HTMLElement>('[data-export-cell]'));
    const startCell = element.querySelector<HTMLElement>('[data-export-start]');
    let crop: AxisCrop | null = null;
    if (cells.length > 0 && startCell) {
      const first = cells[0].getBoundingClientRect();
      const start = startCell.getBoundingClientRect();
      const second = cells[1]?.getBoundingClientRect();
      const vertical = !second || Math.abs(second.top - first.top) > Math.abs(second.left - first.left);
      const endCell = element.querySelector<HTMLElement>('[data-export-end]') ?? cells[cells.length - 1];
      const end = endCell.getBoundingClientRect();
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

    const pixelRatio = Math.min(2, MAX_CANVAS_SIDE / width, MAX_CANVAS_SIDE / height);
    const dataUrl = await toJpeg(element, {
      width,
      height,
      pixelRatio,
      quality: 0.95,
      backgroundColor: '#ffffff',
    });
    if (crop) return cropCapture(dataUrl, crop, width, height, pixelRatio);
    return { dataUrl, width, height };
  } finally {
    element.style.width = saved.width;
    element.style.height = saved.height;
    element.style.flexShrink = saved.flexShrink;
    if (saved.zoom) element.style.setProperty('zoom', saved.zoom);
    else element.style.removeProperty('zoom');
    await nextFrame();
    scrollPositions.forEach(({ el, top, left }) => {
      el.scrollTop = top;
      el.scrollLeft = left;
    });
  }
}

// Draws a single header row - title, export date and campaign legend on the
// left, schedule and campaign logos vertically centred on the right.
async function applyHeader(dataUrl: string, header: ExportHeaderData, width: number, height: number) {
  const img = await loadImage(dataUrl);
  const r = img.width / width;

  const padX = 16;
  const padY = 16;

  // Schedule logo first, then each visible campaign's logo (de-duplicated)
  const logoUrls = [
    ...(header.scheduleLogoUrl ? [header.scheduleLogoUrl] : []),
    ...header.campaigns.map(c => c.logoUrl).filter((u): u is string => !!u),
  ].filter((u, i, arr) => arr.indexOf(u) === i);
  const logoImgs = (await Promise.all(logoUrls.map(loadLogo))).filter(
    (img): img is HTMLImageElement => !!img
  );

  const logoMaxH = 72;
  const logoMaxW = 280;
  const logoGap = 16;
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

  const titleSize = 30;
  const dateSize = 24;
  const legendSize = 24;
  const swatchSize = 20;
  const itemGap = 20;
  const legendLineHeight = 30;
  const legendBottomPad = 16;

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
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.95), width, height: headerHeight + height };
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
    link.href = dataUrl;
    link.download = `${fileName}.jpg`;
    link.click();
    return;
  }

  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width, height],
    hotfixes: ['px_scaling'],
  });
  pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height);
  pdf.save(`${fileName}.pdf`);
}
