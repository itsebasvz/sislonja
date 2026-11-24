const intentos = new Map();
export function limitarAcceso(req,res,next) {
  const ahora = Date.now();
  for (const [ip, intento] of intentos) if (intento.fin <= ahora) intentos.delete(ip);
  const intento = intentos.get(req.ip) || {fin: ahora + 60000, cantidad: 0};
  intento.cantidad++;
  intentos.set(req.ip, intento);
  if (intento.cantidad > 25) return res.set('Retry-After','60').status(429).json({error:'Demasiados intentos. Prueba en un minuto.'});
  next();
}
