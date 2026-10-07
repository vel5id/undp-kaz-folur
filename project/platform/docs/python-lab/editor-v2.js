import {createSandbox} from './sandbox-v3.js';
(async function(){
'use strict';
const el=id=>document.getElementById(id);
if(parent!==window)new ResizeObserver(()=>parent.postMessage({type:'folur-lab-height',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+24},location.origin)).observe(document.querySelector('main'));
const editor=CodeMirror.fromTextArea(el('code'),{mode:'python',lineNumbers:true,lineWrapping:true,indentUnit:4,extraKeys:{'Ctrl-Enter':()=>run(false)}});
let epoch=0,resultCount=0,resultBytes=0,messageCount=0;
let config,worker,ready=false,busy=false,loading=false,timer,uploads=[],slots=new Map(),inputs=new Map(),slotDefs=[],inputDefs=[],expected=[],catalog=[],urls=[],changed=false;
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
  worker.postMessage({type:'run',code:editor.getValue(),check:check?config.check:'',files:runFiles(),fixtures:config.fixtures||{},label:config.title});
  timer=setTimeout(()=>{terminate();el('feedback').textContent='Достигнут лимит 60 секунд. Выполнение остановлено; нажмите «Запустить» для новой сессии.';el('status').textContent='Python остановлен';},60000);
 }catch(e){terminate();output(String(e));el('status').textContent='Не удалось запустить. Повторите запуск.';}
}
el('run').onclick=()=>run(false);el('check').onclick=()=>run(true);
el('stop').onclick=()=>{terminate();el('status').textContent='Python остановлен';el('feedback').textContent='Выполнение остановлено. Код и выбранные файлы сохранены.';};
el('reset').onclick=()=>{if(!config)return;terminate();editor.setValue(config.code);el('output').textContent='Пример восстановлен. Нажмите «Запустить».';el('feedback').textContent='';el('status').textContent='Готово к запуску';el('results').replaceChildren();el('downloads').replaceChildren();urls.forEach(URL.revokeObjectURL);urls=[];};
el('download').onclick=()=>{if(!config)return;const a=document.createElement('a');const url=URL.createObjectURL(new Blob([editor.getValue()],{type:'text/x-python'}));a.href=url;a.download=config.id+'.py';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
el('clear-files').onclick=()=>{uploads=[];slots.clear();inputs.clear();if(config&&config.persist){slotDefs.forEach(d=>store.set('slot:'+d.name,undefined));inputDefs.forEach(d=>store.set('input:'+d.name,undefined));}renderSlots();refreshKeys();el('files').value='';el('file-state').textContent='Свои файлы убраны. Используются учебные примеры.';};
el('files').onchange=async()=>{
 const files=[...el('files').files];if(files.length>20){el('file-state').textContent='Лимит: 20 файлов';return;}let total=0;const names=new Set();
 for(const file of files){total+=file.size;if(file.size>20*1024*1024||total>50*1024*1024){el('file-state').textContent='Превышен лимит: 20 МБ на файл, 50 МБ суммарно. Предыдущие файлы сохранены.';el('files').value='';return;}
 if(file.name.length>120||/[\u0000-\u001f\u007f]/.test(file.name)||file.name.startsWith('.')||! /\.(csv|json|geojson|png|jpe?g|webp|tiff?|txt)$/i.test(file.name)||/[\/\\]/.test(file.name)||names.has(file.name)){el('file-state').textContent='Неподдерживаемое или повторяющееся имя файла: '+file.name;return;}names.add(file.name);}
 try{uploads=await Promise.all(files.map(f=>readUpload(f,f.name)));}catch(e){el('file-state').textContent=String(e);return;}el('file-state').textContent=uploads.length?'В памяти браузера: '+uploads.map(f=>f.name).join(', '):'Свои файлы не выбраны.';
};
// Проверка содержимого по расширению — общая для слотов и свободной загрузки.
const SLOT_TYPES=['csv','json','geojson','png','jpg','jpeg','webp','tif','tiff','txt','zip','gpkg','kml'];
async function readUpload(f,name){const data=new Uint8Array(await f.arrayBuffer()),ext=name.split('.').pop().toLowerCase();const sig=[...data.slice(0,12)].map(x=>x.toString(16).padStart(2,'0')).join('');let valid=true;if(ext==='png')valid=sig.startsWith('89504e470d0a1a0a');if(['jpg','jpeg'].includes(ext))valid=sig.startsWith('ffd8ff');if(ext==='webp')valid=sig.startsWith('52494646')&&sig.slice(16,24)==='57454250';if(['tif','tiff'].includes(ext))valid=['49492a00','4d4d002a','49492b00','4d4d002b'].some(x=>sig.startsWith(x));if(ext==='zip')valid=sig.startsWith('504b0304');if(ext==='gpkg')valid=sig.startsWith('53514c69746520666f726d61');if(!valid)throw Error('Формат файла не соответствует расширению: '+f.name);return {name,data};}
// Хранилище проекта слушателя: только в этом браузере, в доверенном интерфейсе (Python к нему доступа не имеет).
const store={
 open(){return new Promise((res,rej)=>{const r=indexedDB.open('folur-lab',1);r.onupgradeneeded=()=>r.result.createObjectStore('project');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});},
 async get(k){try{const d=await this.open();return await new Promise((res,rej)=>{const q=d.transaction('project').objectStore('project').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});}catch(e){return undefined;}},
 async set(k,v){try{const d=await this.open();await new Promise((res,rej)=>{const t=d.transaction('project','readwrite');v===undefined?t.objectStore('project').delete(k):t.objectStore('project').put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error);});}catch(e){}}
};
// Слоты данных: упражнение стартует на учебном наборе; свой файл подставляется под имя,
// которое ждёт код (переименовывать вручную не нужно). Описание слотов — в упражнении
// (config.slots / config.inputs) или выводится из кода по os.path.exists('имя').
function defineSlots(){
 slotDefs=Array.isArray(config.slots)?config.slots.filter(s=>s&&/^[a-z][a-z0-9_-]{0,30}$/.test(s.name)&&Array.isArray(s.accept)).map(s=>({name:s.name,label:String(s.label||s.name).slice(0,80),hint:String(s.hint||'').slice(0,300),accept:s.accept.filter(x=>SLOT_TYPES.includes(x))})).filter(s=>s.accept.length)
  :expected.map(n=>({name:n,label:n,hint:'',accept:[n.split('.').pop().toLowerCase()],fixed:n}));
 inputDefs=Array.isArray(config.inputs)?config.inputs.filter(s=>s&&/^[a-z][a-z0-9_-]{0,30}\.txt$/.test(s.name)).map(s=>({name:s.name,label:String(s.label||s.name).slice(0,80),hint:String(s.hint||'').slice(0,400),placeholder:String(s.placeholder||'').slice(0,300)})):[];
}
function renderSlots(){
 const box=el('slots');box.replaceChildren();if(!slotDefs.length&&!inputDefs.length)return;
 const lead=document.createElement('p');lead.className='slots-lead';lead.textContent='Упражнение запускается на учебных данных. Чтобы посчитать на своих, подставьте свои данные — переименовывать файлы не нужно.'+(config.persist?' Данные остаются в вашем браузере и сохраняются для следующих уроков.':'');box.append(lead);
 inputDefs.forEach(def=>{
  const row=document.createElement('div');row.className='slot slot-text';
  const label=document.createElement('label');label.textContent=def.label;const area=document.createElement('textarea');area.rows=4;area.spellcheck=false;area.placeholder=def.placeholder;area.value=inputs.get(def.name)||'';label.append(area);
  area.oninput=()=>{const v=area.value.slice(0,20000);v.trim()?inputs.set(def.name,v):inputs.delete(def.name);if(config.persist)store.set('input:'+def.name,v.trim()?v:undefined);};
  row.append(label);if(def.hint){const hint=document.createElement('p');hint.className='note';hint.textContent=def.hint;row.append(hint);}box.append(row);});
 slotDefs.forEach(def=>{
  const row=document.createElement('div');row.className='slot';
  const label=document.createElement(def.fixed?'code':'strong');label.textContent=def.label;
  const state=document.createElement('span');state.className='slot-state';const mine=slots.get(def.name);
  state.textContent=mine?'ваш файл: '+mine.source:(def.fixed?'учебные данные':'не загружено — формат: '+def.accept.map(x=>'.'+x).join(', '));if(mine)row.classList.add('slot-own');
  const input=document.createElement('input');input.type='file';input.accept=def.accept.map(x=>'.'+x).join(',');input.hidden=true;
  const pick=document.createElement('button');pick.type='button';pick.className='secondary';pick.textContent=mine?'Заменить файл':'Подставить свой файл';pick.onclick=()=>input.click();
  input.onchange=async()=>{const f=input.files[0];if(!f)return;const ext=f.name.split('.').pop().toLowerCase();
   if(f.size>20*1024*1024){state.textContent='Файл больше 20 МБ';return;}
   if(!def.accept.includes(ext)){state.textContent='Нужен файл '+def.accept.map(x=>'.'+x).join(', ')+'; выбран '+f.name;return;}
   try{const u=await readUpload(f,def.fixed||def.name+'.'+ext);u.source=f.name;slots.set(def.name,u);if(config.persist)store.set('slot:'+def.name,u);renderSlots();refreshKeys();el('feedback').textContent='Свой файл подставлен. Нажмите «Запустить».';}catch(e){state.textContent=String(e.message||e);}};
  row.append(label,state,pick,input);
  if(mine){const back=document.createElement('button');back.type='button';back.className='secondary';back.textContent=def.fixed?'Вернуть учебные данные':'Убрать файл';back.onclick=()=>{slots.delete(def.name);if(config.persist)store.set('slot:'+def.name,undefined);renderSlots();refreshKeys();};row.append(back);}
  if(def.hint){const hint=document.createElement('p');hint.className='note';hint.textContent=def.hint;row.append(hint);}
  box.append(row);});
}
async function loadProject(){
 if(!config.persist)return;
 for(const def of slotDefs){const u=await store.get('slot:'+def.name);if(u&&u.data instanceof Uint8Array&&typeof u.name==='string'&&u.data.byteLength<=20*1024*1024)slots.set(def.name,{name:u.name,data:u.data,source:String(u.source||u.name).slice(0,120)});}
 for(const def of inputDefs){const v=await store.get('input:'+def.name);if(typeof v==='string')inputs.set(def.name,v.slice(0,20000));}
}
function runFiles(){const text=[...inputs].map(([name,v])=>({name,data:new TextEncoder().encode(v)}));const own=[...slots.values()];const taken=new Set([...text,...own].map(f=>f.name));return [...text,...own,...uploads.filter(f=>!taken.has(f.name))];}
// Главное в коде — параметры, которые стоит менять, и строки с данными слушателя —
// выделяется фиолетовым и в редакторе, и в запросе для нейросети.
let keyMarks=[];
function keyInfo(){
 const names=[...slotDefs.map(d=>d.fixed||d.name+'.'),...inputDefs.map(d=>d.name)],params=[],lines=[];
 editor.getValue().split('\n').forEach((ln,i)=>{
  const m=ln.match(/^([A-Za-z_]\w*)\s*=\s*(-?\d[\d_.]*(?:e-?\d+)?)\s*(?:#\s*(.*))?$/);
  if(m&&params.length<8){params.push({name:m[1],value:m[2],note:(m[3]||'').trim()});lines.push(i);}
  else if(names.some(n=>ln.includes("'"+n)||ln.includes('"'+n)))lines.push(i);});
 return {params,lines};
}
function promptParts(){
 const {params}=keyInfo(),files=[...slots.values()].map(f=>f.source),wanted=slotDefs.map(d=>d.fixed||d.label);
 const title=config.title.replace(/^[A-ZА-Я]\d+(?:\.\d+)?\s*·\s*(?:практикум\s*·\s*)?/,'').trim(),task=config.task.replace(/^К теме «.*?»\.\s+(?=[А-ЯЁ])/,'');
 const parts=[['Помоги выполнить учебный расчёт на Python и объясни его простыми словами.\n\n'],['ЗАДАЧА. '],['«'+title+'». '+task,true],['\n\nДАННЫЕ. ']];
 if(files.length)parts.push(['Использую свой файл: '],[files.join(', '),true],[' — прикладываю его к сообщению. Сначала опиши, что в нём: колонки, единицы, система координат.']);
 else if(wanted.length)parts.push(['Своего файла пока нет',true],[': создай небольшой учебный набор, как в коде ниже, и прямо скажи, что данные выдуманы. Позже я заменю его своим файлом: '],[wanted.join(', '),true],['.']);
 else parts.push(['Своих данных нет',true],[': создай небольшой учебный набор, как в коде ниже, и прямо скажи, что данные выдуманы.']);
 if(params.length){parts.push(['\n\nПАРАМЕТРЫ, которые я буду менять: ']);params.forEach((p,i)=>{parts.push([p.name+' = '+p.value,true],[(p.note?' ('+p.note+')':'')+(i<params.length-1?'; ':'.')]);});}
 parts.push(['\n\nЧТО НУЖНО.\n1. Напиши код целиком, чтобы он запускался без правок.\n2. После кода объясни по шагам, что он делает.\n3. Покажи, какие числа в результате зависят от параметров и как проверить их вручную.\n4. '],['Не выдумывай факты, нормативы и цены',true],[': если данных не хватает — спроси меня.\n\nКОД-ОБРАЗЕЦ — повтори его логику:\n']);
 return parts;
}
function refreshKeys(){
 keyMarks.forEach(h=>editor.removeLineClass(h,'background','key-line'));const info=keyInfo();keyMarks=info.lines.map(i=>editor.addLineClass(i,'background','key-line'));
 el('key-legend').textContent=info.lines.length?'Фиолетовым выделено главное: параметры, которые стоит менять, и строки, где подключаются ваши данные.':'';
 const box=el('prompt');box.replaceChildren();promptParts().forEach(([text,key])=>{const node=document.createElement(key?'mark':'span');node.textContent=text;box.append(node);});
 const tail=document.createElement('span');tail.className='prompt-code';tail.textContent='[код из редактора выше — '+editor.lineCount()+' строк; при копировании подставится целиком]';box.append(tail);
}
el('copy-prompt').onclick=async()=>{const text=promptParts().map(p=>p[0]).join('')+editor.getValue()+'\n';let ok=false;
 try{await navigator.clipboard.writeText(text);ok=true;}catch(e){const area=document.createElement('textarea');area.value=text;document.body.append(area);area.select();try{ok=document.execCommand('copy');}catch(e2){}area.remove();}
 el('copy-state').textContent=ok?'Запрос скопирован. Вставьте его в нейросеть и приложите свой файл, если он есть.':'Не удалось скопировать автоматически — выделите текст запроса и скопируйте вручную.';};
el('exercise').onchange=()=>{const u=new URL(location.href);u.searchParams.set('exercise',el('exercise').value);location.href=u.href;};
let keyTimer;editor.on('change',()=>{if(config){try{const v=editor.getValue();v===config.code?localStorage.removeItem(key()):localStorage.setItem(key(),v);changed=true;}catch(e){}clearTimeout(keyTimer);keyTimer=setTimeout(refreshKeys,400);}});
try{
 const r=await fetch('catalog.json');if(!r.ok)throw new Error('Не удалось загрузить каталог');catalog=await r.json();
 const item=catalog.find(x=>x.id===selected);if(!item)throw new Error('Упражнение не найдено');
 // Упражнение, открытое из урока, фиксировано: список выбора есть только в общем каталоге
 // (страница «Python-практика», ?exercise=demo-visuals или ?all=1), чтобы слушатель не уходил в чужие уроки.
 const params=new URLSearchParams(location.search),origin=catalog.find(x=>x.id===params.get('from')&&x.module!=='demo'&&x.module!=='project');
 const lesson=item.module==='project'?origin:(item.module!=='demo'?item:null);
 const locked=(item.module!=='demo'&&!params.has('all'))||!!lesson;
 if(lesson){const nav=el('modes');nav.hidden=false;[[lesson.id,'Учебный пример урока',item.id===lesson.id],['my-field','Мой участок',item.id==='my-field']].forEach(([id,text,active])=>{const a=document.createElement('a');a.textContent=text;a.href='?exercise='+id+(id==='my-field'?'&from='+lesson.id:'');if(active)a.setAttribute('aria-current','page');nav.append(a);});}
 if(locked){el('exercise').hidden=true;el('exercise-label').hidden=true;el('exercise').append(new Option(item.title,item.id));}
 else{
  const groups=new Map();
  catalog.forEach(x=>{if(!groups.has(x.module)){const g=document.createElement('optgroup');g.label=x.module==='demo'?'Демонстрация':x.module==='project'?'Свой проект':'Модуль '+x.module.toUpperCase();groups.set(x.module,g);el('exercise').append(g);}groups.get(x.module).append(new Option(x.title,x.id));});
 }
 el('exercise').value=selected;
 const c=await fetch('exercises/'+item.id+'.json');if(!c.ok)throw new Error('Не удалось загрузить упражнение');config=await c.json();
 expected=[...new Set([...config.code.matchAll(/os\.path\.exists\(\s*['"]([^'"/]+)['"]\s*\)/g)].map(m=>m[1]))].filter(n=>{try{checkFile(n);return true;}catch(e){return false;}});defineSlots();await loadProject();renderSlots();if(slotDefs.length||inputDefs.length)el('files-box').open=true;el('title').textContent=config.title;el('task').textContent=config.task;el('scope').textContent=config.scope;document.title=config.title+' · FOLUR Python';el('standalone').href=location.href;
 let saved;try{saved=localStorage.getItem(key());if(saved===null&&config.id==='a1-l01')saved=localStorage.getItem('folur-python-a1-passport-v1');}catch(e){}editor.setValue(saved===null||saved===undefined?config.code:saved);el('status').textContent='Готово к запуску';controls();refreshKeys();
}catch(e){el('status').textContent=String(e);}
})();