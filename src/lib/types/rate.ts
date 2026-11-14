export type RateRow = {
	id: string;
	stdStart: string; // e.g. "2025-01-01"
	stdEnd: string; // e.g. "2025-12-31"
	type: string; // "Base", "Overtime", …
	subType: string; // specific spec
	std: number; // standard hours / units
	unit: string; // "kg", "Bags", "kg", …
	pricePerBasicUnit: number;
	unitPerPrice: number;
	duration: string; // "1 month", "6 months", …
};
