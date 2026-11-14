import { db } from '#lib/server/db/index.ts';
import { feedProduct } from '#lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import type { FeedProduct } from '#lib/types/feedProducts.ts';

export class FeedProductService {
	static async getAllProducts(): Promise<FeedProduct[]> {
		return await db.select().from(feedProduct);
	}

	static async getBySupplierId(supplierId: string): Promise<FeedProduct[]> {
		const rows = await db.select().from(feedProduct).where(eq(feedProduct.supplierId, supplierId));
		return rows.sort(
			(a, b) => a.feedType.localeCompare(b.feedType) || a.stage.localeCompare(b.stage)
		);
	}

	static async createProduct(data: FeedProduct): Promise<FeedProduct> {
		if (!data.supplierId) throw new Error('Supplier is required.');
		if (!data.feedType?.trim()) throw new Error('Feed type is required.');
		if (!data.stage?.trim()) throw new Error('Stage is required.');

		const row: FeedProduct = {
			id: data.id,
			supplierId: data.supplierId,
			feedType: data.feedType.trim(),
			stage: data.stage.trim(),
			name: (data.name ?? '').trim(),
			sku: (data.sku ?? '').trim(),
			active: data.active ?? 1
		};
		await db.insert(feedProduct).values(row);
		return row;
	}

	static async updateProduct(data: FeedProduct): Promise<FeedProduct> {
		if (!data.id) throw new Error('Product ID is required.');
		if (!data.supplierId) throw new Error('Supplier is required.');
		if (!data.feedType?.trim()) throw new Error('Feed type is required.');
		if (!data.stage?.trim()) throw new Error('Stage is required.');

		const row: FeedProduct = {
			id: data.id,
			supplierId: data.supplierId,
			feedType: data.feedType.trim(),
			stage: data.stage.trim(),
			name: (data.name ?? '').trim(),
			sku: (data.sku ?? '').trim(),
			active: data.active ?? 1
		};
		await db.update(feedProduct).set(row).where(eq(feedProduct.id, data.id));
		return row;
	}

	static async deleteProduct(id: string): Promise<void> {
		const [existing] = await db.select().from(feedProduct).where(eq(feedProduct.id, id)).limit(1);
		if (!existing) throw new Error('Product not found.');
		await db.delete(feedProduct).where(eq(feedProduct.id, id));
	}
}
