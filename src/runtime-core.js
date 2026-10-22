function createPokesurvivorKorean(data, options) {
  'use strict';
  options=options||{};
  const normalize = s => String(s).replace(/\s+/g, ' ').trim();
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exact = new Map(), lower = new Map(), patterns = [], fragments = new Map();
  const species = data.names.species, moves = {...data.names.moves, ...data.names.gameSpecificTerms}, items = data.names.items;
  const types = data.types || {};
  // Native catalog labels are translate=no to avoid collisions (Power/item, Quirky/rarity).
  // Keep these aliases out of global exact/fragment maps and player-name surfaces.
  const catalogNames = Object.fromEntries(['nature','ability'].map(kind => [kind, new Map(Object.entries(data.names[kind==='nature'?'natures':'abilities'] || {}).map(([k,v]) => [normalize(k).toLocaleLowerCase(),v]))]));
  const natureIds = new Set(['hardy','lonely','brave','adamant','naughty','bold','docile','relaxed','impish','lax','timid','hasty','serious','jolly','naive','modest','mild','quiet','bashful','rash','calm','gentle','sassy','careful','quirky']);
  function put(key, value, fragment = true, argKinds = []) {
    if (!key || !value || typeof value !== 'string') return;
    key = normalize(key); if (!key || key === value) return;
    if (key.includes('{x}')) {
      const pieces = key.split('{x}');
      if (pieces.every(p => !/\p{L}/u.test(p))) return;
      patterns.push({key, value, argKinds, re:new RegExp('^'+pieces.map(escape).join('(.+?)')+'$', 'iu'), score:pieces.join('').length});
    } else {
      exact.set(key, value); lower.set(key.toLocaleLowerCase(), value);
      if (fragment && (key.length >= 4 || /\s/.test(key))) fragments.set(key.toLocaleLowerCase(), value);
    }
  }
  for (const e of data.entries) { put(e.es, e.ko, true, e.argKinds); put(e.en, e.ko, true, e.argKinds); }
  for (const [k,v] of Object.entries(species)) put(k,v);
  for (const [k,v] of Object.entries(items)) put(k,v);
  // Psychic is both a type and a move. The default is the type; move contexts override it.
  for (const [k,v] of Object.entries(moves)) if (!['psychic','psíquico'].includes(k.toLowerCase())) put(k,v);
  put('Psíquico','에스퍼'); put('Psychic','에스퍼');
  patterns.sort((a,b)=>b.score-a.score);
  const fragmentKeys=[...fragments.keys()].sort((a,b)=>b.length-a.length);
  const fragRE=fragmentKeys.length ? new RegExp('(^|[^\\p{L}\\p{N}])('+fragmentKeys.map(escape).join('|')+')(?![\\p{L}\\p{N}])','giu') : null;
  const cache=new Map();
  function translate(input, kind='general', depth=0) {
    if (typeof input!=='string' || !input || depth>5) return input;
    const normalized=normalize(input); if (!normalized || !/\p{L}/u.test(normalized)) return input;
    const cacheKey=kind+'\0'+input;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const around=/^(\s*)([\s\S]*?)(\s*)$/.exec(input);
    let out;
    if(kind==='type') out=types[normalized];
    if(kind==='nature'||kind==='ability')out=catalogNames[kind].get(normalized.toLocaleLowerCase());
    if(kind==='form' && /^Normal$/i.test(normalized))out='일반';
    if(kind==='save-data' && /^(Save|Partida)$/i.test(normalized))out='저장 데이터';
    if (kind==='move') {
      out=moves[normalized];
      if (out===undefined && /^(psychic|psíquico)$/i.test(normalized)) out='사이코키네시스';
      if (out===undefined && /[→+]/.test(normalized)) {
        out=normalized.split(/(\s*[→+]\s*)/).map(part=>/[→+]/.test(part)?part:translate(part,'move',depth+1)).join('');
      }
    }
    if (out===undefined) out=exact.get(normalized) ?? lower.get(normalized.toLocaleLowerCase());
    if (out===undefined) {
      for (const p of patterns) {
        const m=p.re.exec(normalized); if(!m)continue;
        let i=1; out=p.value.replace(/\{x\}/g,()=>{const index=i++;const slotKind=['general','move','type','form','save-data','nature','ability'].includes(p.argKinds?.[index-1])?p.argKinds[index-1]:kind;return translate(m[index] || '',slotKind,depth+1);}); break;
      }
    }
    if (out===undefined && fragRE) out=normalized.replace(fragRE,(match,left,key)=>left+(kind==='type' && /^normal$/i.test(key) ? '노말' : (fragments.get(key.toLocaleLowerCase())||key)));
    if (out===undefined) out=normalized;
    out=around[1]+out+around[3];
    if(cache.size>12000)cache.clear();cache.set(cacheKey,out);return out;
  }
  const translatedNodes=new WeakMap();
  const trustedNoTranslate='#news-body,#scr-savenote,#rk-me,#boot,[data-lang],#dex-detail .mon-extra > .mx-row:nth-child(1) > b[translate="no"],#dex-detail .mon-extra > .mx-row:nth-child(2) > b[translate="no"],#dex-detail .mon-extra #mx-picker button[data-v] > b[translate="no"]';
  function skip(el) {
    if(!el || el.closest('script,style,code,pre,textarea,input,[contenteditable="true"],[data-psko-own]'))return true;
    const no=el.closest('[translate="no"]'); return !!no && !el.closest(trustedNoTranslate);
  }
  function context(el, attribute) {
    if(el.closest('.type,.tag-chip,#dex-type'))return 'type';
    if(el.closest('#dex-detail .mon-extra > .mx-row:nth-child(1) > b'))return 'nature';
    if(el.closest('#dex-detail .mon-extra > .mx-row:nth-child(2) > b'))return 'ability';
    const pickerChoice=el.closest('#dex-detail .mon-extra #mx-picker button[data-v]');
    if(pickerChoice){const value=pickerChoice.getAttribute('data-v');if(/^[012]$/.test(value))return 'ability';if(natureIds.has(value))return 'nature';return 'move';}
    if(el.closest('#shop-body .upg-item > div > b,#bag-body .upg-item > div > b'))return 'move';
    if(el.closest('#dex-detail .seg'))return 'form';
    if(el.closest('#set-body .set-row .grow b'))return 'save-data';
    if(el.closest('.gen-tab'))return 'general';
    if(attribute==='title' && el.closest('.move-icons,.ban-moves'))return 'move';
    if(el.closest('#cards .nm,#bond-cards .nm,.ban-moves button,#pause-sum td:first-child,#upg-list [data-start],#upg-list [data-start2],#upg-list .bind-slot option'))return 'move';
    if(el.closest('#dex-detail p b.gold'))return 'move';
    return 'general';
  }
  function text(node) {
    const el=node.parentElement;if(skip(el))return;
    const value=node.nodeValue;if(translatedNodes.get(node)===value)return;
    let result=translate(value,context(el));
    if(el.matches('#news-body small') || (el.closest('#news-body') && el.tagName==='SMALL')) {
      const m=/^(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i.exec(normalize(value));
      if(m)result=m[3]+'년 '+(['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(m[2].toLowerCase())+1)+'월 '+m[1]+'일';
    }
    translatedNodes.set(node,result);if(result!==value)node.nodeValue=result;
  }
  const attrs=['title','placeholder','alt','aria-label','aria-valuetext'];
  function element(el) {
    // Editable values stay untouched; their hint/accessible label can be translated.
    if(el.closest('script,style,code,pre,[data-psko-own]'))return;
    const no=el.closest('[translate="no"]');
    if(no&&!el.closest(trustedNoTranslate)){
      const tip=el.getAttribute('title');
      if(tip && /^(Ver su perfil|View (their )?profile)$/i.test(tip))el.setAttribute('title',translate(tip));
      return;
    }
    for(const a of attrs){const v=el.getAttribute(a);if(!v)continue;const r=translate(v,context(el,a));if(r!==v)el.setAttribute(a,r);}
  }
  function walk(root) {
    if(root.nodeType===3){text(root);return;}
    if(root.nodeType!==1 || root.matches('script,style,code,pre,[data-psko-own]'))return;
    element(root);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
    let node;while((node=walker.nextNode())){if(node.nodeType===3)text(node);else element(node);}
  }
  function installDOM() {
    if(options.isActive&&!options.isActive())return;
    if(document.documentElement.dataset.pskoDom===data.version)return;
    if(globalThis.__PSKO_DOM_OBSERVER)globalThis.__PSKO_DOM_OBSERVER.disconnect();
    document.documentElement.dataset.pskoDom=data.version;
    if(/(^|\.)pokesurvivor\.com$/i.test(location.hostname))document.documentElement.lang='ko';
    if(document.body)walk(document.body);
    const observer=new MutationObserver(ms=>{if(options.isActive&&!options.isActive())return;for(const m of ms){if(m.type==='characterData')text(m.target);else if(m.type==='attributes')element(m.target);else for(const node of m.addedNodes)walk(node);}});
    observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:attrs});
    globalThis.__PSKO_DOM_OBSERVER=observer;
    document.title=translate(document.title);
  }
  function installCanvas() {
    if(typeof CanvasRenderingContext2D==='undefined')return {ok:false,reason:'no-canvas'};
    const proto=CanvasRenderingContext2D.prototype;
    if(proto.__pskoCanvasVersion===data.version)return {ok:true,version:data.version};
    const base=proto.__pskoCanvasOriginals || Object.fromEntries(['fillText','strokeText','measureText'].map(k=>[k,proto[k]]));
    Object.defineProperty(proto,'__pskoCanvasOriginals',{value:base,configurable:true});
    for(const key of ['fillText','strokeText','measureText']){
      proto[key]=function(value,...args){return base[key].call(this,(!options.isActive||options.isActive())&&typeof value==='string'?translate(value,'move'):value,...args);};
    }
    Object.defineProperty(proto,'__pskoCanvasVersion',{value:data.version,configurable:true});
    if(!globalThis.__PSKO_NATIVE_DIALOGS){
      const oc=globalThis.confirm,oa=globalThis.alert;
      globalThis.confirm=s=>oc.call(globalThis,(!options.isActive||options.isActive())?translate(s):s);
      globalThis.alert=s=>oa.call(globalThis,(!options.isActive||options.isActive())?translate(s):s);
      globalThis.__PSKO_NATIVE_DIALOGS=true;
    }
    document.documentElement.dataset.pskoCanvas='native-main';
    return {ok:true,version:data.version};
  }
  return {version:data.version,translate,installDOM,installCanvas,walk};
}
