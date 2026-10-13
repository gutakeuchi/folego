import { useEffect, useRef, useState } from 'react';
import { emptyFinance, validateFinance, type Finance } from './model';
type User = { userId:string; displayName:string; email:string };
type RecordData = { data:Finance; revision:number; dirty:boolean };
const localPreview = location.protocol==='file:' || ['localhost','127.0.0.1'].includes(location.hostname);
export function useFinance() {
  const [user,setUser]=useState<User|null>(null), [record,setRecord]=useState<RecordData>({data:emptyFinance(),revision:0,dirty:false});
  const [status,setStatus]=useState('Carregando…'), [ready,setReady]=useState(false), [conflict,setConflict]=useState(false);
  const [error,setError]=useState(''); const key=useRef(''); const syncing=useRef(false);
  const [retry,setRetry]=useState(0);
  useEffect(()=> { let alive=true; (async()=> {
    try {
      const response=await fetch('/api/finance',{cache:'no-store',credentials:'same-origin'});
      if(response.status===401){if(alive){setStatus('Entre para acessar suas finanças');setReady(true);}return;}
      if(!response.ok || !response.headers.get('content-type')?.includes('application/json'))throw new Error('Servidor indisponível');
      const remote=await response.json(); if(!validateFinance(remote.data)||!remote.user?.userId)throw new Error('Resposta inválida');
      key.current=`folego.user.${remote.user.userId}.v2`;
      let next:RecordData={data:remote.data,revision:remote.revision,dirty:false};
      try { const cached=JSON.parse(localStorage.getItem(key.current)||'null'); if(cached?.dirty&&validateFinance(cached.data)){next=cached;if(cached.revision!==remote.revision)setConflict(true);} } catch {}
      if(alive){setUser(remote.user);setRecord(next);setStatus(next.dirty?'Alterações pendentes':'Sincronizado');setReady(true);}
    } catch {
      if(!alive)return;
      if(localPreview) { key.current='folego.local.v2';let next:RecordData={data:emptyFinance(),revision:0,dirty:false};try{const saved=JSON.parse(localStorage.getItem(key.current)||'null');if(saved&&validateFinance(saved.data))next=saved;}catch{}
        setRecord(next);setStatus('Modo local • somente neste navegador');setReady(true);
      } else {setError('Não foi possível conectar. Reconecte à internet e recarregue para entrar com segurança.');setReady(true);}
    }
  })();return()=>{alive=false;};},[]);
  useEffect(()=> {if(!ready||!key.current)return;try{localStorage.setItem(key.current,JSON.stringify(record));}catch{setError('Armazenamento local cheio ou indisponível. Exporte uma cópia dos dados.');}},[record,ready]);
  useEffect(()=> {const online=()=>setRetry(n=>n+1);window.addEventListener('online',online);return()=>window.removeEventListener('online',online);},[]);
  useEffect(()=> {
    if(!user||!record.dirty||conflict||syncing.current)return;
    const timer=window.setTimeout(async()=> {
      syncing.current=true;setStatus('Salvando…');
      try {
        const response=await fetch('/api/finance',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Folego-Request':'1'},body:JSON.stringify({data:record.data,revision:record.revision})});
        if(response.status===409){setConflict(true);setStatus('Conflito entre dispositivos');return;}
        if(!response.ok)throw new Error('Falha ao salvar');
        const result=await response.json();
        setRecord(current=>({...current,revision:result.revision,dirty:current.data!==record.data}));setStatus('Sincronizado');
      }catch{setStatus('Sem conexão • alterações pendentes');}
      finally{syncing.current=false;}
    },500);return()=>clearTimeout(timer);
  },[record,user,conflict,retry]);
  function update(fn:(data:Finance)=>Finance){setRecord(current=>{const data=fn(current.data);if(!validateFinance(data))throw new Error('Dados inválidos. Confira os campos.');return {...current,data,dirty:true};});}
  return {data:record.data,update,user,status,ready,error,conflict,localPreview,retry:()=>setRetry(n=>n+1)};
}
