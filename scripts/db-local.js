import 'dotenv/config';
import { spawnSync } from 'node:child_process';
const nombre = 'sislonja-mariadb';
const exists = spawnSync('docker', ['container', 'inspect', nombre], { stdio: 'ignore' }).status === 0;
let result;
if (exists) result = spawnSync('docker', ['start', nombre], { stdio: 'inherit' });
else result = spawnSync('docker', ['run', '-d', '--name', nombre, '--restart', 'unless-stopped', '-p', '127.0.0.1:3308:3306', '-e', 'MARIADB_RANDOM_ROOT_PASSWORD=1', '-e', 'MARIADB_DATABASE', '-e', 'MARIADB_USER', '-e', 'MARIADB_PASSWORD', '-v', 'sislonja_data:/var/lib/mysql', 'mariadb:11.4'], {
  stdio: 'inherit', env: { ...process.env, MARIADB_DATABASE: process.env.BD_NOMBRE, MARIADB_USER: process.env.BD_USUARIO, MARIADB_PASSWORD: process.env.BD_CLAVE },
});
if (result.status !== 0) process.exit(1);
for (let i = 0; i < 30; i++) {
  if (spawnSync('docker', ['exec', nombre, 'healthcheck.sh', '--connect', '--innodb_initialized'], { stdio: 'ignore' }).status === 0) { console.log('MariaDB local disponible en 127.0.0.1:3308.'); process.exit(0); }
  await new Promise(resolve => setTimeout(resolve, 1000));
}
throw new Error('MariaDB aún no está lista. Revisa docker logs sislonja-mariadb.');
