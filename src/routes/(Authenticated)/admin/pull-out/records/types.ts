export type PullOutRow = {
	id: string; // `${documentId}::${rowIndex}`
	documentId: string;
	rowIndex: number;
	status: string;
	farmId: string;
	farmCode: string;
	farmName: string;
	farmType: string | null;
	chickBatchId: string;
	batchNumber: string;
	volume: number;
	feedName: string;
	label: string;
	day: number | null;
	dateKey: string;
	dateLabel: string;
	qty: string;
	price: string;
	amount: string;
	qtyNum: number;
	priceNum: number;
	amountNum: number;
	remarks: string;
	dispatchedQty: number;
	remainingQty: number;
	fulfilled: boolean;
	supplierId?: string | null;
	supplierName?: string | null;
	warehouseStock: number | null;
};
export type Supplier = { id: string; name: string };

export type Truck = { id: string; plateNumber: string; capacity: number; driverId?: string | null };
export type Driver = { id: string; name: string };

export type StoreData = {
	pullouts: PullOutRow[];
	trucks: Truck[];
	drivers: Driver[];
	suppliers?: Supplier[];
};
export type SortKey = 'date' | 'farm' | 'feed' | 'amount' | 'qty';
export type SortValue = `${SortKey}-${'asc' | 'desc'}`;

export type DateWindow =
	'all' | 'today' | 'tomorrow' | 'next-7' | 'next-30' | 'overdue' | 'this-month' | 'no-date';

export type Summary = {
	total: number;
	today: number;
	overdue: number;
	week: number;
	totalAmount: number;
	farms: number;
	batches: number;
};
