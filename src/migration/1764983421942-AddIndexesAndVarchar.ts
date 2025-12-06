import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexesAndVarchar1764983421942 implements MigrationInterface {
    name = 'AddIndexesAndVarchar1764983421942'


    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, alter columns to use VARCHAR instead of TEXT where needed
        await queryRunner.query(`ALTER TABLE \`order\` MODIFY COLUMN \`status\` VARCHAR(50) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`order\` MODIFY COLUMN \`date\` VARCHAR(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`order\` MODIFY COLUMN \`code\` VARCHAR(50) NULL`);

        await queryRunner.query(`ALTER TABLE \`user\` MODIFY COLUMN \`phoneNumber\` VARCHAR(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` MODIFY COLUMN \`username\` VARCHAR(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` MODIFY COLUMN \`nationalCode\` VARCHAR(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` MODIFY COLUMN \`role\` VARCHAR(20) NOT NULL`);

        await queryRunner.query(`ALTER TABLE \`worker_offs\` MODIFY COLUMN \`date\` VARCHAR(20) NOT NULL`);

        await queryRunner.query(`ALTER TABLE \`service\` MODIFY COLUMN \`slug\` VARCHAR(255) NOT NULL`);

        // Order indexes
        await queryRunner.query(`CREATE INDEX \`IDX_order_userId_inCart\` ON \`order\` (\`userId\`, \`inCart\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_order_workerId\` ON \`order\` (\`workerId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_order_date\` ON \`order\` (\`date\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_order_status\` ON \`order\` (\`status\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_order_serviceId\` ON \`order\` (\`serviceId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_order_code\` ON \`order\` (\`code\`)`);

        // User indexes
        await queryRunner.query(`CREATE INDEX \`IDX_user_phoneNumber\` ON \`user\` (\`phoneNumber\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_user_role_status\` ON \`user\` (\`role\`, \`status\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_user_nationalCode\` ON \`user\` (\`nationalCode\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_user_username\` ON \`user\` (\`username\`)`);

        // WorkerOffs indexes
        await queryRunner.query(`CREATE INDEX \`IDX_workerOffs_userId_date\` ON \`worker_offs\` (\`userId\`, \`date\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_workerOffs_date_fromTime_toTime\` ON \`worker_offs\` (\`date\`, \`fromTime\`, \`toTime\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_workerOffs_orderId\` ON \`worker_offs\` (\`orderId\`)`);

        // Service indexes
        await queryRunner.query(`CREATE INDEX \`IDX_service_slug\` ON \`service\` (\`slug\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.query(`DROP INDEX \`IDX_order_userId_inCart\` ON \`order\``);
        await queryRunner.query(`DROP INDEX \`IDX_order_workerId\` ON \`order\``);
        await queryRunner.query(`DROP INDEX \`IDX_order_date\` ON \`order\``);
        await queryRunner.query(`DROP INDEX \`IDX_order_status\` ON \`order\``);
        await queryRunner.query(`DROP INDEX \`IDX_order_serviceId\` ON \`order\``);
        await queryRunner.query(`DROP INDEX \`IDX_order_code\` ON \`order\``);

        await queryRunner.query(`DROP INDEX \`IDX_user_phoneNumber\` ON \`user\``);
        await queryRunner.query(`DROP INDEX \`IDX_user_role_status\` ON \`user\``);
        await queryRunner.query(`DROP INDEX \`IDX_user_nationalCode\` ON \`user\``);
        await queryRunner.query(`DROP INDEX \`IDX_user_username\` ON \`user\``);

        await queryRunner.query(`DROP INDEX \`IDX_workerOffs_userId_date\` ON \`worker_offs\``);
        await queryRunner.query(`DROP INDEX \`IDX_workerOffs_date_fromTime_toTime\` ON \`worker_offs\``);
        await queryRunner.query(`DROP INDEX \`IDX_workerOffs_orderId\` ON \`worker_offs\``);

        await queryRunner.query(`DROP INDEX \`IDX_service_slug\` ON \`service\``);

        // Revert columns back to TEXT if needed
        await queryRunner.query(`ALTER TABLE \`order\` MODIFY COLUMN \`status\` TEXT NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`order\` MODIFY COLUMN \`date\` TEXT NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`order\` MODIFY COLUMN \`code\` TEXT NULL`);

        await queryRunner.query(`ALTER TABLE \`user\` MODIFY COLUMN \`phoneNumber\` TEXT NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` MODIFY COLUMN \`username\` TEXT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` MODIFY COLUMN \`nationalCode\` TEXT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` MODIFY COLUMN \`role\` TEXT NOT NULL`);

        await queryRunner.query(`ALTER TABLE \`worker_offs\` MODIFY COLUMN \`date\` TEXT NOT NULL`);

        await queryRunner.query(`ALTER TABLE \`service\` MODIFY COLUMN \`slug\` TEXT NOT NULL`);
    }
}