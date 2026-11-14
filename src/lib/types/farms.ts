export interface Farm {
	id: string;
	name: string; // Farm name
	code: string; // Farm code
	address: string; // Address
	type: string;
}

export const farmTypes = ['CON-MAH', 'CCS', 'CON-PAG'];

export type FarmForm = Omit<Farm, 'id'>;

export const emptyFarmForm = (): FarmForm => ({
	name: '',
	code: '',
	address: '',
	type: ''
});

export const farmToForm = (farm: Farm): FarmForm => {
	const { id: _id, ...rest } = farm;
	return { ...rest };
};
