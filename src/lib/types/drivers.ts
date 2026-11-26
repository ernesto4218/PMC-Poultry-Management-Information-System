export const driverStatuses = ['Active', 'Inactive'] as const;
export type DriverStatus = (typeof driverStatuses)[number];

export type Driver = {
	id: string;
	name: string;
	phone: string;
	address: string;
	status: DriverStatus;
	notes: string;
	createdAt?: string | Date;
	updatedAt?: string | Date;
};

export type DriverForm = {
	name: string;
	phone: string;
	address: string;
	status: DriverStatus;
	notes: string;
};

export function emptyDriverForm(): DriverForm {
	return {
		name: '',
		phone: '',
		address: '',
		status: 'Active',
		notes: ''
	};
}

export function driverToForm(d: Driver): DriverForm {
	return {
		name: d.name,
		phone: d.phone,
		address: d.address,
		status: d.status,
		notes: d.notes
	};
}
