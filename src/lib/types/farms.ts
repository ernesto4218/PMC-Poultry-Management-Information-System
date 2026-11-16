export interface Farm {
	id: string;
	name: string; // Farm name
	code: string; // Farm code
	address: string; // Address
	type: string;
	volume: number; // Volume
}

export const farmTypes = ['CON', 'CCS'];

export type FarmForm = Omit<Farm, 'id'>;

export const emptyFarmForm = (): FarmForm => ({
	name: '',
	code: '',
	address: '',
	type: '',
	volume: 0
});

export const farmToForm = (farm: Farm): FarmForm => {
	const { id: _id, ...rest } = farm;
	return { ...rest };
};
