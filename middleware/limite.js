const entradas=new Map();
export function limitarAcceso(req,res,next){
 const ahora=Date.now(),clave=req.ip+'|'+(req.path==='/registro/reenviar'?'correo':'cuenta');
 for(const [k,v] of entradas)if(v.fin<ahora)entradas.delete(k);
 const v=entradas.get(clave)||{n:0,fin:ahora+60000};v.n++;entradas.set(clave,v);
 if(v.n>12){res.set('Retry-After','60');return res.status(429).render('mensaje',{title:'Espera un momento',texto:'Hay varios intentos seguidos. Intenta de nuevo en un minuto.',enlace:'/login',etiqueta:'Volver al acceso'});}next();
}
