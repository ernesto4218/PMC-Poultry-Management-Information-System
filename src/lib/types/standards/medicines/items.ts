export const MEDICINE_UNITS = ['gms', 'gms/gL', 'mL/gL', 'g/ml'] as const;
export type MedicineUnit = (typeof MEDICINE_UNITS)[number];

export type Item = {
	id: string;
	itemName: string;
	areaName: string;
	price: number;
	// farmType removed
	value: number;
	unit: MedicineUnit;
	amDuration: string;
	amPmDuration: string;
	pmDuration: string;
	isArchived?: boolean;
	archivedAt?: string | null;
	createdAt?: string;
	updatedAt?: string;
};

// History types unchanged
export type HistoryAction = 'created' | 'updated' | 'archived' | 'restored' | 'deleted';
export type HistoryChange = { from: unknown; to: unknown };
export type HistoryEntry = {
	id: string;
	standardId: string;
	action: HistoryAction;
	changes: Record<string, HistoryChange> | null;
	changedAt: string;
	changedBy?: string | null;
};
