export type Item = {
	id: string;
	itemName: string;
	farmCode: string;
	category: string;
	manpower: string;
	qty: number;
	cost: number;
	hours: number;
	multiplier: number;
	amount: number;
	amountPhp: number;
	isArchived?: boolean;
	archivedAt?: string | null;
	createdAt?: string;
	updatedAt?: string;
};

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
