import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FeedProductService } from '#lib/services/feedProducts.services.ts';

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await FeedProductService.deleteProduct(params.id);
		return json({ success: true });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to delete product.' }, { status: 400 });
	}
};
