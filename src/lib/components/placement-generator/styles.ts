export const toolbar =
	'flex flex-wrap items-center gap-2 border-b border-red-100 bg-gradient-to-r from-red-50 to-amber-50 px-3 py-2';

export const tableRoot = 'w-max min-w-full border-separate border-spacing-0 text-xs';

export const tableWrap =
	'[&>[data-slot=table-container]]:max-h-[70vh] [&>[data-slot=table-container]]:overflow-auto';

const thBase =
	'sticky top-0 h-9 border-r border-b border-gray-300 px-2 text-xs font-bold text-gray-900';

export const th = `${thBase} z-20 bg-amber-50`;
export const thFirst = `${thBase} left-0 z-30 bg-amber-100`;

export const tdBase = 'border-r border-b border-gray-200 px-2 py-1.5 text-xs';
export const tdFirst =
	'sticky left-0 z-10 border-r border-b border-gray-200 bg-amber-50 px-2 py-1.5 text-xs font-bold text-gray-900';

export const tfBase =
	'sticky bottom-0 z-20 border-t border-r border-gray-300 bg-amber-100 px-2 py-1.5 text-xs font-bold text-gray-900';
