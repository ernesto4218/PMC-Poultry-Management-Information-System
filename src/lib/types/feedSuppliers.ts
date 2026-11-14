export interface FeedSupplier {
	id: string;
	name: string;
	code: string;
	contactPerson: string;
	email: string;
	phone: string;
	address: string;
	status: string;
	notes: string;
}

export type FeedSupplierForm = Omit<FeedSupplier, 'id'>;

export const supplierStatuses = ['Active', 'Inactive'] as const;

export const emptySupplierForm = (): FeedSupplierForm => ({
	name: '',
	code: '',
	contactPerson: '',
	email: '',
	phone: '',
	address: '',
	status: 'Active',
	notes: ''
});

export const supplierToForm = (s: FeedSupplier): FeedSupplierForm => {
	const { id: _id, ...rest } = s;
	return { ...rest };
};
