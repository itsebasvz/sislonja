(() => {
 // Shared by checkout, registration and the address book: works on whichever form holds [data-address].
 const box=document.querySelector('[data-address]'),form=box?.closest('form');if(!form)return;
 const checkout=form.id==='checkout-form',toggle=form.querySelector('[data-address-toggle]');
 const preset=el=>{const v=el.dataset.valor;if(v&&[...el.options].some(o=>o.value===v)){el.value=v;delete el.dataset.valor;}};
 const cp=form.elements.cp,estado=form.elements.estado,municipio=form.elements.municipio,colonia=form.elements.colonia,status=document.querySelector('#direccion-ayuda');
 let ubicaciones=[],seq=0,municipioSeq=0,controller,pending=false;
 const activo=()=>!box.hidden;
 const options=(select,items,placeholder)=>{select.replaceChildren(new Option(placeholder,''),...items.map(i=>new Option(i.nombre,i.id)));};
 function sincronizar(){for(const el of box.querySelectorAll('input,select')){el.required=activo()&&!el.hasAttribute('data-optional');el.disabled=!activo();}municipio.disabled=!activo()||municipio.options.length<2;colonia.disabled=!activo()||colonia.options.length<2;}
 function aviso(text,error=false){status.hidden=!text;status.textContent=text;status.classList.toggle('address-error',error);}
 function invalidar(){if(checkout)form.elements.aceptar.checked=false;}
 function resetPostal(){ubicaciones=[];options(colonia,[],'Ingresa tu código postal');cp.setCustomValidity(cp.value?'Consulta un código postal válido antes de continuar.':'');sincronizar();}
 function colonias(){const sitio=ubicaciones.find(u=>u.estadoId===estado.value&&u.municipioId===municipio.value);options(colonia,(sitio?.colonias||[]).map(c=>({id:c,nombre:c})),'Selecciona tu colonia');preset(colonia);if(sitio?.colonias.length===1){colonia.value=sitio.colonias[0];aviso('Dirección completada. Revisa estado, municipio y colonia.');}else if(sitio)aviso('Este CP tiene varias colonias. Selecciona la tuya para continuar.');sincronizar();}
 async function cargarMunicipios(){const request=++municipioSeq,actual=estado.value;options(municipio,[],'Cargando municipios…');sincronizar();if(!actual){options(municipio,[],'Selecciona primero tu estado o CP');return;}
 try{const res=await fetch('/direccion/municipios/'+encodeURIComponent(actual));if(!res.ok)throw Error();const data=await res.json();if(request!==municipioSeq||estado.value!==actual)return;options(municipio,data.municipios,'Selecciona municipio o alcaldía');preset(municipio);if(ubicaciones.length){const sitios=ubicaciones.filter(u=>u.estadoId===actual);if(sitios.length===1)municipio.value=sitios[0].municipioId;}colonias();}catch{if(request===municipioSeq){options(municipio,[],'No se pudo cargar. Vuelve a elegir el estado.');aviso('No pudimos consultar los municipios. Intenta nuevamente.',true);}}finally{sincronizar();}}
 async function consultar(){const request=++seq;controller?.abort();resetPostal();invalidar();if(!/^\d{5}$/.test(cp.value)){pending=false;aviso('Escribe un código postal de cinco dígitos.');return;}
 const valor=cp.value;pending=true;controller=new AbortController();cp.setCustomValidity('Espera a que terminemos de consultar el código postal.');aviso('Consultando código postal…');
 try{const res=await fetch('/direccion/codigo-postal/'+valor,{signal:controller.signal});if(request!==seq)return;if(res.status===404){aviso('No encontramos ese CP. Revisa los cinco dígitos.',true);cp.setCustomValidity('Código postal no encontrado.');return;}if(!res.ok)throw Error();const data=await res.json();if(request!==seq||cp.value!==valor)return;ubicaciones=data.ubicaciones;const coincide=ubicaciones.find(u=>u.estadoId===estado.value)||ubicaciones[0];estado.value=coincide.estadoId;cp.setCustomValidity('');await cargarMunicipios();
 }catch(e){if(e.name!=='AbortError'&&request===seq){cp.setCustomValidity('No pudimos consultar el CP. Intenta de nuevo.');aviso('No pudimos consultar el CP. Cambia un dígito y vuelve a intentarlo.',true);}}finally{if(request===seq){pending=false;sincronizar();}}}
 cp.addEventListener('input',consultar);cp.addEventListener('change',()=>{if(cp.value.length===5&&!ubicaciones.length&&!pending)consultar();});
 estado.addEventListener('change',()=>{seq++;controller?.abort();pending=false;if(cp.value&&(!ubicaciones.length||!ubicaciones.some(u=>u.estadoId===estado.value))){cp.value='';resetPostal();aviso('Escribe el código postal de tu dirección en este estado.');}invalidar();cargarMunicipios();});
 municipio.addEventListener('change',()=>{invalidar();if(ubicaciones.length&&!ubicaciones.some(u=>u.estadoId===estado.value&&u.municipioId===municipio.value)){cp.value='';resetPostal();aviso('Escribe el código postal del municipio seleccionado.');}else colonias();});
 colonia.addEventListener('change',invalidar);for(const name of ['calle','numero'])form.elements[name].addEventListener('input',invalidar);
 form.addEventListener('submit',e=>{if(activo()&&(pending||!ubicaciones.length||!colonia.value)){e.preventDefault();e.stopImmediatePropagation();cp.reportValidity();aviso('Completa el código postal y selecciona tu colonia antes de comprar.',true);}},true);
 toggle?.addEventListener('change',()=>{box.hidden=!toggle.checked;sincronizar();if(toggle.checked)cp.focus();});
 window.lonjaDireccion={sincronizar};sincronizar();
 // Re-run the lookup after a failed submit so state, municipality and neighborhood come back selected.
 if(/^\d{5}$/.test(cp.value))consultar();else if(estado.value)cargarMunicipios();
})();
