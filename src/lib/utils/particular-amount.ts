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
		const cycle = Number(i.formulaParams?.['cycle']);
		if (Number.isFinite(cycle)) {
			return qtyOf(i) * i.price * cycle;
		}

		// Non-formula one-offs
		switch (i.particularName) {
			case 'Farm Overtime':
				return 4 * 21 * 72.5 * 4;
			case 'PHIC':
			case 'PAG-IBIG':
			default:
				return basicAmount(i);
		}
	}
};

export function computeAmount(item: AmountInput): number {
	return amountCalculators[item.particularCategory](item);
}
