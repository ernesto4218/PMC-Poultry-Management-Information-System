import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FeedProductService } from '#lib/services/feedProducts.services.ts';
import type { FeedProduct } from '#lib/types/feedProducts.ts';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as FeedProduct;
		const product = await FeedProductService.createProduct(body);
		return json({ product }, { status: 201 });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to create product.' }, { status: 400 });
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as FeedProduct;
		const product = await FeedProductService.updateProduct(body);
		return json({ product });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to update product.' }, { status: 400 });
	}
};
