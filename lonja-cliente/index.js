import { createApp } from './app.js';
const puerto = Number(process.env.PORT || 3000);
createApp().listen(puerto, '127.0.0.1', () => console.log(`Lonja Cliente en http://localhost:${puerto}`));
