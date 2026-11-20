import { registerParticularsFormulas } from '#lib/server/particulars-formulas.server.ts';

// Ensure formulas are registered once
registerParticularsFormulas();

// Map to store registered handlers
const formulaRegistry = new Map<string, Function>();

export function registerQtyFormula(key: string, handler: Function) {
	formulaRegistry.set(key, handler);
}

export async function evaluateMemoryFormulas(memory: any, queryParams: URLSearchParams) {
	// Extract contextual parameters like farm code or volume if passed in query string
	const code = queryParams.get('code') ?? '';
	const volume = Number(queryParams.get('volume') ?? 0);

	const ctx = { code, volume };

	// Loop through memory items and evaluate formula modes
	for (const item of memory.items) {
		if (item.mode === 'formula' && item.formulaKey) {
			const handler = formulaRegistry.get(item.formulaKey);
			if (handler) {
				try {
					// Pass parsed formulaParams or fallback to query params context
					const params = item.formulaParams ?? { code, volume };
					console.log('Formula evaluators params', params);
					item.qty = await handler(params, ctx);
				} catch (err) {
					console.error(`Failed to evaluate formula "${item.formulaKey}":`, err);
					item.qty = 0; // fallback value on error
				}
			}
		}
	}

	return memory;
}
