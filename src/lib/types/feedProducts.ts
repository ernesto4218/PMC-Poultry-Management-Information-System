export interface FeedProduct {
	id: string;
	supplierId: string;
	feedType: string; // Broiler | Breeder | Layer | Hatchery
	stage: string; // Booster | Starter | Grower | Finisher | …
	name: string;
	sku: string;
	active: number; // 1 | 0
}

export type FeedProductForm = Omit<FeedProduct, 'id'>;

export const feedTypeOrder = ['Broiler', 'Breeder', 'Layer', 'Hatchery'] as const;
export const feedStages = [
	'Booster',
	'Starter',
	'Grower',
	'Finisher',
	'Pre-lay',
	'Layer Phase 1',
	'Layer Phase 2'
] as const;

export const emptyProductForm = (supplierId: string): FeedProductForm => ({
	supplierId,
	feedType: '',
	stage: '',
	name: '',
	sku: '',
	active: 1
});

/** Group products by feedType, ordered by feedTypeOrder. */
export function groupByFeedType(products: FeedProduct[]) {
	const groups = new Map<string, FeedProduct[]>();
	for (const p of products) {
		if (!groups.has(p.feedType)) groups.set(p.feedType, []);
		groups.get(p.feedType)!.push(p);
	}
	const order = feedTypeOrder as readonly string[];
	return [...groups.entries()].sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
}
