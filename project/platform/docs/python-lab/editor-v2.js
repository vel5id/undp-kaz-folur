import {createSandbox} from './sandbox-v3.js';
(async function(){
'use strict';
const el=id=>document.getElementById(id);
if(parent!==window)new ResizeObserver(()=>parent.postMessage({type:'folur-lab-height',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+24},location.origin)).observe(document.querySelector('main'));
const editor=CodeMirror.fromTextArea(el('code'),{mode:'python',lineNumbers:true,lineWrapping:true,indentUnit:4,extraKeys:{'Ctrl-Enter':()=>run(false)}});
let epoch=0,resultCount=0,resultBytes=0,messageCount=0;
let config,worker,ready=false,busy=false,loading=false,timer,uploads=[],slots=new Map(),expected=[],catalog=[],urls=[],changed=false;
const selected=new URLSearchParams(location.search).get('exercise')||'demo-visuals';
function checkFile(name){if(typeof name!=='string'||name.length>160||/[\\/\x00-\x1f\x7f]/.test(name)||name.startsWith('.')||!/\.(csv|json|geojson|png|jpg|jpeg|webp|tif|tiff|txt)$/i.test(name))throw Error('Недопустимое имя результата');}
function safeCSV(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
 else if(!quoted&&(c===','||c==='\n'||c==='\r')){row.push(cell);cell='';if(c!==','){rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}}else cell+=c;}
 if(cell||row.length){row.push(cell);rows.push(row);}
 return rows.map(r=>r.map(c=>{if(/^[\s]*[=+@-]/.test(c)&&!/^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\s*$/.test(c))c="'"+c;return '"'+c.replaceAll('"','""')+'"';}).join(',')).join('\r\n')+'\r\n';
}
function key(){return 'folur-python-v2-'+(config?config.id:selected);}
function controls(){el('run').disabled=el('check').disabled=!config||busy||loading;el('stop').disabled=!(busy||loading);el('files').disabled=busy||loading;}
function output(text){const value=String(text);if(value.length>100000)throw Error('Превышен лимит вывода');el('output').textContent=(el('output').textContent+value+'\n').slice(-100000);}
function link(bytes,name,type,parent){checkFile(name);const size=typeof bytes==='string'?new TextEncoder().encode(bytes).length:bytes.byteLength;resultBytes+=size;if(size>20*1024*1024||resultBytes>50*1024*1024)throw Error('Превышен лимит результатов');if(/\.csv$/i.test(name)){const value=typeof bytes==='string'?bytes:new TextDecoder().decode(bytes);bytes=safeCSV(value);}const url=URL.createObjectURL(new Blob([bytes],{type}));urls.push(url);const a=document.createElement('a');a.className='download';a.href=url;a.download=name;a.textContent='Скачать '+name;parent.append(a);return url;}
function bytes(b64){if(typeof b64!=='string'||b64.length>28*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(b64))throw Error('Недопустимые двоичные данные');return Uint8Array.from(atob(b64),c=>c.charCodeAt(0));}
function render(data){
 if(++resultCount>40||!data||typeof data!=='object')throw Error('Превышен лимит результатов');
 if(data.kind==='table'&&(!Array.isArray(data.columns)||data.columns.length>100||!Array.isArray(data.rows)||data.rows.length>100||data.rows.some(r=>!Array.isArray(r)||r.length>100)||typeof data.csv!=='string'))throw Error('Недопустимая таблица');
 if(data.kind==='image'&&!String(data.data).startsWith('iVBORw0KGgo'))throw Error('Разрешены только PNG-результаты');
 if(data.title!==undefined&&(typeof data.title!=='string'||data.title.length>300))throw Error('Недопустимый заголовок');
 if(data.text!==undefined&&(typeof data.text!=='string'||data.text.length>20000))throw Error('Слишком длинный текст');
 if(data.kind==='table'&&[...data.columns,...data.rows.flat()].some(x=>x!==null&&!['string','number','boolean'].includes(typeof x)||String(x).length>2000))throw Error('Недопустимая ячейка');
 const card=document.createElement('figure');card.className='result';const caption=document.createElement('figcaption');caption.textContent=data.title||'Результат Python';card.append(caption);
 if(data.kind==='table'){
  const wrap=document.createElement('div');wrap.className='table-scroll';const table=document.createElement('table');const head=document.createElement('thead'),tr=document.createElement('tr');
  data.columns.forEach(x=>{const th=document.createElement('th');th.textContent=String(x);tr.append(th);});head.append(tr);table.append(head);const body=document.createElement('tbody');
  data.rows.forEach(row=>{const tr=document.createElement('tr');row.forEach(x=>{const td=document.createElement('td');td.textContent=x===null?'—':String(x);tr.append(td);});body.append(tr);});table.append(body);wrap.append(table);card.append(wrap);
  if(data.total>data.rows.length){const note=document.createElement('p');note.textContent='Показаны первые '+data.rows.length+' из '+data.total+' строк. В CSV сохранена полная таблица.';card.append(note);}
  link(data.csv,data.name||'table.csv','text/csv;charset=utf-8',card);
 }else if(data.kind==='image'){
  const dataBytes=bytes(data.data);if(dataBytes.length<24)throw Error('Недопустимый PNG');const header=new DataView(dataBytes.buffer);const w=header.getUint32(16),h=header.getUint32(20);if(!w||!h||w*h>16000000)throw Error('Лимит: 16 млн пикселей');const url=link(dataBytes,data.name||'image.png','image/png',card);const img=new Image();img.src=url;img.alt=data.title||'Изображение, созданное кодом Python';card.insertBefore(img,card.lastChild);
 }else {const pre=document.createElement('pre');pre.textContent=data.text||'';card.append(pre);}
 el('results').append(card);
}
function terminate(){epoch++;if(worker)worker.terminate();worker=null;clearTimeout(timer);ready=false;busy=false;loading=false;controls();}
async function start(){
 terminate();loading=true;controls();el('status').textContent='Загрузка Python и библиотек…';
 const current=epoch;
 return new Promise(async(resolve,reject)=>{
  let instance;
  const receive=({data})=>{handle(data);};
  try{instance=await createSandbox(receive,e=>{terminate();reject(e);});if(current!==epoch){instance.terminate();resolve(null);return;}worker=instance;}catch(e){if(current!==epoch){resolve(null);return;}terminate();reject(e);return;}timer=setTimeout(()=>{terminate();reject(new Error('Загрузка заняла больше 120 секунд. Повторите запуск.'));},120000);
  function handle(data){
   if(worker!==instance)return;
   if(!data||typeof data!=='object'||typeof data.type!=='string')return;
   if(++messageCount>3000){terminate();el('feedback').textContent='Превышен лимит сообщений';return;}
   try{
   if(data.text!==undefined&&(typeof data.text!=='string'||data.text.length>100000))throw Error('Недопустимый текст результата');
   if(data.type==='ready'&&loading&&!busy){clearTimeout(timer);ready=true;loading=false;controls();el('status').textContent='Python готов';resolve(instance);}
   if(data.type==='progress')el('status').textContent=String(data.text).slice(0,500);
   if(data.type==='stdout'||data.type==='stderr')output(data.text);
   if(data.type==='display')render(data.payload);
   if(data.type==='file'){checkFile(data.name);link(bytes(data.data),data.name,'application/octet-stream',el('downloads'));}
   if(data.type==='passed')el('feedback').textContent='Проверка исходного примера пройдена';
   if(data.type==='done'||data.type==='error'){
    clearTimeout(timer);busy=false;
    if(data.type==='error'){output(data.text);el('feedback').textContent='Выполнение завершилось с ошибкой';if(loading){loading=false;reject(new Error(data.text));}}
    terminate();el('status').textContent='Готово к запуску';controls();
   }
   }catch(e){terminate();output(String(e));el('feedback').textContent='Результат отклонён политикой безопасности';}
  }
  instance.postMessage({type:'init',packages:config.packages||[]});
 });
}
async function run(check){
 if(!config||busy||loading)return;
 if(editor.getValue().length>200000){el('feedback').textContent='Код превышает лимит 200 000 символов';return;}
 resultCount=0;resultBytes=0;messageCount=0;
 urls.forEach(URL.revokeObjectURL);urls=[];el('results').replaceChildren();el('downloads').replaceChildren();el('output').textContent='';el('feedback').textContent='';
 try{const active=await start();if(!active||active!==worker||!ready)return;busy=true;controls();el('status').textContent='Выполняется…';
  worker.postMessage({type:'run',code:editor.getValue(),check:check?config.check:'',files:[...slots.values(),...uploads.filter(f=>!slots.has(f.name))],fixtures:config.fixtures||{},label:config.title});
  timer=setTimeout(()=>{terminate();el('feedback').textContent='Достигнут лимит 60 секунд. Выполнение остановлено; нажмите «Запустить» для новой сессии.';el('status').textContent='Python остановлен';},60000);
 }catch(e){terminate();output(String(e));el('status').textContent='Не удалось запустить. Повторите запуск.';}
}
el('run').onclick=()=>run(false);el('check').onclick=()=>run(true);
el('stop').onclick=()=>{terminate();el('status').textContent='Python остановлен';el('feedback').textContent='Выполнение остановлено. Код и выбранные файлы сохранены.';};
el('reset').onclick=()=>{if(!config)return;terminate();editor.setValue(config.code);el('output').textContent='Пример восстановлен. Нажмите «Запустить».';el('feedback').textContent='';el('status').textContent='Готово к запуску';el('results').replaceChildren();el('downloads').replaceChildren();urls.forEach(URL.revokeObjectURL);urls=[];};
el('download').onclick=()=>{if(!config)return;const a=document.createElement('a');const url=URL.createObjectURL(new Blob([editor.getValue()],{type:'text/x-python'}));a.href=url;a.download=config.id+'.py';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
el('clear-files').onclick=()=>{uploads=[];slots.clear();renderSlots();el('files').value='';el('file-state').textContent='Свои файлы убраны. Используются учебные примеры.';};
el('files').onchange=async()=>{
 const files=[...el('files').files];if(files.length>20){el('file-state').textContent='Лимит: 20 файлов';return;}let total=0;const names=new Set();
 for(const file of files){total+=file.size;if(file.size>20*1024*1024||total>50*1024*1024){el('file-state').textContent='Превышен лимит: 20 МБ на файл, 50 МБ суммарно. Предыдущие файлы сохранены.';el('files').value='';return;}
 if(file.name.length>120||/[\u0000-\u001f\u007f]/.test(file.name)||file.name.startsWith('.')||! /\.(csv|json|geojson|png|jpe?g|webp|tiff?|txt)$/i.test(file.name)||/[\/\\]/.test(file.name)||names.has(file.name)){el('file-state').textContent='Неподдерживаемое или повторяющееся имя файла: '+file.name;return;}names.add(file.name);}
 try{uploads=await Promise.all(files.map(f=>readUpload(f,f.name)));}catch(e){el('file-state').textContent=String(e);return;}el('file-state').textContent=uploads.length?'В памяти браузера: '+uploads.map(f=>f.name).join(', '):'Свои файлы не выбраны.';
};
// Проверка содержимого по расширению — общая для слотов и свободной загрузки.
async function readUpload(f,name){const data=new Uint8Array(await f.arrayBuffer()),ext=name.split('.').pop().toLowerCase();const sig=[...data.slice(0,12)].map(x=>x.toString(16).padStart(2,'0')).join('');let valid=true;if(ext==='png')valid=sig.startsWith('89504e470d0a1a0a');if(['jpg','jpeg'].includes(ext))valid=sig.startsWith('ffd8ff');if(ext==='webp')valid=sig.startsWith('52494646')&&sig.slice(16,24)==='57454250';if(['tif','tiff'].includes(ext))valid=['49492a00','4d4d002a','49492b00','4d4d002b'].some(x=>sig.startsWith(x));if(!valid)throw Error('Формат файла не соответствует расширению: '+f.name);return {name,data};}
// Слоты данных: упражнение стартует на учебном наборе; свой файл подставляется под имя,
// которое ждёт код (переименовывать вручную не нужно).
function renderSlots(){
 const box=el('slots');box.replaceChildren();if(!expected.length)return;
 const lead=document.createElement('p');lead.className='slots-lead';lead.textContent='Упражнение запускается на учебных данных. Чтобы посчитать на своих, подставьте свой файл — переименовывать его не нужно:';box.append(lead);
 expected.forEach(name=>{
  const ext=name.split('.').pop().toLowerCase(),row=document.createElement('div');row.className='slot';
  const label=document.createElement('code');label.textContent=name;
  const state=document.createElement('span');state.className='slot-state';const mine=slots.get(name);
  state.textContent=mine?'ваш файл: '+mine.source:'учебные данные';if(mine)row.classList.add('slot-own');
  const input=document.createElement('input');input.type='file';input.accept='.'+ext;input.hidden=true;
  const pick=document.createElement('button');pick.type='button';pick.className='secondary';pick.textContent=mine?'Заменить файл':'Подставить свой файл';pick.onclick=()=>input.click();
  input.onchange=async()=>{const f=input.files[0];if(!f)return;
   if(f.size>20*1024*1024){state.textContent='Файл больше 20 МБ';return;}
   if(f.name.split('.').pop().toLowerCase()!==ext){state.textContent='Нужен файл .'+ext+', выбран '+f.name;return;}
   try{const u=await readUpload(f,name);u.source=f.name;slots.set(name,u);renderSlots();el('feedback').textContent='Свой файл подставлен. Нажмите «Запустить».';}catch(e){state.textContent=String(e.message||e);}};
  row.append(label,state,pick,input);
  if(mine){const back=document.createElement('button');back.type='button';back.className='secondary';back.textContent='Вернуть учебные данные';back.onclick=()=>{slots.delete(name);renderSlots();};row.append(back);}
  box.append(row);});
}
el('exercise').onchange=()=>{const u=new URL(location.href);u.searchParams.set('exercise',el('exercise').value);location.href=u.href;};
editor.on('change',()=>{if(config)try{localStorage.setItem(key(),editor.getValue());changed=true;}catch(e){}});
try{
 const r=await fetch('catalog.json');if(!r.ok)throw new Error('Не удалось загрузить каталог');catalog=await r.json();
 const item=catalog.find(x=>x.id===selected);if(!item)throw new Error('Упражнение не найдено');
 // Упражнение, открытое из урока, фиксировано: список выбора есть только в общем каталоге
 // (страница «Python-практика», ?exercise=demo-visuals или ?all=1), чтобы слушатель не уходил в чужие уроки.
 const locked=item.module!=='demo'&&!new URLSearchParams(location.search).has('all');
 if(locked){el('exercise').hidden=true;el('exercise-label').hidden=true;el('exercise').append(new Option(item.title,item.id));}
 else{
  const groups=new Map();
  catalog.forEach(x=>{if(!groups.has(x.module)){const g=document.createElement('optgroup');g.label=x.module==='demo'?'Демонстрация':'Модуль '+x.module.toUpperCase();groups.set(x.module,g);el('exercise').append(g);}groups.get(x.module).append(new Option(x.title,x.id));});
 }
 el('exercise').value=selected;
 const c=await fetch('exercises/'+item.id+'.json');if(!c.ok)throw new Error('Не удалось загрузить упражнение');config=await c.json();
 expected=[...new Set([...config.code.matchAll(/os\.path\.exists\(\s*['"]([^'"/]+)['"]\s*\)/g)].map(m=>m[1]))].filter(n=>{try{checkFile(n);return true;}catch(e){return false;}});renderSlots();if(expected.length)el('files-box').open=true;el('title').textContent=config.title;el('task').textContent=config.task;el('scope').textContent=config.scope;document.title=config.title+' · FOLUR Python';el('standalone').href=location.href;
 let saved;try{saved=localStorage.getItem(key());if(saved===null&&config.id==='a1-l01')saved=localStorage.getItem('folur-python-a1-passport-v1');}catch(e){}editor.setValue(saved===null||saved===undefined?config.code:saved);el('status').textContent='Готово к запуску';controls();
}catch(e){el('status').textContent=String(e);}
})();