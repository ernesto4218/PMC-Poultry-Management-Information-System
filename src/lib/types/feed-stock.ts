export const movementTypes = ['delivery', 'from-farm', 'to-farm', 'adjustment'] as const;
export type MovementType = (typeof movementTypes)[number];

export const movementStatuses = ['Pending', 'Completed', 'Cancelled'] as const;
export type MovementStatus = (typeof movementStatuses)[number];

export type MovementDirection = 'in' | 'out';

export const movementTypeLabels: Record<MovementType, string> = {
	delivery: 'Delivery',
	'from-farm': 'From Farm',
	'to-farm': 'To Farm',
	adjustment: 'Adjustment'
};

export const movementTypeDirections: Record<
	Exclude<MovementType, 'adjustment'>,
	MovementDirection
> = {
	delivery: 'in',
	'from-farm': 'in',
	'to-farm': 'out'
};

export type StockStatus = 'ok' | 'low' | 'out';

export function stockStatus(onHand: number, minStock: number): StockStatus {
	if (onHand <= 0) return 'out';
	if (minStock > 0 && onHand <= minStock) return 'low';
	return 'ok';
}

export type FeedInventoryRow = {
	feedProductId: string;
	productName: string;
	sku: string;
	feedType: string;
	stage: string;
	supplierId: string;
	supplierName: string;
	onHand: number;
	minStock: number;
	lastMovementAt: string | null;
	status: StockStatus;
};

export type FeedMovementRow = {
	id: string;
	movementType: MovementType;
	direction: MovementDirection;
	feedProductId: string;
	productName: string;
	sku: string;
	supplierId: string | null;
	supplierName: string | null;
	farmId: string | null;
	farmName: string | null;
	farmCode: string | null;
	driverId: string | null;
	driverName: string | null;
	qty: number;
	chickInCode: string;
	truckPlate: string;
	status: MovementStatus;
	remarks: string;
	createdAt: string | Date;
};

export type MovementForm = {
	movementType: MovementType;
	feedProductId: string;
	supplierId: string;
	farmId: string;
	driverId: string;
	qty: number;
	chickInCode: string;
	truckPlate: string;
	status: MovementStatus;
	remarks: string;
	adjustDirection: 'in' | 'out';
};

export function emptyMovementForm(): MovementForm {
	return {
		movementType: 'delivery',
		feedProductId: '',
		supplierId: '',
		farmId: '',
		driverId: '',
		qty: 0,
		chickInCode: '',
		truckPlate: '',
		status: 'Completed',
		remarks: '',
		adjustDirection: 'in'
	};
}
