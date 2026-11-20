import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	ParticularsMemoryService,
	listQtyFormulas
} from '#lib/services/particulars-memories.services.ts';
import { registerParticularsFormulas } from '#lib/server/particulars-formulas.server.ts';
import { StandardMedicineService } from '#lib/services/standardsmedicine.services.ts';

export const load: PageServerLoad = async ({ params }) => {
	registerParticularsFormulas();

	const medicines = await StandardMedicineService.getAll();
	const memory = await ParticularsMemoryService.getMemoryById(params.id);
	if (!memory) throw error(404, 'Memory not found.');

	console.log(listQtyFormulas());
	const items = await ParticularsMemoryService.listItems(params.id);
	return { medicines, memory, items, formulaKeys: listQtyFormulas() };
};
