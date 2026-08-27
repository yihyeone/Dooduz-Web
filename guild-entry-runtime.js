(function(){
  function mount(){
    if(document.getElementById('guildBattleBetaEntry')) return true;
    const input=document.querySelector('input[placeholder*="꽃 이름"],input[placeholder*="보유자"]');
    if(!input) return false;
    const tools=input.closest('.tools')||input.parentElement;
    if(!tools||!tools.parentElement) return false;
    const a=document.createElement('a');
    a.id='guildBattleBetaEntry';
    a.href='./guild-test.html';
    a.setAttribute('aria-label','길드전 임무표 BETA 열기');
    a.innerHTML='<span style="font-weight:800">⚔ 길드전 임무표</span><span style="font-size:10px;font-weight:800;letter-spacing:.04em;padding:3px 6px;border-radius:999px;background:#efe4d5;color:#7a5946">BETA</span><span style="margin-left:auto;color:#9a8171;font-size:16px">›</span>';
    a.style.cssText='display:flex;align-items:center;gap:7px;width:100%;margin:8px 0 10px;padding:11px 13px;border:1px solid #e3d6c7;border-radius:12px;background:#fffdf9;color:#4a2b1d;text-decoration:none;font-size:13px;box-shadow:0 1px 2px rgba(74,43,29,.03);';
    tools.parentElement.insertBefore(a,tools);
    return true;
  }
  function start(){
    if(mount()) return;
    const o=new MutationObserver(()=>{if(mount())o.disconnect()});
    o.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>o.disconnect(),10000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();