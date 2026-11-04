function renderFlowerOwners(container, owners, rawSpecial, linkClass, arrowClass) {
  const special = new Map();
  for (const entry of String(rawSpecial || '').split(/[,，\n]/)) {
    const name = entry.trim();
    if (!name) continue;
    const match = name.match(/^(.+?)\s*(\+[1-4])$/);
    special.set(match ? match[1].trim() : name, match ? match[2] : '');
  }
  const names = [...new Set([...special.keys(), ...owners])];
  container.replaceChildren();
  if (!names.length) container.textContent = '보유 길드원 없음';
  for (const name of names) {
    const link = document.createElement('a');
    link.className = linkClass;
    link.href = 'member.html?name=' + encodeURIComponent(name);
    link.textContent = name;
    const level = special.get(name);
    link.setAttribute('aria-label', name + (special.has(name) ? ' 절품 ' + level : '') + '님의 보유 꽃 보기');
    if (special.has(name)) {
      const mark = document.createElement('span');
      mark.className = 'quality-mark';
      mark.textContent = level;
      link.append(mark);
    }
    const arrow = document.createElement('span');
    arrow.className = arrowClass;
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '›';
    link.append(arrow);
    container.append(link);
  }
  return names.length;
}
