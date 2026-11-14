import { drizzle } from 'drizzle-orm/mysql2';
import { reset } from 'drizzle-seed';
import * as schema from './src/lib/server/db/schema'; // Ensure this path is correct

// Pass a configuration object instead of just the raw string
const db = drizzle({ connection: process.env.DATABASE_URL! });

async function main() {
	console.log('⏳ Wiping all MySQL table data...');
	try {
		await reset(db, schema);
		console.log('✅ Success! All tables truncated.');
	} catch (error) {
		console.error('❌ Failed to reset database:', error);
	} finally {
		process.exit(0);
	}
}

main();
