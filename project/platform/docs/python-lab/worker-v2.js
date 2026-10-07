// CSP blocks real network calls even if Python replaces these helpers.
const pending=new Map();let assetId=0;
const virtualBase='https://runtime.invalid/';
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(input,options={})=>{
 const url=input instanceof Request?input.url:String(input);
 if(typeof url!=='string'||!url.startsWith(virtualBase)||options.method&&options.method!=='GET')throw Error('Сеть отключена в учебной среде');
 const name=url.slice(virtualBase.length);
 if(!/^[a-zA-Z0-9_.-]+$/.test(name))throw Error('Недопустимый файл среды');
 const id=++assetId;if(id>160)throw Error('Лимит загрузки среды');
 const bytes=await new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});postMessage({type:'asset-request',id,name:'runtime/'+name});});
 return new Response(bytes,{headers:{'Content-Type':name.endsWith('.wasm')?'application/wasm':'application/octet-stream'}});
};
function moduleURL(source){return URL.createObjectURL(new Blob([source],{type:'text/javascript'}));}
let py;
self.folurEmit = payload => postMessage({type:'display',payload:JSON.parse(payload)});
const SUPPORT=String.raw`
import os, json, base64, io, pathlib, warnings
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from PIL import Image
Image.MAX_IMAGE_PIXELS = 16_000_000
warnings.simplefilter('error', Image.DecompressionBombWarning)
from js import folurEmit
import IPython.display as _display_module
_folur_counter = 0

def display(*values, title=None, **kwargs):
    global _folur_counter
    for value in values:
        if value is None: continue
        _folur_counter += 1
        if _folur_counter > 40: raise ValueError('Лимит: 40 результатов за запуск')
        name = f'result-{_folur_counter}'
        if isinstance(value, pd.Series): value = value.to_frame()
        if isinstance(value, pd.DataFrame):
            if len(value.columns)>100: raise ValueError('Лимит: 100 столбцов')
            include_index=not isinstance(value.index,pd.RangeIndex) or value.index.name is not None
            preview=value.head(100).reset_index() if include_index else value.head(100)
            payload=json.loads(preview.to_json(orient='split',date_format='iso'))
            message={'kind':'table','title':title or 'Таблица','columns':payload['columns'],'rows':payload['data'],'total':len(value),'csv':value.to_csv(index=include_index),'name':name+'.csv'}
        elif isinstance(value, Image.Image):
            if value.width*value.height>16_000_000: raise ValueError('Изображение превышает 16 млн пикселей')
            buffer=io.BytesIO();value.save(buffer,format='PNG')
            message={'kind':'image','title':title or 'Изображение','data':base64.b64encode(buffer.getvalue()).decode(),'name':name+'.png'}
        else:
            message={'kind':'text','title':title or 'Значение','text':str(value)[:20000]}
        folurEmit(json.dumps(message,ensure_ascii=False))

_display_module.display=display
plt.show=lambda *args,**kwargs: None
os.makedirs('/workspace',exist_ok=True)
os.chdir('/workspace')
`;
self.onmessage=async({data})=>{
 try{
  if(data.type==='asset-response'){const item=pending.get(data.id);if(item){pending.delete(data.id);data.error?item.reject(Error(data.error)):item.resolve(data.data);}return;}
  if(data.type==='init'){
   const pyURL=moduleURL(data.pyodide),asmURL=moduleURL(data.asm);
   const {loadPyodide}=await import(pyURL);const {default:createPyodideModule}=await import(asmURL);
   py=await loadPyodide({indexURL:virtualBase,packageBaseUrl:virtualBase,createPyodideModule,stdout:text=>postMessage({type:'stdout',text}),stderr:text=>postMessage({type:'stderr',text})});
   // PROJ and GDAL bundle overlapping native SQLite symbols. Initialize PROJ
   // before concurrent package loads; download timing must not choose their owner.
   await py.loadPackage('pyproj',{messageCallback:()=>{}});
   await py.runPythonAsync('import pyproj; pyproj.CRS.from_epsg(4326)');
   await py.loadPackage([...new Set(['numpy','pandas','matplotlib','pillow','ipython',...data.packages])],{messageCallback:text=>postMessage({type:'progress',text:'Подготовка: '+text})});
   await py.runPythonAsync(SUPPORT);postMessage({type:'ready'});
  }else if(data.type==='run'){
   await py.runPythonAsync("import shutil\nos.chdir('/')\nshutil.rmtree('/workspace',ignore_errors=True)\nos.makedirs('/workspace',exist_ok=True)\nos.chdir('/workspace')\nplt.close('all')\n_folur_counter=0");
   const inputNames=[];
   for(const [name,text] of Object.entries(data.fixtures||{})){if(name.includes('/')||name.includes('\\'))throw new Error('Недопустимое имя учебного файла');py.FS.writeFile('/workspace/'+name,text);inputNames.push(name);}
   for(const file of data.files||[]){if(file.name.includes('/')||file.name.includes('\\'))throw new Error('Недопустимое имя файла');py.FS.writeFile('/workspace/'+file.name,file.data);inputNames.push(file.name);}
   await py.loadPackagesFromImports(data.code,{messageCallback:()=>{}});
   const globals=py.toPy({});
   try{
    globals.set('display',py.globals.get('display'));globals.set('__name__','__main__');
    const result=await py.runPythonAsync(data.code,{globals});
    if(result!==undefined&&result!==null){py.globals.get('display')(result);if(result.destroy)result.destroy();}
    await py.runPythonAsync(String.raw`
from matplotlib._pylab_helpers import Gcf
for _i,_manager in enumerate(Gcf.get_all_fig_managers(),1):
    _buf=io.BytesIO()
    # Pyodide's Agg backend emits this known float-coordinate compatibility warning.
    with warnings.catch_warnings():
        warnings.filterwarnings('ignore',message=r'The [xy] parameter as float was deprecated in Matplotlib 3.10.*',category=matplotlib.MatplotlibDeprecationWarning)
        _manager.canvas.figure.savefig(_buf,format='png',dpi=120,bbox_inches='tight')
    folurEmit(json.dumps({'kind':'image','title':'График '+str(_i),'data':base64.b64encode(_buf.getvalue()).decode(),'name':'figure-'+str(_i)+'.png'}))
`);
    if(data.check){await py.runPythonAsync(data.check,{globals});postMessage({type:'passed',text:'Проверка исходного примера пройдена'});}
    const fileJSON=await py.runPythonAsync("json.dumps([str(p) for p in pathlib.Path('.').rglob('*') if p.is_file() and p.suffix.lower() in ['.csv','.json','.geojson','.png','.jpg','.jpeg','.tif','.tiff','.txt'] and not p.is_symlink()])");
    let total=0,count=0;
    for(const name of JSON.parse(fileJSON)){
     if(inputNames.includes(name))continue;
     const size=py.FS.stat('/workspace/'+name).size;if(size>20*1024*1024||total+size>50*1024*1024||count>=20)continue;total+=size;count++;
     const bytes=py.FS.readFile('/workspace/'+name);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));postMessage({type:'file',name:name.replaceAll('/','-'),data:btoa(binary)});
    }
    postMessage({type:'done'});
   }finally{globals.destroy();}
  }
 }catch(e){postMessage({type:'error',text:String(e)});}
};

