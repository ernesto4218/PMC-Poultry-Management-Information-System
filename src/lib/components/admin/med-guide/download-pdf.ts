export async function downloadElementAsPdf(id: string, filename = 'report.pdf') {
	const el = document.getElementById(id);
	if (!el) return;

	const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
	await document.fonts?.ready;

	const rect = el.getBoundingClientRect();
	const width = Math.ceil(rect.width);
	const height = Math.ceil(el.scrollHeight);

	const dataUrl = await toPng(el, {
		pixelRatio: 3,
		backgroundColor: '#ffffff',
		width,
		height,
		// undo the dialog's centered/fixed popup styling on the captured copy
		style: {
			transform: 'none',
			translate: 'none', // Tailwind v4 centers with this property
			margin: '0',
			top: '0',
			left: '0',
			right: 'auto',
			bottom: 'auto',
			width: `${width}px`,
			height: `${height}px`,
			maxWidth: 'none',
			maxHeight: 'none',
			overflow: 'visible'
		},
		// leave the close (X) and Download buttons out of the PDF
		filter: (node) => !(node instanceof HTMLElement && node.tagName === 'BUTTON')
	});

	// Long bond paper, landscape: 13 in wide x 8.5 in tall, 0.3 in margin
	const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [8.5, 13] });
	const pageW = pdf.internal.pageSize.getWidth(); // 13
	const pageH = pdf.internal.pageSize.getHeight(); // 8.5
	const margin = 0.3;

	const ratio = Math.min((pageW - margin * 2) / width, (pageH - margin * 2) / height);
	const w = width * ratio;
	const h = height * ratio;

	pdf.addImage(dataUrl, 'PNG', (pageW - w) / 2, (pageH - h) / 2, w, h);
	pdf.save(filename);
}
