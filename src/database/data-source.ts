import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();
export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || "0.0.0.0",
    port: parseInt(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME || "behzad1k",
    password: process.env.DB_PASSWORD || "h/#0mpzP7Vi3mQzs",
    database: process.env.DB_NAME || "nil",
    synchronize: false,
    logging: false,
    entities: ['src/database/entity/**/*.js'],
    migrations: ['src/migration/**/*.ts'],
    subscribers: [],
});
