export function formatNumber(
	value: number | string,
	opts: { roundUp?: boolean; decimals?: number } = {}
): string {
	let number = Number(value);
	if (Number.isNaN(number)) return '0';

	const { roundUp = false, decimals = 0 } = opts;

	if (roundUp) {
		const f = 10 ** decimals;
		number = Math.ceil(number * f - 1e-9) / f; // 0.53 -> 0.6
	}

	return number.toLocaleString(undefined, {
		minimumFractionDigits: roundUp ? 0 : number % 1 === 0 ? 0 : 2,
		maximumFractionDigits: roundUp ? decimals : 2
	});
}

export function formatPerChick(value: number | string): string {
	const number = Number(value);
	if (Number.isNaN(number)) return '0.0000';

	return number.toLocaleString('en-PH', {
		minimumFractionDigits: 4,
		maximumFractionDigits: 4
	});
}

export function formatCurrency(value: number | string): string {
	const number = Number(value);
	if (Number.isNaN(number)) return '0.00';

	return number.toLocaleString('en-PH', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

export function formatDateShort(value: string | null | undefined): string {
	if (!value) return '—';

	const s = String(value).slice(0, 10);
	const parts = s.split('-');

	if (parts.length !== 3) {
		const d = new Date(value);

		return Number.isNaN(d.getTime())
			? '—'
			: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	const [y, m, d] = parts.map(Number);
	if (!y || !m || !d) return '—';

	return new Date(y, m - 1, d).toLocaleDateString('en-PH', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

export function toTitle(s = ''): string {
	return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function addDaysToDate(dateStr: string | null | undefined, days: number): string | null {
	if (!dateStr) return null;

	const s = String(dateStr).slice(0, 10);
	const parts = s.split('-').map(Number);

	if (parts.length !== 3 || parts.some((n) => !n)) return null;

	const [y, m, d] = parts;
	const dt = new Date(y, m - 1, d);

	dt.setDate(dt.getDate() + (Number(days) || 0));

	const yy = dt.getFullYear();
	const mm = String(dt.getMonth() + 1).padStart(2, '0');
	const dd = String(dt.getDate()).padStart(2, '0');

	return `${yy}-${mm}-${dd}`;
}
