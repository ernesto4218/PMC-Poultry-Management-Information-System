export const FEED_CATEGORY = 'FEEDS';
export const FEED_TRUCKING_RATE = 65;
export const FEED_LABOR_RATE = 6;

export const FEED_TYPES = ['booster', 'pre-starter', 'starter', 'grower', 'finisher'];

const FEED_PATTERN = new RegExp(`(${FEED_TYPES.join('|')})\\s*-?\\s*(\\d+)?`, 'i');

export interface ParsedFeed {
	type: string;
	typeIdx: number;
	num: number;
	key: string;
}

export function parseFeed(name: string | null | undefined): ParsedFeed | null {
	const m = FEED_PATTERN.exec(String(name ?? ''));
	if (!m) return null;

	const type = m[1].toLowerCase();
	const num = m[2] ? Number(m[2]) : 0;

	return {
		type,
		typeIdx: FEED_TYPES.indexOf(type),
		num,
		key: num ? `${type} ${num}` : type
	};
}
