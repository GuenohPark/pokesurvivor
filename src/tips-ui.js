// Verified startup tips. No gameplay/account state is read or changed.
(function(){
'use strict';
if(globalThis.__PSKO_FEATURE_tips)return;globalThis.__PSKO_FEATURE_tips=true;
const tips=PSKO_TIPS;
const css="#ps-ko-tip-panel{box-sizing:border-box;max-width:540px;margin:22px auto 0;padding:16px 18px;border:2px solid #b89442;background:rgba(14,19,30,.94);box-shadow:4px 4px 0 #05080d;text-align:left;color:#e8e6dc;cursor:default;line-height:1.55;font-family:Pixelify,system-ui,sans-serif}#ps-ko-tip-panel .ps-tip-header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 9px}#ps-ko-tip-panel h2{font-size:18px;line-height:1.4;margin:0;color:#ffda73;font-weight:700;text-shadow:none}#ps-ko-tip-panel .ps-tip-category{font-size:12px;white-space:nowrap;color:#95cbd3}#ps-ko-tip-panel .ps-tip-title{font-size:16px;font-weight:700;line-height:1.55;margin:0 0 5px;color:#f4f1e5;letter-spacing:0;text-shadow:none}#ps-ko-tip-panel .ps-tip-text{font-size:14px;line-height:1.65;margin:0;color:#bdc6cc;letter-spacing:0;text-shadow:none}#ps-ko-tip-panel .ps-tip-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px;font-size:11px;color:#82949e}#ps-ko-tip-panel button{font:inherit;font-size:13px;line-height:1.3;padding:8px 10px;min-height:36px;color:#ffda73;background:#26313e;border:1px solid #8a7442;border-radius:0;cursor:pointer;box-shadow:2px 2px 0 #080c12}#ps-ko-tip-panel button:focus-visible{outline:2px solid #ffda73;outline-offset:3px}@media(max-width:600px){#ps-ko-tip-panel{margin-top:14px;padding:12px;max-width:100%}#ps-ko-tip-panel h2{font-size:16px}#ps-ko-tip-panel .ps-tip-title{font-size:14px}#ps-ko-tip-panel .ps-tip-text{font-size:13px}}@media(max-height:550px){#ps-ko-tip-panel{margin-top:10px;padding:10px 12px;max-height:38vh;overflow-y:auto}#ps-ko-tip-panel .ps-tip-header{margin-bottom:4px}#ps-ko-tip-panel .ps-tip-footer{margin-top:6px}}";
let styleCache=null;
function mount(){
 if(globalThis.__PSKO_BOOT?.isAllowed&&!globalThis.__PSKO_BOOT.isAllowed())return;
 const start=document.getElementById('tap-start');
 if(!start || document.getElementById('ps-ko-tip-panel')) return;
 const host=start.querySelector('.boot-in'); if(!host) return;
 if(!document.getElementById('ps-ko-tips-style')){const style=document.createElement('style');style.id='ps-ko-tips-style';style.textContent=css;styleCache=style;(document.head||document.documentElement).appendChild(style);}
 const panel=document.createElement('section');panel.id='ps-ko-tip-panel';panel.setAttribute('translate','no');panel.setAttribute('aria-label','소스로 확인한 게임 팁');
 const header=document.createElement('div');header.className='ps-tip-header';
 const heading=document.createElement('h2');heading.textContent='그거 아셨나요?';
 const category=document.createElement('span');category.className='ps-tip-category';header.append(heading,category);
 const content=document.createElement('div');content.setAttribute('aria-live','polite');content.setAttribute('aria-atomic','true');
 const title=document.createElement('p');title.className='ps-tip-title';
 const text=document.createElement('p');text.className='ps-tip-text';content.append(title,text);
 const footer=document.createElement('div');footer.className='ps-tip-footer';
 const note=document.createElement('span');note.textContent='PSKO_TIPS_DATE 소스 확인 · 참고 팁';
 const next=document.createElement('button');next.type='button';next.textContent='다음 팁';next.setAttribute('aria-label','다른 게임 팁 보기');footer.append(note,next);
 panel.append(header,content,footer);
 let index=Math.floor(Math.random()*tips.length);
 function render(){const tip=tips[index];panel.dataset.tipId=tip.id;category.textContent=tip.category;title.textContent=tip.title;text.textContent=tip.text;}
 panel.addEventListener('click',e=>e.stopPropagation());
 next.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();index=(index+1+Math.floor(Math.random()*(tips.length-1)))%tips.length;render();});
 render();host.appendChild(panel);
}
mount();
const observer=new MutationObserver(mount),options={childList:true,subtree:true};observer.observe(document.documentElement,options);
globalThis.__PSKO_BOOT?.registerFeature('tips',()=>{observer.disconnect();observer.observe(document.documentElement,options);if(!document.getElementById('ps-ko-tips-style')&&styleCache)(document.head||document.documentElement).appendChild(styleCache);mount();});
})();
