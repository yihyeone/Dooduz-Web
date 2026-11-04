class SpecialOwnerList extends HTMLElement {
  connectedCallback() {
    if (this.track) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host { display:block; margin-top:10px; font-family:inherit; font-size:14px; font-weight:700; line-height:1.6; }
      :host([hidden]) { display:none }
      .row { display:flex; align-items:center; justify-content:center; gap:10px }
      .label { flex:none }
      .track { display:flex; gap:13px; min-width:0; overflow-x:auto; overscroll-behavior-x:contain; scrollbar-width:none; padding-block:2px;
        mask-image:linear-gradient(to right, var(--start,#000), #000 var(--left,0px), #000 calc(100% - var(--right,0px)), var(--end,#000)); }
      .track::-webkit-scrollbar { display:none }
      .track.left { --start:transparent; --left:18px }
      .track.right { --end:transparent; --right:18px }
      .entry { display:inline-flex; align-items:center; gap:4px; flex:none; white-space:nowrap }
      .score { padding:0 6px; border-radius:6px; background:#f6e7c7; color:#71481f; font-variant-numeric:tabular-nums }
    </style><div class="row"><span class="label">절품</span><div class="track" role="region" aria-label="절품 닉네임과 점수"></div></div>`;
    this.track = root.querySelector('.track');
    const update = () => {
      const remaining = this.track.scrollWidth - this.track.clientWidth;
      this.track.classList.toggle('left', this.track.scrollLeft > 1);
      this.track.classList.toggle('right', remaining - this.track.scrollLeft > 1);
      this.track.tabIndex = remaining > 1 ? 0 : -1;
    };
    this.track.addEventListener('scroll', update, { passive:true });
    new ResizeObserver(update).observe(this.track);
    this.updateEdges = update;
  }

  set owners(value) {
    const names = String(value || '').split(/[,，\n]+/).map(name => name.trim()).filter(Boolean);
    this.hidden = !names.length;
    this.track.replaceChildren();
    for (const name of names) {
      const match = name.match(/^(.+?)\s*(\+[1-4])$/);
      const entry = document.createElement('span');
      entry.className = 'entry';
      entry.textContent = match ? match[1].trim() : name;
      if (match) {
        const score = document.createElement('span');
        score.className = 'score';
        score.textContent = match[2];
        entry.append(score);
      }
      this.track.append(entry);
    }
    this.track.scrollLeft = 0;
    requestAnimationFrame(this.updateEdges);
  }
}
customElements.define('special-owner-list', SpecialOwnerList);
