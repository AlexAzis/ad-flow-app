const MAX_CANVAS_SIDE = 16000;

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

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
    await nextFrame();
    await nextFrame();

    // Trim empty space below the last row when the schedule is shorter than the window
    const top = element.getBoundingClientRect().top;
    const contentBottom = Math.max(
      0,
      ...Array.from(element.querySelectorAll<HTMLElement>('*'))
        .filter(el => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY))
        .flatMap(el => Array.from(el.children))
        .map(child => child.getBoundingClientRect().bottom - top)
    );
    if (contentBottom > 0) height = Math.min(height, Math.ceil(contentBottom) + 1);

    // Daily views: crop one week below the last week that has any events
    const weekRows = Array.from(element.querySelectorAll<HTMLElement>('[data-week-row]'));
    const lastWithEvents = weekRows.map(row => row.dataset.hasEvents === 'true').lastIndexOf(true);
    if (lastWithEvents >= 0) {
      const cutRow = weekRows[Math.min(lastWithEvents + 1, weekRows.length - 1)];
      height = Math.min(height, Math.ceil(cutRow.getBoundingClientRect().bottom - top));
    }

    const pixelRatio = Math.min(2, MAX_CANVAS_SIDE / width, MAX_CANVAS_SIDE / height);
    const dataUrl = await toJpeg(element, {
      width,
      height,
      pixelRatio,
      quality: 0.95,
      backgroundColor: '#ffffff',
    });
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

export async function exportSchedule(element: HTMLElement, format: 'jpeg' | 'pdf', fileName: string) {
  const { dataUrl, width, height } = await captureFullElement(element);

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
