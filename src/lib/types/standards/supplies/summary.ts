// #lib/types/standards/summary.ts
export type StandardKey = 'costitems' | 'manpower' | 'supplies' | 'medsvac';

export type StandardSummary = {
	key: StandardKey;
	active: number;
	archived: number;
	/** Headline figure, e.g. total PHP or number of categories */
	highlightLabel: string;
	highlightValue: string;
	/** ISO string of the most recent updatedAt, or null if empty */
	lastUpdated: string | null;
};
