import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();
console.log(process.env.DB_PASSWORD);
const cleanPassword = (password: string) => {
    if (!password) return '';
    return password.replace(/^["'](.*)["']$/, '$1');
};

export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || "0.0.0.0",
    port: parseInt(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME || "behzad1k",
    password: cleanPassword(process.env.DB_PASSWORD),
    database: process.env.DB_NAME || "nil",
    synchronize: false,
    logging: false,
    entities: ['src/database/entity/**/*.js'],
    migrations: ['src/migration/**/*.ts'],
    subscribers: [],
});
