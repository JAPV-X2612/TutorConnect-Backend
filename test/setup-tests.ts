import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno de .env.test
config({ path: resolve(__dirname, '../.env.test') });
