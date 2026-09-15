const SPREADSHEET_ID = '1W1UPlbS2wwHGQ3JjzsYlQ4ZuRqlxy5M7NuInap9B96w';
const DATA_SHEET_GID = 129712828;
const MEMBER_PINS_PROPERTY = 'MEMBER_PINS';
const LOG_SHEET_NAME = '변경 기록';
const MEMBER_LOG_SHEET_NAME = '길드원 PIN 변경 기록';
const ADMIN_NICKNAME = '두더지도굴단';
const GITHUB_TOKEN_PROPERTY = 'GITHUB_TOKEN';
const GITHUB_REPOSITORY_PROPERTY = 'GITHUB_REPOSITORY';
const GITHUB_BRANCH_PROPERTY = 'GITHUB_BRANCH';
const ADMIN_FLOWER_KEY_PROPERTY = 'ADMIN_FLOWER_KEY';
const DEFAULT_GITHUB_REPOSITORY = 'yihyeone/Dooduz-Web';
const DEFAULT_GITHUB_BRANCH = 'main';
const ADMIN_IMAGE_MAP_PATH = 'admin-flower-images.json';
const ADMIN_IMAGE_DIRECTORY = 'images/flower-assets/';

function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  const callback = /^[A-Za-z_$][\w$\.]*$/.test(p.callback || '') ? p.callback : 'callback';
  try {
    const action = String(p.action || '');
    const pin = String(p.pin || '');
    const nickname = String(p.nickname || '').trim();

    if (action.indexOf('admin-') === 0) {
      if (!isAdminPin_(pin)) {
        return jsonp_(callback, { ok: false, error: '관리자 PIN이 올바르지 않습니다.' });
      }
      if (action === 'admin-flower-status') {
        const nonce = String(p.nonce || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100);
        if (!nonce) return jsonp_(callback, { ok: false, error: '등록 요청 번호가 없습니다.' });
        const cached = CacheService.getScriptCache().get('flower-admin-' + nonce);
        return jsonp_(callback, cached ? JSON.parse(cached) : { ok: true, pending: true });
      }
      if (action === 'admin-list') return jsonp_(callback, { ok: true, members: listMembers_() });
      if (action === 'admin-save-member') {
        return jsonp_(callback, saveMemberPin_(
          String(p.memberNickname || '').trim(),
          String(p.memberPin || '').trim()
        ));
      }
      if (action === 'admin-delete-member') {
        return jsonp_(callback, deleteMemberPin_(String(p.memberNickname || '').trim()));
      }
      return jsonp_(callback, { ok: false, error: '지원하지 않는 관리자 요청입니다.' });
    }

    if (!isValidMemberPin_(nickname, pin)) {
      return jsonp_(callback, { ok: false, error: '닉네임 또는 개인 PIN이 올바르지 않습니다.' });
    }

    if (action === 'verify') return jsonp_(callback, { ok: true, nickname: nickname });
    if (action === 'save') {
      const result = saveOwnership_(nickname, String(p.rows || ''));
      return jsonp_(callback, result);
    }
    return jsonp_(callback, { ok: false, error: '지원하지 않는 요청입니다.' });
  } catch (err) {
    return jsonp_(callback, { ok: false, error: err && err.message ? err.message : '처리 중 오류가 발생했습니다.' });
  }
}

/**
 * 관리자 페이지의 이미지 등록은 파일 용량 때문에 JSONP(GET)가 아니라 숨은 폼(POST)을 사용한다.
 * 결과는 iframe에서 부모 관리자 페이지로 postMessage 한다.
 */
function doPost(e) {
  const p = e && e.parameter ? e.parameter : {};
  const nonce = String(p.nonce || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100);
  let payload;
  try {
    if (String(p.action || '') !== 'admin-save-flower') {
      throw new Error('지원하지 않는 관리자 요청입니다.');
    }
    if (!isAdminPin_(String(p.pin || ''))) {
      throw new Error('관리자 PIN이 올바르지 않습니다.');
    }
    if (!isValidFlowerAdminKey_(String(p.updateKey || ''))) {
      throw new Error('꽃 등록 비밀번호가 올바르지 않습니다.');
    }
    payload = saveFlowerFromAdmin_(p);
  } catch (err) {
    payload = { ok: false, error: err && err.message ? err.message : '처리 중 오류가 발생했습니다.' };
  }
  payload.nonce = nonce;
  if (nonce) {
    CacheService.getScriptCache().put('flower-admin-' + nonce, JSON.stringify(payload), 600);
  }
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutput(
    '<!doctype html><meta charset="utf-8"><script>parent.postMessage(' + json + ',"*");<\/script>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function isValidFlowerAdminKey_(value) {
  const expected = String(PropertiesService.getScriptProperties().getProperty(ADMIN_FLOWER_KEY_PROPERTY) || '');
  return expected.length >= 8 && value === expected;
}

function saveFlowerFromAdmin_(p) {
  const mode = String(p.mode || '');
  const flowerName = String(p.flowerName || '').trim();
  const grade = String(p.grade || '').trim().toUpperCase();
  const owner = String(p.owner || '').trim();
  const imageBase64 = String(p.imageBase64 || '').replace(/\s/g, '');

  if (mode !== 'new' && mode !== 'replace') throw new Error('업데이트 종류를 확인해 주세요.');
  if (!flowerName || flowerName.length > 60) throw new Error('꽃 이름을 정확히 입력해 주세요.');
  if (mode === 'new' && ['UR', 'SSR', 'SR', 'R', 'N'].indexOf(grade) < 0) {
    throw new Error('꽃 등급을 확인해 주세요.');
  }
  if (owner.length > 80) throw new Error('보유자 닉네임이 너무 깁니다.');
  if (!imageBase64 || imageBase64.length > 1400000) throw new Error('이미지 용량이 너무 크거나 비어 있습니다.');

  let bytes;
  try { bytes = Utilities.base64Decode(imageBase64); }
  catch (err) { throw new Error('이미지 데이터를 읽지 못했습니다.'); }
  if (!isWebP_(bytes)) throw new Error('WebP 이미지 형식이 아닙니다.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const flowerInfo = findFlowerByName_(flowerName);
    if (mode === 'new' && flowerInfo) throw new Error('이미 등록된 꽃 이름입니다. 기존 이미지 교체를 사용해 주세요.');
    if (mode === 'replace' && !flowerInfo) throw new Error('기존 꽃 목록에서 같은 이름을 찾지 못했습니다.');

    const now = new Date();
    const stamp = Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMdd-HHmmss');
    const digest = shortHash_(flowerName + '|' + now.getTime());
    const imagePath = ADMIN_IMAGE_DIRECTORY + 'card-admin-' + stamp + '-' + digest + '.webp';
    const publicPath = './' + imagePath;

    createGithubFile_(imagePath, imageBase64, '꽃 이미지 ' + (mode === 'new' ? '등록: ' : '교체: ') + flowerName);
    updateAdminImageMap_(flowerName, publicPath);
    if (mode === 'new') appendFlowerRow_(flowerName, grade, owner);
    appendAdminFlowerLog_(mode === 'new' ? '신규 꽃 등록' : '꽃 이미지 교체', flowerName, mode === 'new' ? grade : flowerInfo.grade, publicPath);
    SpreadsheetApp.flush();
    return { ok: true, mode: mode, flowerName: flowerName, grade: mode === 'new' ? grade : flowerInfo.grade, imagePath: publicPath };
  } finally {
    lock.releaseLock();
  }
}

function normalizeFlowerName_(value) {
  return String(value || '').replace(/[\s·ㆍ•・]/g, '').toLowerCase();
}

function findFlowerByName_(flowerName) {
  const sheet = getDataSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const nameCol = findColumn_(values[0], ['꽃 이름', '꽃이름', '이름']);
  const gradeCol = findColumn_(values[0], ['등급', 'Grade', 'rarity']);
  if (nameCol < 0) throw new Error('꽃 이름 열을 찾을 수 없습니다.');
  const wanted = normalizeFlowerName_(flowerName);
  for (let i = 1; i < values.length; i++) {
    if (normalizeFlowerName_(values[i][nameCol]) === wanted) {
      return { row: i + 1, name: String(values[i][nameCol] || '').trim(), grade: gradeCol >= 0 ? String(values[i][gradeCol] || '').trim().toUpperCase() : '' };
    }
  }
  return null;
}

function appendFlowerRow_(flowerName, grade, owner) {
  const sheet = getDataSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];
  const nameCol = findColumn_(headers, ['꽃 이름', '꽃이름', '이름']);
  const gradeCol = findColumn_(headers, ['등급', 'Grade', 'rarity']);
  const ownerCol = findColumn_(headers, ['보유자 닉네임', '보유자닉네임', '보유자']);
  if (nameCol < 0 || gradeCol < 0) throw new Error('꽃 이름 또는 등급 열을 찾을 수 없습니다.');
  const width = Math.max(sheet.getLastColumn(), headers.length);
  const row = new Array(width).fill('');
  row[nameCol] = flowerName;
  row[gradeCol] = grade;
  if (ownerCol >= 0) row[ownerCol] = owner;
  sheet.appendRow(row);
}

function isWebP_(bytes) {
  if (!bytes || bytes.length < 12) return false;
  const text = function(start, length) {
    let out = '';
    for (let i = start; i < start + length; i++) out += String.fromCharCode(bytes[i] & 255);
    return out;
  };
  return text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP';
}

function shortHash_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes.slice(0, 5).map(function(v) { return ('0' + ((v & 255).toString(16))).slice(-2); }).join('');
}

function getGithubConfig_() {
  const props = PropertiesService.getScriptProperties();
  const token = String(props.getProperty(GITHUB_TOKEN_PROPERTY) || '').trim();
  if (!token) throw new Error('관리자 서버에 GitHub 토큰이 설정되지 않았습니다.');
  return {
    token: token,
    repository: String(props.getProperty(GITHUB_REPOSITORY_PROPERTY) || DEFAULT_GITHUB_REPOSITORY).trim(),
    branch: String(props.getProperty(GITHUB_BRANCH_PROPERTY) || DEFAULT_GITHUB_BRANCH).trim()
  };
}

function githubRequest_(apiPath, options) {
  const config = getGithubConfig_();
  const opts = options || {};
  opts.muteHttpExceptions = true;
  opts.headers = Object.assign({}, opts.headers || {}, {
    Authorization: 'Bearer ' + config.token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  });
  const response = UrlFetchApp.fetch('https://api.github.com/repos/' + config.repository + apiPath, opts);
  const status = response.getResponseCode();
  let body = {};
  try { body = JSON.parse(response.getContentText() || '{}'); } catch (err) {}
  if (status < 200 || status >= 300) {
    throw new Error('GitHub 업데이트 실패 (' + status + '): ' + String(body.message || '권한과 저장소 설정을 확인해 주세요.'));
  }
  return body;
}

function getGithubFile_(path) {
  const config = getGithubConfig_();
  return githubRequest_('/contents/' + path.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(config.branch), { method: 'get' });
}

function createGithubFile_(path, base64Content, message) {
  const config = getGithubConfig_();
  return githubRequest_('/contents/' + path.split('/').map(encodeURIComponent).join('/'), {
    method: 'put',
    contentType: 'application/json',
    payload: JSON.stringify({ message: message, content: base64Content, branch: config.branch })
  });
}

function updateGithubTextFile_(path, text, sha, message) {
  const config = getGithubConfig_();
  return githubRequest_('/contents/' + path.split('/').map(encodeURIComponent).join('/'), {
    method: 'put',
    contentType: 'application/json',
    payload: JSON.stringify({
      message: message,
      content: Utilities.base64Encode(text, Utilities.Charset.UTF_8),
      sha: sha,
      branch: config.branch
    })
  });
}

function updateAdminImageMap_(flowerName, imagePath) {
  const file = getGithubFile_(ADMIN_IMAGE_MAP_PATH);
  const source = Utilities.newBlob(Utilities.base64Decode(String(file.content || '').replace(/\s/g, ''))).getDataAsString('UTF-8');
  let images;
  try { images = JSON.parse(source || '{}'); } catch (err) { throw new Error('관리자 이미지 매핑을 읽지 못했습니다.'); }
  images[flowerName] = imagePath;
  const next = JSON.stringify(images, null, 2) + '\n';
  updateGithubTextFile_(ADMIN_IMAGE_MAP_PATH, next, file.sha, '꽃 이미지 매핑 업데이트: ' + flowerName);
}

function appendAdminFlowerLog_(action, flowerName, grade, imagePath) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = '꽃 관리자 변경 기록';
  let log = ss.getSheetByName(sheetName);
  if (!log) {
    log = ss.insertSheet(sheetName);
    log.appendRow(['변경 시각', '작업', '꽃 이름', '등급', '이미지 경로']);
    log.setFrozenRows(1);
  }
  log.appendRow([new Date(), action, flowerName, grade, imagePath]);
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

function isAdminPin_(pin) {
  const pins = getMemberPins_();
  return /^\d{4}$/.test(pin) && String(pins[ADMIN_NICKNAME] || '') === pin;
}

function listMembers_() {
  const pins = getMemberPins_();
  return Object.keys(pins).map(function(nickname) {
    return { nickname: nickname, pin: String(pins[nickname]) };
  }).sort(function(a, b) {
    if (a.nickname === ADMIN_NICKNAME) return -1;
    if (b.nickname === ADMIN_NICKNAME) return 1;
    return a.nickname.localeCompare(b.nickname, 'ko');
  });
}

function saveMemberPin_(nickname, pin) {
  if (!nickname || nickname.length > 30) throw new Error('닉네임을 정확히 입력해 주세요.');
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN은 숫자 4자리로 입력해 주세요.');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const pins = getMemberPins_();
    const duplicate = Object.keys(pins).find(function(name) {
      return name !== nickname && String(pins[name]) === pin;
    });
    if (duplicate) throw new Error('이미 다른 길드원이 사용 중인 PIN입니다.');

    const existed = Object.prototype.hasOwnProperty.call(pins, nickname);
    pins[nickname] = pin;
    PropertiesService.getScriptProperties()
      .setProperty(MEMBER_PINS_PROPERTY, JSON.stringify(pins));
    appendMemberLog_(existed ? 'PIN 변경' : '길드원 추가', nickname);
    return { ok: true, members: listMembers_() };
  } finally {
    lock.releaseLock();
  }
}

function deleteMemberPin_(nickname) {
  if (!nickname) throw new Error('삭제할 닉네임을 확인해 주세요.');
  if (nickname === ADMIN_NICKNAME) throw new Error('관리자 계정은 삭제할 수 없습니다.');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const pins = getMemberPins_();
    if (!Object.prototype.hasOwnProperty.call(pins, nickname)) {
      throw new Error('등록되지 않은 길드원입니다.');
    }
    const removedOwnershipCount = removeMemberOwnership_(nickname);
    delete pins[nickname];
    PropertiesService.getScriptProperties()
      .setProperty(MEMBER_PINS_PROPERTY, JSON.stringify(pins));
    appendMemberLog_('길드원 삭제 · 보유꽃 ' + removedOwnershipCount + '종 정리', nickname);
    SpreadsheetApp.flush();
    return { ok: true, members: listMembers_(), removedOwnershipCount: removedOwnershipCount };
  } finally {
    lock.releaseLock();
  }
}

function removeMemberOwnership_(nickname) {
  const sheet = getDataSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return 0;

  const ownerCol = findColumn_(values[0], ['보유자 닉네임', '보유자닉네임', '보유자']);
  if (ownerCol < 0) throw new Error('보유자 닉네임 열을 찾을 수 없습니다.');

  let removedCount = 0;
  const nextOwnerValues = [];
  for (let i = 1; i < values.length; i++) {
    const owners = parseOwners_(values[i][ownerCol]);
    const filtered = owners.filter(function(owner) { return owner !== nickname; });
    if (filtered.length !== owners.length) removedCount++;
    nextOwnerValues.push([filtered.join(', ')]);
  }
  if (nextOwnerValues.length) {
    sheet.getRange(2, ownerCol + 1, nextOwnerValues.length, 1).setValues(nextOwnerValues);
  }
  return removedCount;
}

function appendMemberLog_(action, nickname) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let log = ss.getSheetByName(MEMBER_LOG_SHEET_NAME);
  if (!log) {
    log = ss.insertSheet(MEMBER_LOG_SHEET_NAME);
    log.appendRow(['변경 시각', '작업', '닉네임']);
    log.setFrozenRows(1);
  }
  log.appendRow([new Date(), action, nickname]);
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
