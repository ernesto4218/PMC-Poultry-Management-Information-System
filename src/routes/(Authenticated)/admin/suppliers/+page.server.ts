// src/routes/admin/suppliers/+page.server.ts
import type { PageServerLoad } from './$types';
import { FeedSupplierService } from '#lib/services/feedSuppliers.services.ts';
import { FeedProductService } from '#lib/services/feedProducts.services.ts';

export const load: PageServerLoad = async () => {
	try {
		const [suppliers, products] = await Promise.all([
			FeedSupplierService.getAllSuppliers(),
			FeedProductService.getAllProducts()
		]);
		return { suppliers, products };
	} catch (err) {
		console.error('Failed to load suppliers:', err);
		return { suppliers: [], products: [] };
	}
};
