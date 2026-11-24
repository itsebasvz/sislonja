export const esCorreo = dato => typeof dato === 'string' && dato.length <= 80 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dato);
export const esId = dato => /^\d{1,10}$/.test(String(dato)) && Number(dato) > 0 && Number(dato) <= 2147483647;
export const esUuid = dato => typeof dato === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(dato);
export const texto = dato => typeof dato === 'string' ? dato.trim() : '';
