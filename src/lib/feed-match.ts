// Place at: src/lib/feed-match.ts
// Matches budget feed names ("Starter 1", "Booster #2", "Start 3") to warehouse
// product names ("Starter", "Booster", "Grower").

export interface WarehouseProduct {
	id: string;
	name?: string | null;
	sku?: string | null;
	feedType?: string | null;
	stage?: string | null;
	supplierId?: string | null;
}

export function getProductStageKey(product: WarehouseProduct): string {
	return normalizeFeedName(product.stage || product.name || '');
}

/** "Starter 1" / "Starter #2" / "Starter-3" / "Starter No. 1" / "Starter1" → "starter" */
export function normalizeFeedName(name: string | null | undefined): string {
	const tokens = String(name ?? '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.split(' ')
		.filter(Boolean);

	// drop trailing sequence markers: 1, 2, "no", "number"
	while (tokens.length > 1) {
		const last = tokens[tokens.length - 1];
		if (/^\d+$/.test(last) || last === 'no' || last === 'number') tokens.pop();
		else break;
	}
	// "starter1" → "starter"
	if (tokens.length) {
		const last = tokens[tokens.length - 1];
		tokens[tokens.length - 1] = last.replace(/\d+$/, '') || last;
	}
	return tokens.join(' ').trim();
}

/**
 * Finds the warehouse key for a feed name.
 *  1. exact match on the normalized name  ("Starter 1" → "starter")
 *  2. otherwise a UNIQUE prefix match     ("Start 1"   → "starter")
 * Returns null when nothing (or more than one thing) matches.
 */
export function matchFeedKey(feedName: string, keys: Iterable<string>): string | null {
	const n = normalizeFeedName(feedName);
	if (!n) return null;
	const list = [...keys];
	if (list.includes(n)) return n;
	if (n.length < 3) return null;
	const hits = list.filter((k) => k.startsWith(n) || (k.length >= 3 && n.startsWith(k)));
	return hits.length === 1 ? hits[0] : null;
}

export function matchWarehouseProducts(
	feedName: string,
	products: WarehouseProduct[],
	options?: { supplierId?: string | null; feedType?: string | null }
): WarehouseProduct[] {
	const scoped = products.filter((p) => {
		if (options?.supplierId && p.supplierId !== options.supplierId) return false;
		if (
			options?.feedType &&
			p.feedType &&
			p.feedType.toLowerCase() !== options.feedType.toLowerCase()
		) {
			return false;
		}
		return true;
	});

	const stageToProducts = new Map<string, WarehouseProduct[]>();
	for (const product of scoped) {
		const key = getProductStageKey(product);
		if (!key) continue;
		const bucket = stageToProducts.get(key) ?? [];
		bucket.push(product);
		stageToProducts.set(key, bucket);
	}

	const matchedKey = matchFeedKey(feedName, stageToProducts.keys());
	return matchedKey ? (stageToProducts.get(matchedKey) ?? []) : [];
}
