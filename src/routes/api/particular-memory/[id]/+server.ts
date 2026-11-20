// src/routes/api/particulars-memory/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ParticularsMemoryService } from '#lib/services/particulars-memories.services.ts';

export const GET: RequestHandler = async ({ params, url }) => {
	// 1. Extract query parameters sent from the client (e.g., ?code=JAYS2-H2)
	const farmCode = url.searchParams.get('code') ?? '';
	const farmId = url.searchParams.get('farmId') ?? farmCode;

	// 2. Build the context object that your formulas expect (ctx)
	const context = {
		farmId,
		farmCode
		// You can include any other request-scoped data here
	};

	// 3. Resolve the memory and evaluate all formulas dynamically
	const resolvedMemory = await ParticularsMemoryService.resolveMemory(params.id, context);

	if (!resolvedMemory) {
		throw error(404, 'Particulars memory not found');
	}

	// console.log('Resolve memory ', resolvedMemory);

	// 4. Return the fully computed results (with resolved quantities and total) as JSON
	return json(resolvedMemory);
};
