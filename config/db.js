import 'dotenv/config';
import { Sequelize } from 'sequelize';
export const db = new Sequelize(process.env.BD_NOMBRE || 'sislonja', process.env.BD_USUARIO || 'lonja', process.env.BD_CLAVE, {
  dialect: 'mariadb', host: process.env.BD_HOST || '127.0.0.1', port: Number(process.env.BD_PORT || 3308),
  timezone: '-06:00', dialectOptions: { bigNumberStrings: true, decimalAsNumber: false }, logging: false, pool: { max: 5, min: 0, idle: 10000 },
  define: { timestamps: false, freezeTableName: true },
});
export default db;
