export const truckStatuses = ['Active', 'Maintenance', 'Inactive'] as const;
export type TruckStatus = (typeof truckStatuses)[number];

export type Truck = {
	id: string;
	plateNumber: string;
	capacity: number;
	status: TruckStatus;
	driverId: string | null;
	notes: string;
	createdAt?: string | Date;
	updatedAt?: string | Date;
};

export type TruckForm = {
	plateNumber: string;
	capacity: number;
	status: TruckStatus;
	driverId: string;
	notes: string;
};

export function emptyTruckForm(): TruckForm {
	return {
		plateNumber: '',
		capacity: 0,
		status: 'Active',
		driverId: '',
		notes: ''
	};
}

export function truckToForm(t: Truck): TruckForm {
	return {
		plateNumber: t.plateNumber,
		capacity: t.capacity,
		status: t.status,
		driverId: t.driverId ?? '',
		notes: t.notes
	};
}
