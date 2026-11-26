// $lib/components/print-dialog.ts
export const printAreaClass =
	'flex flex-col overflow-auto p-4 ' +
	// center without relying on left/top + translate
	'fixed inset-0 m-auto translate-x-0 translate-y-0 ' +
	// page size, capped to the screen (sm: overrides the default sm:max-w-lg)
	'w-[13in] h-[8.5in] ' +
	'max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] ' +
	'max-h-[calc(100vh-2rem)]';
