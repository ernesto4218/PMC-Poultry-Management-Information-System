export type ChickBatchReportRow = {
	id: string;
	batchNumber: string;
	farmId: string;
	farmName: string;
	farmCode: string;
	farmAddress: string;
	dateSet: string; // 'YYYY-MM-DD'
	volume: number;
};

export type ChickBatchReportSnapshotData = {
	batches: ChickBatchReportRow[];
	totals: { batches: number; chicks: number; avg: number; farms: number };
	farmLabel: string;
	dateRange: { from: string; to: string } | null;
};

export type ChickBatchReportFilters = {
	search: string;
	farmId: string | null;
	farmLabel: string;
	sort: string;
};
