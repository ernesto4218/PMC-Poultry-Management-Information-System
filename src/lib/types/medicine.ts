// src/lib/types/medicine.ts
export type MedicineCategory =
	'vaccine' | 'vitamin' | 'antibiotic' | 'coccidiostat' | 'electrolyte' | 'other';

export type MedicineRoute = 'injection' | 'water' | 'eye-drop' | 'spray' | 'wing-web' | 'feed';

export interface MedicineEntry {
	id: string;
	day: number;
	name: string;
	category: MedicineCategory;
	route: MedicineRoute;
	notes?: string;
	mandatory: boolean;
}
