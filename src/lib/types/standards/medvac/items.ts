export type Item = {
	id: string;
	itemName: string;
	farmType: string;
	category: string;
	perThousand: number;
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
