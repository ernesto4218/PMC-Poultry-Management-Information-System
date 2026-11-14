export const AGE_RANGES: string[] = [
	'0-1',
	'2',
	'3',
	'4',
	'5',
	'6',
	'7',
	'8',
	'9',
	'10',
	'11',
	'12',
	'13',
	'14',
	'15',
	'16',
	'17',
	'18',
	'19',
	'20',
	'21',
	'22',
	'23',
	'24',
	'25',
	'26',
	'27',
	'28',
	'29',
	'30',
	'31',
	'32',
	'33',
	'34'
];

export type StandardMedication = {
	id: string;
	name: string;
	notes: string;
	isArchived: boolean;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
	farmCount?: number;
};

export type MedicationSnapshot = {
	id: string;
	name: string;
	areaName: string;
	value: number;
	unit: string;
	amDuration: string;
	amPmDuration: string;
	pmDuration: string;
};

export type AgeEntry = {
	id: string;
	standardId: string;
	age: string;
	note: string;
	medications: MedicationSnapshot[];
	createdAt: string;
	updatedAt: string;
};
