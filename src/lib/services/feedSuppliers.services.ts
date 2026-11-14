// src/lib/services/feedSuppliers.services.ts
import { db } from '#lib/server/db/index.ts';
import { feedSupplier, feedProduct } from '#lib/server/db/schema.ts';
import { eq, or, sql, inArray } from 'drizzle-orm';
import type { FeedSupplier } from '#lib/types/feedSuppliers.ts';
import type { FeedProduct } from '#lib/types/feedProducts.ts';

export type SupplierWithProducts = Pick<FeedSupplier, 'id' | 'name' | 'code' | 'status'> & {
	products: FeedProduct[];
};

export class FeedSupplierService {
	static async getAllSuppliers(): Promise<FeedSupplier[]> {
		return await db.select().from(feedSupplier);
	}

	static async getSupplierById(id: string): Promise<FeedSupplier | null> {
		const [row] = await db.select().from(feedSupplier).where(eq(feedSupplier.id, id)).limit(1);
		return row ?? null;
	}

	static async getSuppliersWithProducts(): Promise<SupplierWithProducts[]> {
		const suppliers = await db
			.select({
				id: feedSupplier.id,
				name: feedSupplier.name,
				code: feedSupplier.code,
				status: feedSupplier.status
			})
			.from(feedSupplier);

		if (suppliers.length === 0) return [];

		const supplierIds = suppliers.map((s) => s.id);

		const products = await db
			.select()
			.from(feedProduct)
			.where(inArray(feedProduct.supplierId, supplierIds));

		const productsBySupplier = new Map<string, FeedProduct[]>();
		for (const product of products) {
			const list = productsBySupplier.get(product.supplierId);
			if (list) {
				list.push(product);
			} else {
				productsBySupplier.set(product.supplierId, [product]);
			}
		}

		return suppliers.map((supplier) => ({
			...supplier,
			products: (productsBySupplier.get(supplier.id) ?? []).sort(
				(a, b) => a.feedType.localeCompare(b.feedType) || a.stage.localeCompare(b.stage)
			)
		}));
	}

	static async checkDuplicates(name: string, code: string, excludeId?: string) {
		const conditions = [
			sql`lower(name) = lower(${name.trim()})`,
			sql`lower(code) = lower(${code.trim()})`
		];
		const existing = await db
			.select()
			.from(feedSupplier)
			.where(or(...conditions));
		const filtered = excludeId ? existing.filter((s) => s.id !== excludeId) : existing;

		return {
			duplicateName: filtered.some((s) => s.name.toLowerCase() === name.trim().toLowerCase()),
			duplicateCode: filtered.some((s) => s.code.toLowerCase() === code.trim().toLowerCase())
		};
	}

	static async createSupplier(data: FeedSupplier): Promise<FeedSupplier> {
		const { duplicateName, duplicateCode } = await this.checkDuplicates(data.name, data.code);
		if (duplicateName) throw new Error('A supplier with this name already exists.');
		if (duplicateCode) throw new Error('This supplier code is already assigned.');

		await db.insert(feedSupplier).values({
			id: data.id,
			name: data.name.trim(),
			code: data.code.trim(),
			contactPerson: data.contactPerson ?? '',
			email: data.email ?? '',
			phone: data.phone ?? '',
			address: data.address ?? '',
			status: data.status || 'Active',
			notes: data.notes ?? ''
		});
		return data;
	}

	static async updateSupplier(data: FeedSupplier): Promise<FeedSupplier> {
		const { duplicateName, duplicateCode } = await this.checkDuplicates(
			data.name,
			data.code,
			data.id
		);
		if (duplicateName) throw new Error('Another supplier with this name already exists.');
		if (duplicateCode) throw new Error('Another supplier already uses this code.');

		await db
			.update(feedSupplier)
			.set({
				name: data.name.trim(),
				code: data.code.trim(),
				contactPerson: data.contactPerson ?? '',
				email: data.email ?? '',
				phone: data.phone ?? '',
				address: data.address ?? '',
				status: data.status || 'Active',
				notes: data.notes ?? '',
				updatedAt: new Date()
			})
			.where(eq(feedSupplier.id, data.id));
		return data;
	}

	static async deleteSupplier(id: string): Promise<void> {
		const [existing] = await db.select().from(feedSupplier).where(eq(feedSupplier.id, id)).limit(1);
		if (!existing) throw new Error('Supplier not found.');
		await db.delete(feedSupplier).where(eq(feedSupplier.id, id));
	}
}
