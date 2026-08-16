const SPREADSHEET_ID = '1W1UPlbS2wwHGQ3JjzsYlQ4ZuRqlxy5M7NuInap9B96w';
const DATA_SHEET_GID = 129712828;
const DEFAULT_SHARED_PIN = '120810';
const LOG_SHEET_NAME = '변경 기록';

function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  const callback = /^[A-Za-z_$][\w$\.]*$/.test(p.callback || '') ? p.callback : 'callback';
  try {
    const pin = String(p.pin || '');
    if (!isValidPin_(pin)) return jsonp_(callback, { ok: false, error: 'PIN이 올바르지 않습니다.' });

    if (p.action === 'verify') return jsonp_(callback, { ok: true });
    if (p.action === 'save') {
      const result = saveOwnership_(String(p.nickname || '').trim(), String(p.rows || ''));
      return jsonp_(callback, result);
    }
    return jsonp_(callback, { ok: false, error: '지원하지 않는 요청입니다.' });
  } catch (err) {
    return jsonp_(callback, { ok: false, error: err && err.message ? err.message : '처리 중 오류가 발생했습니다.' });
  }
}

function isValidPin_(pin) {
  const configured = PropertiesService.getScriptProperties().getProperty('SHARED_PIN');
  return pin === (configured || DEFAULT_SHARED_PIN);
}

function getDataSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheets().find(function(s) { return s.getSheetId() === DATA_SHEET_GID; });
  if (!sheet) throw new Error('꽃 데이터 시트를 찾을 수 없습니다.');
  return sheet;
}

function findColumn_(headers, candidates) {
  const normalized = headers.map(function(v) { return String(v).replace(/\s/g, '').toLowerCase(); });
  for (let i = 0; i < candidates.length; i++) {
    const candidate = String(candidates[i]).replace(/\s/g, '').toLowerCase();
    const index = normalized.indexOf(candidate);
    if (index !== -1) return index;
  }
  return -1;
}

function parseOwners_(value) {
  return String(value || '').split(/[,，\n]+/).map(function(v) { return v.trim(); }).filter(Boolean);
}

function saveOwnership_(nickname, rowList) {
  if (!nickname || nickname.length > 30) throw new Error('닉네임을 정확히 입력해 주세요.');

  const selectedRows = new Set(
    rowList.split(',').map(function(v) { return Number(v); })
      .filter(function(v) { return Number.isInteger(v) && v >= 2; })
  );

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getDataSheet_();
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) throw new Error('꽃 데이터가 없습니다.');

    const headers = values[0];
    const nameCol = findColumn_(headers, ['꽃 이름', '꽃이름', '이름']);
    const ownerCol = findColumn_(headers, ['보유자 닉네임', '보유자닉네임', '보유자']);
    if (nameCol < 0 || ownerCol < 0) throw new Error('꽃 이름 또는 보유자 닉네임 열을 찾을 수 없습니다.');

    const previous = [];
    const nextOwnerValues = [];
    let ownedCount = 0;

    for (let i = 1; i < values.length; i++) {
      const rowNumber = i + 1;
      const flowerName = String(values[i][nameCol] || '').trim();
      let owners = parseOwners_(values[i][ownerCol]);
      const hadNickname = owners.indexOf(nickname) !== -1;
      const shouldOwn = selectedRows.has(rowNumber);

      if (hadNickname !== shouldOwn) previous.push([flowerName, hadNickname, shouldOwn]);
      owners = owners.filter(function(v) { return v !== nickname; });
      if (shouldOwn) {
        owners.push(nickname);
        ownedCount++;
      }
      nextOwnerValues.push([owners.join(', ')]);
    }

    if (nextOwnerValues.length) {
      sheet.getRange(2, ownerCol + 1, nextOwnerValues.length, 1).setValues(nextOwnerValues);
    }
    appendLog_(nickname, previous, ownedCount);
    SpreadsheetApp.flush();

    return { ok: true, ownedCount: ownedCount, changedCount: previous.length };
  } finally {
    lock.releaseLock();
  }
}

function appendLog_(nickname, changes, ownedCount) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let log = ss.getSheetByName(LOG_SHEET_NAME);
  if (!log) {
    log = ss.insertSheet(LOG_SHEET_NAME);
    log.appendRow(['변경 시각', '닉네임', '변경 수', '최종 보유 수', '변경 내용']);
    log.setFrozenRows(1);
  }
  const summary = changes.map(function(v) {
    return v[0] + ':' + (v[1] ? '보유→미보유' : '미보유→보유');
  }).join(' / ');
  log.appendRow([new Date(), nickname, changes.length, ownedCount, summary]);
}

function jsonp_(callback, payload) {
  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function setSharedPin(newPin) {
  const pin = String(newPin || '').trim();
  if (!/^\d{4,10}$/.test(pin)) throw new Error('PIN은 숫자 4~10자리로 설정해 주세요.');
  PropertiesService.getScriptProperties().setProperty('SHARED_PIN', pin);
}