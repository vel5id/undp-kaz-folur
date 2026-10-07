/* Trusted UI broker. The Python realm has an opaque origin and no network. */
export async function createSandbox(onMessage,onError) {
 const root=new URL('./',import.meta.url), cache=new Map();
 const manifest=await fetch(new URL('security-manifest.json',root),{credentials:'omit',redirect:'error',cache:'no-cache',signal:AbortSignal.timeout(60000)}).then(r=>{if(!r.ok)throw Error('Нет манифеста безопасности');return r.json();});
 let closed=false,requests=0,transferred=0,messages=0;
 async function asset(name){
  if(typeof name!=='string'||!Object.hasOwn(manifest.files,name))throw Error('Файл отсутствует в разрешённом списке');
  if(++requests>160)throw Error('Превышен лимит запросов среды');
  if(!cache.has(name))cache.set(name,(async()=>{
   const expected=manifest.files[name];const r=await fetch(new URL(name,root),{credentials:'omit',redirect:'error',cache:'no-cache',signal:AbortSignal.timeout(60000)});
   if(!r.ok)throw Error('Не удалось загрузить '+name);
   const data=await r.arrayBuffer();if(data.byteLength!==expected.bytes)throw Error('Размер файла не совпал: '+name);
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),x=>x.toString(16).padStart(2,'0')).join('');
   if(hash!==expected.sha256)throw Error('Проверка целостности не пройдена: '+name);
   return data;
  })());
  const data=await cache.get(name);transferred+=data.byteLength;if(transferred>180*1024*1024)throw Error('Превышен лимит загрузки среды');return data;
 }
 const decoder=new TextDecoder();
 const [source,pyodide,asm]=await Promise.all(['worker-v2.js','runtime/pyodide.mjs','runtime/pyodide.asm.mjs'].map(async name=>decoder.decode(await asset(name))));
 const bootstrap=`addEventListener('message',function boot(e){if(e.source!==parent||!e.ports[0])return;removeEventListener('message',boot);const port=e.ports[0];let worker;port.onmessage=({data})=>{if(data.type==='boot'){const url=URL.createObjectURL(new Blob([data.source],{type:'text/javascript'}));worker=new Worker(url);worker.addEventListener('message',()=>URL.revokeObjectURL(url),{once:true});worker.onmessage=e=>port.postMessage(e.data);worker.onerror=e=>port.postMessage({type:'error',text:e.message});port.postMessage({type:'booted'});}else if(worker)worker.postMessage(data);};port.start();});`;
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bootstrap));
 const hash=btoa(String.fromCharCode(...new Uint8Array(digest)));
 const frame=document.createElement('iframe');frame.hidden=true;frame.title='Изолированная среда Python';frame.sandbox='allow-scripts';frame.setAttribute('allow',"camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'; usb 'none'; serial 'none'");
 // No allow-same-origin, network URLs, forms, downloads, navigation or popup grants.
 frame.srcdoc=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}' blob: 'wasm-unsafe-eval'; worker-src blob:; connect-src 'none'; img-src 'none'; style-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><script>${bootstrap}<\/script>`;
 const channel=new MessageChannel();let bootResolve,bootReject;
 const booted=new Promise((resolve,reject)=>{bootResolve=resolve;bootReject=reject;});
 const deadline=setTimeout(()=>bootReject(Error('Не удалось создать изоляцию Python')),15000);
 channel.port1.onmessage=async({data})=>{
  if(closed)return;
  if(++messages>6000){onError(Error('Превышен лимит сообщений изолированной среды'));return;}
  if(!data||typeof data!=='object')return;
  if(data.type==='booted'){bootResolve();return;}
  if(data.type==='asset-request'){
   try{if(!Number.isSafeInteger(data.id)||data.id<1||data.id>160)throw Error('Недопустимый запрос файла');const bytes=await asset(data.name);if(!closed)channel.port1.postMessage({type:'asset-response',id:data.id,data:bytes});}
   catch(e){if(!closed)channel.port1.postMessage({type:'asset-response',id:data.id,error:String(e)});}return;
  }
  onMessage({data});
 };
 channel.port1.onmessageerror=()=>onError(Error('Некорректное сообщение среды'));
 frame.onload=()=>{if(!closed){frame.contentWindow.postMessage({type:'connect'},'*',[channel.port2]);channel.port1.postMessage({type:'boot',source});}};
 document.body.append(frame);
 try{await booted;}catch(e){frame.remove();channel.port1.close();throw e;}finally{clearTimeout(deadline);}
 return {postMessage(data){if(!closed)channel.port1.postMessage(data.type==='init'?{...data,pyodide,asm}:data);},terminate(){closed=true;channel.port1.close();frame.remove();cache.clear();}};
}

