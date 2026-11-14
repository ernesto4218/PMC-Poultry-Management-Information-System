import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FeedSupplierService } from '#lib/services/feedSuppliers.services.ts';
import type { FeedSupplier } from '#lib/types/feedSuppliers.ts';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as FeedSupplier;
		const supplier = await FeedSupplierService.createSupplier(body);
		return json({ supplier }, { status: 201 });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to create supplier.' }, { status: 400 });
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as FeedSupplier;
		const supplier = await FeedSupplierService.updateSupplier(body);
		return json({ supplier });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to update supplier.' }, { status: 400 });
	}
};
