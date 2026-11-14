import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import { DATABASE_URL } from '$app/env/private';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const globalForDb = globalThis as unknown as { __dbPool?: mysql.Pool };

const client =
	globalForDb.__dbPool ??
	mysql.createPool({
		uri: DATABASE_URL,
		connectionLimit: 5,
		waitForConnections: true,
		queueLimit: 0,
		idleTimeout: 60_000
	});

if (process.env.NODE_ENV !== 'production') globalForDb.__dbPool = client;

export const db = drizzle(client, { schema, mode: 'default' });
