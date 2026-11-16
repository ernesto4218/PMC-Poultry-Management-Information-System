export type Particular = {
	id: string;
	name: string;
	qty: number;
	price: number;
	/** Signed day count. null = no adjustment. */
	adjustmentDays: number | null;
	createdAt: string;
	updatedAt: string;
};

export type ParticularInput = {
	id?: string;
	name: string;
	qty: number;
	price: number;
	adjustmentDays: number | null;
};
