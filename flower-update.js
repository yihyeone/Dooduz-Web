window.FLOWER_IMAGE_ALIASES=[["홍운 납매","홍운 남매"],["진홍빛 납매","진홍빛 남매"],["비령추란","비령축란"],["봄 살구빛 옷자락","봄 살구빛 웃자락"],["스노우 씰 샤베트","스노우 셀 샤베트"],["얕은 여울의 모래성","맑은 여울의 모래성"],["적염 괴화","적염규화"],["영롱한 얼음빛 납매","영롱한 얼음빛 남매"],["붉은불꽃 아네모네","붉은별꽃 아네모네"],["꿈의 보라 으아리","꿈의 보라 오아리"],["용금 아네모네","용궁 아네모네"],["묵옥 아네모네","목옥 아네모네"],["반짝 솜토끼","반짝 숨토끼"],["옛뜰 잔향","구정연향"],["유벽 메코놉시스","유백 메코놉시스"],["오렌지꿀 버베나","오렌지꽃 버베나"],["귤홍 윙윙 장미","금홍 윙윙 장미"],["연분홍 폼폼 국화","연분홍 퐁퐁 국화"],["연귤색 폼폼 국화","연주색 퐁퐁 국화"],["순백 폼폼 국화","순백 퐁퐁 국화"],["연노랑 녹융호","연노랑 녹용초"],["개상사화","개양사화"],["자홍깃 재클린","자홍지 재클린"],["촉영 해당화","축영 해당화"],["블루스타 납매","블루스타 남매"]];
window.SUPPLEMENTAL_FLOWERS=["비단 꽃부채","성란화의 언약","우주 토끼 여행","우주선 댕댕이","별빛 입맞춤 구름 양"];
Object.assign(window.NEW_FLOWER_IMAGES=window.NEW_FLOWER_IMAGES||{},{"블루스타 남매":"./images/aug19/01.webp?v=20260819","블루스타 납매":"./images/aug19/01.webp?v=20260819c","가을빛 단풍":"./images/aug19/02.webp?v=20260819","파스텔 꿈의 조개":"./images/aug19/03.webp?v=20260819","바다색 꿈의 조개":"./images/aug19/04.webp?v=20260819","불꽃심장 꿈조개":"./images/aug19/05.webp?v=20260819b","연분홍 환상 벚꽃":"./images/aug19/06.webp?v=20260819","연보라 환상 벚꽃":"./images/aug19/07.webp?v=20260819","성란화의 언약":"./images/aug19/08.webp?v=20260819","꽃케이크 바구니":"./images/aug19/09.webp?v=20260819"});

// 길드전 임무표 BETA 진입 버튼: 길드 도감 완성도/내 꽃 수정 영역 바로 아래에 삽입
(function addGuildBattleBetaEntry(){
  function mount(){
    if(document.getElementById('guildBattleBetaEntry')) return true;
    const nodes=[...document.querySelectorAll('body *')];
    const edit=nodes.find(el=>el.children.length===0 && (el.textContent||'').trim().includes('내 꽃 수정'));
    const completion=nodes.find(el=>el.children.length===0 && (el.textContent||'').trim().includes('길드 도감 완성도'));
    if(!edit||!completion) return false;
    let box=edit;
    for(let i=0;i<6&&box.parentElement;i++,box=box.parentElement){
      if((box.textContent||'').includes('길드 도감 완성도')&&(box.textContent||'').includes('내 꽃 수정')) break;
    }
    if(!box||!box.parentElement) return false;
    const a=document.createElement('a');
    a.id='guildBattleBetaEntry';
    a.href='./guild-test.html';
    a.setAttribute('aria-label','길드전 임무표 BETA 열기');
    a.innerHTML='<span style="font-weight:800">⚔ 길드전 임무표</span><span style="font-size:10px;font-weight:800;letter-spacing:.04em;padding:3px 6px;border-radius:999px;background:#efe4d5;color:#7a5946">BETA</span><span style="margin-left:auto;color:#9a8171;font-size:16px">›</span>';
    a.style.cssText='display:flex;align-items:center;gap:7px;width:100%;margin:8px 0 10px;padding:11px 13px;border:1px solid #e3d6c7;border-radius:12px;background:#fffdf9;color:#4a2b1d;text-decoration:none;font-size:13px;box-shadow:0 1px 2px rgba(74,43,29,.03);';
    box.insertAdjacentElement('afterend',a);
    return true;
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{if(!mount()){const o=new MutationObserver(()=>{if(mount())o.disconnect()});o.observe(document.body,{childList:true,subtree:true});setTimeout(()=>o.disconnect(),10000)}});
  else if(!mount()){const o=new MutationObserver(()=>{if(mount())o.disconnect()});o.observe(document.body,{childList:true,subtree:true});setTimeout(()=>o.disconnect(),10000)}
})();
