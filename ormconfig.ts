import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.' + process.env.NODE_ENV })

export default {
   type: 'mysql',
   host: process.env.DB_HOST || 'localhost',
   port: parseInt(process.env.DB_PORT) || 3306,
   username: process.env.DB_USERNAME || 'mysql',
   password: process.env.DB_PASSWORD || 'password',
   database: process.env.DB_NAME || 'mydb',
   entities: [`${process.env.DB_ENTITIES_PATH}`],
   synchronize: process.env.DB_SYNC || true,
   logging: false,
}