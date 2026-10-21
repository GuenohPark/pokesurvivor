// A local autocomplete bridges Korean names to the game's existing English/dex search.
// It touches only #dex-q, never account/password fields or game stats.
(function(){
  'use strict';
if(globalThis.__PSKO_FEATURE_search)return;globalThis.__PSKO_FEATURE_search=true;
  const list=SEARCH_SPECIES;
  let pending=false;
  const states=new WeakMap();
  let current=null;
  function install(){
 if(globalThis.__PSKO_BOOT?.isAllowed&&!globalThis.__PSKO_BOOT.isAllowed())return;
    pending=false;
    const original=document.getElementById('dex-q');if(!original){current=null;return;}
    let state=states.get(original);
    if(state){
      current=state;
      if(original.value!==state.gameValue){state.gameValue=original.value;state.input.value=list.find(p=>p.en.toLowerCase()===original.value.toLowerCase())?.ko||original.value;state.results.replaceChildren();}
      return;
    }
    const wrapper=document.createElement('div');wrapper.id='psko-search';wrapper.setAttribute('data-psko-own','');
    wrapper.style.cssText='position:relative;flex:1;min-width:160px';
    const input=original.cloneNode(false);input.id='psko-search-input';input.removeAttribute('name');input.placeholder='한국어·영문 이름 또는 번호';input.setAttribute('aria-label','포켓몬 한국어·영문 이름 또는 번호 검색');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls','psko-search-results');input.style.width='100%';input.value=original.value;
    const results=document.createElement('div');results.id='psko-search-results';results.setAttribute('role','listbox');results.setAttribute('aria-label','한국어 이름 검색 결과');
    results.style.cssText='position:absolute;left:0;right:0;top:100%;z-index:80;max-height:220px;overflow:auto;background:#101827;border:1px solid #64748b;display:none';
    wrapper.append(input,results);original.before(wrapper);original.style.display='none';original.setAttribute('aria-hidden','true');original.tabIndex=-1;
    state={input,results,gameValue:original.value};states.set(original,state);
    function send(query){original.value=query;state.gameValue=query;original.dispatchEvent(new Event('input',{bubbles:true}));}
    function close(){results.replaceChildren();results.style.display='none';input.setAttribute('aria-expanded','false');}
    input.addEventListener('input',()=>{
      const q=input.value.trim();
      if(!/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/.test(q)){close();send(q);return;}
      const matches=list.filter(p=>p.ko.includes(q));results.replaceChildren();results.style.display='block';input.setAttribute('aria-expanded','true');
      const info=document.createElement('div');info.style.cssText='padding:8px;color:#b9c5d4;font-size:12px';info.textContent=matches.length?'일치 '+matches.length+'종 · 포켓몬을 선택하세요':'일치하는 포켓몬이 없어요';results.append(info);
      for(const p of matches.slice(0,30)){
        const b=document.createElement('button');b.type='button';b.setAttribute('role','option');const name=document.createElement('span');name.className='psko-pokemon-name';name.setAttribute('data-psko-dex',String(p.dex));name.textContent=p.ko;b.append(name,document.createTextNode(' · No.'+p.dex));b.style.cssText='display:block;width:100%;text-align:left;padding:9px;color:#e9eef5;background:#172238;border:0;border-top:1px solid #293449;font:inherit;cursor:pointer';
        b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();input.value=p.ko;close();send(p.en);input.focus();});results.append(b);
      }
    });
    input.addEventListener('keydown',e=>{if(e.key==='Escape'){close();input.blur();}if(e.key==='Enter'&&results.style.display!=='none'){e.preventDefault();results.querySelector('button')?.click();}});
    state.wrapper=wrapper;state.close=close;current=state;
  }
  const queue=()=>{if(pending)return;pending=true;queueMicrotask(install);};
  document.addEventListener('pointerdown',e=>{if(globalThis.__PSKO_BOOT?.isAllowed&&!globalThis.__PSKO_BOOT.isAllowed())return;if(current&&!current.wrapper.contains(e.target))current.close();});
  const observer=new MutationObserver(queue),options={childList:true,subtree:true};
  install();observer.observe(document.documentElement,options);
  globalThis.__PSKO_BOOT?.registerFeature('search',()=>{observer.disconnect();observer.observe(document.documentElement,options);install();});
})();
