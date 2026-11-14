import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FeedSupplierService } from '#lib/services/feedSuppliers.services.ts';

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await FeedSupplierService.deleteSupplier(params.id);
		return json({ success: true });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to delete supplier.' }, { status: 400 });
	}
};
