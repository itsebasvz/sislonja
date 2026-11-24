import 'dotenv/config';
import nodemailer from 'nodemailer';
import fs from 'node:fs';
const account = await nodemailer.createTestAccount();
const fields = { CORREO_HOST: account.smtp.host, CORREO_PORT: String(account.smtp.port), CORREO_USER: account.user, CORREO_PASS: account.pass };
let env = fs.readFileSync('.env', 'utf8');
for (const [key, value] of Object.entries(fields)) {
  const regex = new RegExp('^' + key + '=.*$', 'm');
  env = regex.test(env) ? env.replace(regex, key + '=' + value) : env + '\n' + key + '=' + value;
}
fs.writeFileSync('.env', env);
console.log('Cuenta Ethereal guardada en .env. Reinicia la aplicación. Los mensajes se verán desde Personal y no llegarán a bandejas reales.');
