import nodemailer from 'nodemailer';
export async function correoConfirmacion(usuario, token) {
  const { CORREO_HOST, CORREO_USER, CORREO_PASS, CORREO_FROM, URL_BACKEND = 'http://localhost:3000' } = process.env;
  if (!CORREO_HOST || !CORREO_USER || !CORREO_PASS) throw new Error('Configura los datos SMTP en .env para enviar la confirmación.');
  const transport = nodemailer.createTransport({ host: CORREO_HOST, port: Number(process.env.CORREO_PORT || 587),
    secure: process.env.CORREO_PORT === '465', auth: { user: CORREO_USER, pass: CORREO_PASS },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
  const enlace = `${URL_BACKEND.replace(/\/$/, '')}/confirmar/${token}`;
  const info = await transport.sendMail({ from: CORREO_FROM || CORREO_USER, to: usuario.email,
    subject: 'Confirma tu cuenta · Sistema Lonja',
    text: `Se ha creado tu cuenta en Lonja de Veracruz. Confirma tu correo en ${enlace}. Si no reconoces esta solicitud, ignora este mensaje.` });
  return CORREO_HOST === 'smtp.ethereal.email' ? nodemailer.getTestMessageUrl(info) : null;
}
