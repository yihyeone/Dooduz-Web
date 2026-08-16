const SPREADSHEET_ID = '1W1UPlbS2wwHGQ3JjzsYlQ4ZuRqlxy5M7NuInap9B96w';
const DATA_SHEET_GID = 129712828;
const MEMBER_PINS_PROPERTY = 'MEMBER_PINS';
const LOG_SHEET_NAME = '변경 기록';

function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  const callback = /^[A-Za-z_$][\w$\.]*$/.test(p.callback || '') ? p.callback : 'callback';
  try {
    const pin = String(p.pin || '');
    const nickname = String(p.nickname || '').trim();
    if (!isValidMemberPin_(nickname, pin)) {
      return jsonp_(callback, { ok: false, error: '닉네임 또는 개인 PIN이 올바르지 않습니다.' });
    }

    if (p.action === 'verify') return jsonp_(callback, { ok: true, nickname: nickname });
    if (p.action === 'save') {
      const result = saveOwnership_(nickname, String(p.rows || ''));
      return jsonp_(callback, result);
    }
    return jsonp_(callback, { ok: false, error: '지원하지 않는 요청입니다.' });
  } catch (err) {
    return jsonp_(callback, { ok: false, error: err && err.message ? err.message : '처리 중 오류가 발생했습니다.' });
  }
}

function getMemberPins_() {
  const raw = PropertiesService.getScriptProperties().getProperty(MEMBER_PINS_PROPERTY);
  if (!raw) throw new Error('개인 PIN 설정이 아직 완료되지 않았습니다.');
  const pins = JSON.parse(raw);
  if (!pins || typeof pins !== 'object') throw new Error('개인 PIN 설정 형식이 올바르지 않습니다.');
  return pins;
}

function isValidMemberPin_(nickname, pin) {
  if (!nickname || !/^\d{4}$/.test(pin)) return false;
  const pins = getMemberPins_();
  return Object.prototype.hasOwnProperty.call(pins, nickname) &&
    String(pins[nickname]) === pin;
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

function setMemberPinsFromJson(jsonText) {
  const pins = JSON.parse(String(jsonText || '{}'));
  const names = Object.keys(pins);
  if (!names.length) throw new Error('PIN 목록이 비어 있습니다.');

  const used = {};
  names.forEach(function(nickname) {
    const pin = String(pins[nickname] || '');
    if (!nickname.trim() || !/^\d{4}$/.test(pin)) {
      throw new Error('모든 닉네임과 PIN을 확인해 주세요.');
    }
    if (used[pin]) throw new Error('중복 PIN이 있습니다: ' + pin);
    used[pin] = true;
    pins[nickname.trim()] = pin;
    if (nickname !== nickname.trim()) delete pins[nickname];
  });

  PropertiesService.getScriptProperties()
    .setProperty(MEMBER_PINS_PROPERTY, JSON.stringify(pins));
}