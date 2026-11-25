import type { ParticularCategory } from '#lib/types/particulars.ts';

export type AmountInput = {
	particularCategory: ParticularCategory;
	qty: number;
	resolvedQty?: number;
	price: number;
	adjustmentDays?: number | null;
	particularName: string;
	formulaParams?: Record<string, string>;
};

type AmountCalculator = (item: AmountInput) => number;

const qtyOf = (i: AmountInput) => i.resolvedQty ?? i.qty;
const basicAmount = (i: AmountInput) => qtyOf(i) * i.price;

export const amountCalculators: Record<ParticularCategory, AmountCalculator> = {
	DOC: basicAmount,
	FEEDS: basicAmount,
	'MED&VAC': basicAmount,
	OTHERS: basicAmount,

	ADVANCES: (i) => {
		const raw = i.formulaParams?.['cycle'];
		const cycle = raw ? Number(raw) : NaN;
		if (Number.isFinite(cycle)) {
			return qtyOf(i) * i.price * cycle;
		}

		// Non-formula one-offs
		switch (i.particularName.toLowerCase()) {
			case 'farm overtime':
				return 4 * 21 * 72.5 * qtyOf(i);
			case 'farm overtime harvest':
				return qtyOf(i) * 7 * i.price * 4;
			case 'farm overtime brooding':
				return qtyOf(i) * 14 * i.price * 4;
			default:
				return basicAmount(i);
		}
	}
};

export function computeAmount(item: AmountInput): number {
	return amountCalculators[item.particularCategory](item);
}
