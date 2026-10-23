const readiness = [
  ['飞机', 100, '✓', 'ready'], ['机组', 100, '✓', 'ready'],
  ['乘客', 78, '!', 'warning'], ['地面保障', 100, '✓', 'ready'],
  ['燃油', 100, '✓', 'ready'], ['许可', 62, '✕', 'blocking'],
  ['时刻', 100, '✓', 'ready'], ['文件', 75, '!', 'warning']
];

const tripLegs = [
  {
    dep:'ZBAA', depName:'北京首都 · PEK', depDate:'20 AUG', depIso:'2026-08-20', depLocal:'06:00', depUtc:'22:00', depBeijing:'06:00',
    arr:'RJTT', arrName:'东京羽田 · HND', arrDate:'20 AUG', arrIso:'2026-08-20', arrLocal:'10:20', arrUtc:'01:20', arrBeijing:'09:20',
    duration:'3H 20M', distance:'4,621 KM · IFR', taskType:'CHARTER', aircraft:'B-8263', movementState:'arrived', movementUpdatedAt:'10:33:04',
    estimatedDep:{ lt:'06:10', utc:'22:10', beijing:'06:10' }, estimatedArr:{ lt:'10:28', utc:'01:28', beijing:'09:28' },
    actualDep:{ lt:'06:08', utc:'22:08', beijing:'06:08' }, actualArr:{ lt:'10:31', utc:'01:31', beijing:'09:31' },
  },
  {
    dep:'ZSPD', depName:'东京羽田 · HND', depDate:'21 AUG', depIso:'2026-08-21', depLocal:'13:30', depUtc:'05:30', depBeijing:'13:30',
    arr:'ZGGG', arrName:'新加坡樟宜 · SIN', arrDate:'21 AUG', arrIso:'2026-08-21', arrLocal:'16:20', arrUtc:'08:20', arrBeijing:'16:20',
    duration:'7H 15M', distance:'5,315 KM · IFR', taskType:'PAX', aircraft:'B-9308', movementState:'planned', movementUpdatedAt:'10:32:18', heroStatus:'PLANNING', cardStatus:'准备中',
    estimatedDep:{ lt:'13:30', utc:'05:30', beijing:'13:30' }, estimatedArr:{ lt:'16:20', utc:'08:20', beijing:'16:20' },
    actualDep:null, actualArr:null,
  },
  {
    dep:'WSSS', depName:'新加坡樟宜 · SIN', depDate:'22 AUG', depIso:'2026-08-22', depLocal:'09:00', depUtc:'01:00', depBeijing:'09:00',
    arr:'ZBAA', arrName:'北京首都 · PEK', arrDate:'22 AUG', arrIso:'2026-08-22', arrLocal:'15:10', arrUtc:'07:10', arrBeijing:'15:10',
    duration:'6H 10M', distance:'4,460 KM · IFR', taskType:'FERRY', aircraft:'B-9811', movementState:'planned', movementUpdatedAt:'10:32:18',
    estimatedDep:{ lt:'09:00', utc:'01:00', beijing:'09:00' }, estimatedArr:{ lt:'15:10', utc:'07:10', beijing:'15:10' },
    actualDep:null, actualArr:null,
  }
];
let activeLeg = 1;
let timeBasis = 'lt';

const acarsRawMessages = {
  pos: { type: 'POS', title: '位置报告', receivedAt: '08:42Z', source: 'B-9308', status: '已接收', raw: `/B-9308\nPOS N2334.2 E11318.6\nTIME 0842Z\nALT FL410\nMACH M0.86\nHDG 312\nWIND 278/064KT\nNEXT ZGSZ\nETA 1040Z` },
  eta: { type: 'ETA', title: '预计到达时间更新', receivedAt: '08:28Z', source: 'B-9308', status: '已接收', raw: `/B-9308\nETA REPORT\nDEST ZGSZ\nETA 1040Z\nEFOB 4860KG\nALTN ZGGG\nSTATUS NORMAL` },
  wx: { type: 'WX', title: '目的地天气回传', receivedAt: '08:15Z', source: 'ACARS', status: '已接收', raw: `/ACARS\nATIS ZGSZ M\nTIME 0815Z\nWIND 180/06KT\nVIS 8KM\nCLOUD SCT020\nTEMP 29/24\nQNH 1008\nRWY 15` },
  fuel: { type: 'FUEL', title: '燃油状态报告', receivedAt: '08:03Z', source: 'B-9308', status: '已接收', raw: `/B-9308\nFUEL REPORT\nUTC 0803Z\nFOB 12400KG\nUSED 5950KG\nEFOB DEST 4860KG\nREMAINING NOMINAL` },
};

const aircraftProfiles = {
  'B-8263': { model: 'G450', parkingAirport: 'ZSSS', parkingTime: '2026-08-22 19:51' },
  'B-602M': { model: 'Legacy 650', parkingAirport: 'ZGSZ', parkingTime: '2026-08-22 10:40' },
  'B-9308': { model: 'G650ER', parkingAirport: 'ZSPD', parkingTime: '2026-08-21 16:20' },
  'B-9811': { model: 'G650ER', parkingAirport: 'ZBAA', parkingTime: '2026-08-22 17:10' },
  'B-801Q': { model: 'G650ER', parkingAirport: 'ZUUU', parkingTime: '2026-08-20 12:00' },
};

const airportProfiles = {
  RJTT: '东京羽田 · HND',
  VHHH: '香港国际 · HKG',
  WSSS: '新加坡樟宜 · SIN',
  ZBAA: '北京首都 · PEK',
  ZGGG: '广州白云 · CAN',
  ZGSZ: '深圳宝安 · SZX',
  ZSPD: '上海浦东 · PVG',
  ZSSS: '上海虹桥 · SHA',
  ZUUU: '成都双流 · CTU',
};

const detailParams = new URLSearchParams(window.location.search);
const isFormalDetail = detailParams.get('mode') === 'formal';
const detailTheme = detailParams.get('theme') === 'light' ? 'light' : 'dark';
document.documentElement.classList.toggle('light', detailTheme === 'light');
document.documentElement.classList.toggle('dark', detailTheme === 'dark');
if (!isFormalDetail) {
  [
    '#editFlightHead',
    '#editFlightSection',
    '#saveFuelRecords',
    '#addPermit',
    '#saveGroundService',
    '#openMealMenu',
    '#openPostflightLogDialog',
  ].forEach((selector) => {
    const button = document.querySelector(selector);
    if (!button || button.dataset.demoLabeled === 'true') return;
    button.dataset.demoLabeled = 'true';
    button.textContent = `${button.textContent.trim()}（演示，不保存）`;
    button.title = '此预览操作只修改当前浏览器演示数据，不会写入正式系统';
  });
}
const detailContent = document.querySelector('.workspace .content');
['flight', 'compliance', 'fuel', 'messages', 'crew', 'passengers', 'services', 'documents', 'billing', 'postflight']
  .forEach((id) => {
    const panel = document.getElementById(id);
    if (panel) detailContent?.append(panel);
  });
const billTemplateStorageKey = 'starjet-flight-bill-templates';
const baseBillTemplates = [
  { code: 'PAX', label: '客运包机', types: [
    { id: 1, name: '航油账单', owner: 'flight' }, { id: 2, name: '地面代理费', owner: 'flight' }, { id: 3, name: '机场费用', owner: 'flight' }, { id: 4, name: '餐食费用', owner: 'trip' }, { id: 5, name: '旅客服务费', owner: 'trip' },
  ] },
  { code: 'FERRY', label: '调机', types: [
    { id: 6, name: '航油账单', owner: 'flight' }, { id: 7, name: '地面代理费', owner: 'flight' }, { id: 8, name: '机场费用', owner: 'flight' },
  ] },
  { code: 'MX', label: '维修', types: [
    { id: 9, name: '维修航材费', owner: 'flight' }, { id: 10, name: '维修工时费', owner: 'flight' }, { id: 11, name: '停场费', owner: 'trip' },
  ] },
  { code: 'AOG', label: 'AOG', types: [
    { id: 12, name: '航材采购费', owner: 'flight' }, { id: 13, name: '紧急物流费', owner: 'flight' }, { id: 14, name: '维修服务费', owner: 'trip' },
  ] },
];
const billRouteScopes = [
  { label: '国内', value: 'domestic' },
  { label: '跨境', value: 'crossBorder' },
  { label: '国际', value: 'international' },
];
const defaultBillTemplates = baseBillTemplates.flatMap((template) => billRouteScopes.map((scope, scopeIndex) => ({
  ...template,
  scope: scope.value,
  scopeLabel: scope.label,
  types: template.types.map((item) => ({ ...item, id: item.id + scopeIndex * 100 })),
})));
const completedPaymentApplications = [
  { amount: '付款 CNY 28,600', billType: '地面代理费', flightType: 'PAX', id: 'FK-20260823-006', routeScope: 'domestic', title: '广州地面保障费用', updatedAt: '2026-08-24 11:08' },
  { amount: '付款 HKD 46,200', billType: '地面代理费', flightType: 'FERRY', id: 'FK-20260818-007', routeScope: 'crossBorder', title: '香港航段落地服务费用', updatedAt: '2026-08-21 10:02' },
];

function readBillTemplates() {
  try {
    const saved = JSON.parse(localStorage.getItem(billTemplateStorageKey) || 'null');
    if (!Array.isArray(saved) || !saved.some((item) => item?.code && Array.isArray(item.types))) return defaultBillTemplates;
    if (saved.every((item) => item.scope)) return saved;
    return saved.flatMap((template) => billRouteScopes.map((scope, scopeIndex) => ({
      ...template,
      scope: scope.value,
      scopeLabel: scope.label,
      types: template.types.map((item) => ({ ...item, id: item.id + scopeIndex * 100 })),
    })));
  } catch {
    return defaultBillTemplates;
  }
}

function normalizeBillFlightType(taskType) {
  const value = String(taskType || '').toUpperCase();
  if (['CHARTER', 'PAX', 'PASSENGER'].includes(value)) return 'PAX';
  if (['FERRY', 'MX', 'AOG'].includes(value)) return value;
  return 'PAX';
}

function resolveBillRouteScope(departure, arrival) {
  const airports = [departure, arrival].map((airport) => String(airport || '').toUpperCase());
  const isMainland = (airport) => /^Z[A-Z]{3}$/.test(airport);
  const isCrossBorder = (airport) => airport === 'VHHH' || airport === 'VMMC' || /^RC[A-Z]{2}$/.test(airport);
  if (airports.every(isMainland)) return 'domestic';
  if (airports.every((airport) => isMainland(airport) || isCrossBorder(airport)) && airports.some(isCrossBorder)) return 'crossBorder';
  return 'international';
}

function paymentApplicationHref(applicationId) {
  let routePrefix = '/preview';
  try {
    const parentPath = window.parent.location.pathname;
    routePrefix = parentPath.startsWith('/demo/') ? '/demo' : parentPath.startsWith('/preview/') ? '/preview' : '/finance';
  } catch { /* iframe may run independently */ }
  const base = routePrefix === '/finance' ? '/finance/payment-application' : `${routePrefix}/payment-application`;
  return `${base}?applicationId=${encodeURIComponent(applicationId)}`;
}

function renderBilling(leg) {
  const flightType = normalizeBillFlightType(leg?.taskType);
  const routeScope = resolveBillRouteScope(leg?.dep, leg?.arr);
  const scopeLabel = billRouteScopes.find((item) => item.value === routeScope)?.label || '国内';
  const templates = readBillTemplates();
  const template = templates.find((item) => item.code === flightType && item.scope === routeScope)
    || templates.find((item) => item.code === flightType)
    || defaultBillTemplates[0];
  const flightNo = detailParams.get('flightNo') || `航班 ${activeLeg + 1}`;
  const records = template.types.map((item, index) => {
    const payment = completedPaymentApplications.find((application) => application.flightType === flightType && application.routeScope === routeScope && application.billType === item.name);
    const state = payment ? 'paid' : index === 0 || index % 3 === 1 ? 'received' : 'missing';
    return { ...item, payment, state };
  });
  const counts = {
    missing: records.filter((item) => item.state === 'missing').length,
    paid: records.filter((item) => item.state === 'paid').length,
    received: records.filter((item) => item.state === 'received').length,
  };
  document.querySelector('#billingTemplateLabel').textContent = `${template.label} · ${scopeLabel} · ${flightNo}`;
  document.querySelector('#billingTotal').textContent = records.length;
  document.querySelector('#billingMissing').textContent = counts.missing;
  document.querySelector('#billingReceived').textContent = counts.received;
  document.querySelector('#billingPaid').textContent = counts.paid;
  const tabStatus = document.querySelector('#billingTabStatus');
  tabStatus.className = `tab-module-status ${counts.missing ? 'warning' : 'ready'}`;
  tabStatus.querySelector('span').textContent = counts.missing || records.length;
  tabStatus.setAttribute('aria-label', counts.missing ? `${counts.missing} 项账单待上传` : '账单已齐');
  tabStatus.title = tabStatus.getAttribute('aria-label');
  const table = document.querySelector('#billingTable');
  table.innerHTML = `<div class="billing-row billing-head"><span>账单类型</span><span>归属对象</span><span>账单状态</span><span>付款金额</span><span>财务联动</span><span>最近更新</span></div>${records.map((item) => {
    const stateLabel = item.state === 'paid' ? '已付款' : item.state === 'received' ? '已上传' : '待上传';
    const paymentAmount = item.payment ? escapeHtml(item.payment.amount.replace(/^付款\s*/, '')) : '—';
    const financeLink = item.payment
      ? `<a href="${paymentApplicationHref(item.payment.id)}" target="_top"><b>${escapeHtml(item.payment.id)}</b><small>${escapeHtml(item.payment.title)}</small></a>`
      : '<span class="billing-no-link">暂无付款申请</span>';
    const updatedAt = item.payment?.updatedAt || (item.state === 'received' ? '2026-08-27 09:18' : '—');
    return `<div class="billing-row"><span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(template.label)} · ${scopeLabel}预配置</small></span><span>${item.owner === 'trip' ? '行程' : '航班'}</span><span><em class="billing-state is-${item.state}"><i></i>${stateLabel}</em></span><span class="billing-amount">${paymentAmount}</span><span>${financeLink}</span><time>${updatedAt}</time></div>`;
  }).join('')}`;
}
const movementStateMeta = {
  planned: { label: '计划', code: '计划', summary: '航班按计划准备，尚未起飞' },
  departed: { label: '已起飞', code: '起飞', summary: '航班已离港，持续更新预计到达时间' },
  arrived: { label: '已到达', code: '到达', summary: '航班已到达，实际起降时间已记录' },
};
const movementStateAliases = { plan: 'planned', planning: 'planned', airborne: 'departed', inair: 'departed', landed: 'arrived' };
const timeLabel = value => value && value.length === 4 ? `${value.slice(0, 2)}:${value.slice(2)}` : value;
const dateLabel = value => {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return year && month && day ? `${String(day).padStart(2, '0')} ${months[month - 1]}` : value;
};

const todoStatusMeta = {
  completed: { label: '完成', className: 'completed' },
  pending: { label: '待处理', className: 'pending' },
  blocked: { label: '阻碍', className: 'blocked' },
};

const fallbackTodos = [
  { content: '机务窗口 已确认', status: 'completed' },
  { content: '加油不适用', status: 'completed' },
];

const defaultAnnouncements = [
  { author: '张园', content: '变更日期 8.23 → 8.22', createdAt: '8.20 18:17' },
  { author: '李悦', content: '时间提前一天至 8.21，21:41 起飞', createdAt: '8.20 21:41' },
];

const announcementKey = `starjet-flight-announcements:${detailParams.get('flightId') || 'default'}`;

function readAnnouncements() {
  try {
    const saved = JSON.parse(localStorage.getItem(announcementKey) || 'null');
    return Array.isArray(saved) ? saved : defaultAnnouncements;
  } catch {
    return defaultAnnouncements;
  }
}

let announcements = readAnnouncements();

function renderAnnouncements() {
  const list = document.querySelector('#announcementList');
  document.querySelector('#announcementCount').textContent = announcements.length;
  list.innerHTML = announcements.map((announcement) => `<article class="announcement-item">
    <p>${escapeHtml(announcement.content)}</p>
    <footer><span>${escapeHtml(announcement.author)}</span><time>${escapeHtml(announcement.createdAt)}</time></footer>
  </article>`).join('');
}

function formatAnnouncementTime(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}.${day} ${hours}:${minutes}`;
}

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function parseDetailTodos() {
  const encodedTodos = detailParams.get('todos');
  if (!encodedTodos) return fallbackTodos;
  try {
    const todos = JSON.parse(encodedTodos);
    if (!Array.isArray(todos)) return fallbackTodos;
    return todos
      .filter(todo => todo && typeof todo.content === 'string' && todoStatusMeta[todo.status])
      .map(todo => ({ content: todo.content.trim(), status: todo.status }))
      .filter(todo => todo.content);
  } catch {
    return fallbackTodos;
  }
}

let detailTodos = parseDetailTodos();

function renderDetailTodos() {
  document.querySelector('#todoCount').textContent = detailTodos.length;
  const list = document.querySelector('#detailTodoList');
  if (!detailTodos.length) {
    list.innerHTML = '<p class="todo-empty">当前航班暂无待办事项</p>';
    return;
  }
  list.innerHTML = detailTodos.map((todo, index) => `<article class="detail-todo">
      <input aria-label="待办内容" data-todo-content="${index}" value="${escapeHtml(todo.content)}" />
      <div class="detail-todo-status" role="radiogroup" aria-label="待办状态：${todoStatusMeta[todo.status].label}">
        ${Object.entries(todoStatusMeta).map(([value, status]) => `<button class="status-${status.className}${todo.status === value ? ' is-active' : ''}" data-todo-status="${value}" data-todo-index="${index}" type="button" role="radio" aria-checked="${todo.status === value}" aria-label="设为${status.label}" title="${status.label}"><i aria-hidden="true"></i></button>`).join('')}
      </div>
      <button class="detail-todo-delete" data-todo-delete="${index}" type="button" aria-label="删除待办：${escapeHtml(todo.content)}">×</button>
    </article>`).join('');
}

if (detailParams.get('from') && detailParams.get('to')) {
  const flightSequence = { 'FP-208': 0, 'FP-209': 1, 'FP-211': 2 };
  const selectedLegIndex = flightSequence[detailParams.get('flightId')] ?? 1;
  const selectedLeg = tripLegs[selectedLegIndex];
  activeLeg = selectedLegIndex;
  selectedLeg.dep = detailParams.get('from');
  selectedLeg.arr = detailParams.get('to');
  selectedLeg.depName = detailParams.get('fromName') || airportProfiles[selectedLeg.dep] || `${selectedLeg.dep} 机场`;
  selectedLeg.arrName = detailParams.get('toName') || airportProfiles[selectedLeg.arr] || `${selectedLeg.arr} 机场`;
  selectedLeg.depIso = detailParams.get('date') || selectedLeg.depIso;
  selectedLeg.arrIso = selectedLeg.depIso;
  selectedLeg.depDate = dateLabel(detailParams.get('date'));
  selectedLeg.arrDate = selectedLeg.depDate;
  selectedLeg.depLocal = timeLabel(detailParams.get('std'));
  selectedLeg.arrLocal = timeLabel(detailParams.get('sta'));
  selectedLeg.depUtc = selectedLeg.depLocal;
  selectedLeg.arrUtc = selectedLeg.arrLocal;
  selectedLeg.depBeijing = selectedLeg.depLocal;
  selectedLeg.arrBeijing = selectedLeg.arrLocal;
  const requestedState = detailParams.get('status')?.toLowerCase();
  selectedLeg.movementState = movementStateMeta[requestedState] ? requestedState : movementStateAliases[requestedState] || selectedLeg.movementState;
  selectedLeg.estimatedDep = {
    lt: timeLabel(detailParams.get('etd')) || selectedLeg.depLocal,
    utc: timeLabel(detailParams.get('etdUtc')) || selectedLeg.depUtc,
    beijing: timeLabel(detailParams.get('etdBeijing')) || selectedLeg.depBeijing,
  };
  selectedLeg.estimatedArr = {
    lt: timeLabel(detailParams.get('eta')) || selectedLeg.arrLocal,
    utc: timeLabel(detailParams.get('etaUtc')) || selectedLeg.arrUtc,
    beijing: timeLabel(detailParams.get('etaBeijing')) || selectedLeg.arrBeijing,
  };
  const actualDeparture = timeLabel(detailParams.get('atd'));
  const actualArrival = timeLabel(detailParams.get('ata'));
  if (actualDeparture) selectedLeg.actualDep = { lt: actualDeparture, utc: timeLabel(detailParams.get('atdUtc')) || actualDeparture, beijing: timeLabel(detailParams.get('atdBeijing')) || actualDeparture };
  if (actualArrival) selectedLeg.actualArr = { lt: actualArrival, utc: timeLabel(detailParams.get('ataUtc')) || actualArrival, beijing: timeLabel(detailParams.get('ataBeijing')) || actualArrival };

  const flightId = detailParams.get('flightId');
  const flightNo = detailParams.get('flightNo');
  const aircraft = detailParams.get('aircraft');
  const type = detailParams.get('type');
  if (type) selectedLeg.taskType = type.toUpperCase();
  if (aircraft && aircraftProfiles[aircraft]) selectedLeg.aircraft = aircraft;
  const activeLegCard = document.querySelector(`.leg-card[data-leg="${selectedLegIndex}"]`);
  if (activeLegCard) {
    activeLegCard.querySelector('b').textContent = `${selectedLeg.dep} → ${selectedLeg.arr}`;
    activeLegCard.querySelector('span').textContent = `${selectedLeg.depDate} · ${selectedLeg.depLocal}–${selectedLeg.arrLocal}`;
  }
  if (flightId) document.querySelector('.crumbs strong').textContent = flightId;
  if (flightNo) document.querySelector('#crumbLeg').textContent = flightNo;
  if (detailParams.get('tripId')) {
    const summary = document.querySelector('.trip-summary small');
    summary.textContent = summary.textContent.replace('TRIP-20260820-001', detailParams.get('tripId'));
  }
}

const flightEditKey = `starjet-flight-edits:${detailParams.get('flightId') || 'default'}`;
let savedFlightEdits = {};
try {
  savedFlightEdits = JSON.parse(localStorage.getItem(flightEditKey) || '{}') || {};
} catch {
  savedFlightEdits = {};
}
Object.entries(savedFlightEdits).forEach(([index, edit]) => {
  if (tripLegs[Number(index)] && edit && typeof edit === 'object') Object.assign(tripLegs[Number(index)], edit);
});

function renderAircraft(registration) {
  const profile = aircraftProfiles[registration] || aircraftProfiles['B-8263'];
  document.querySelector('#aircraftRegistration').textContent = registration;
  document.querySelector('#aircraftModel').textContent = profile.model;
  document.querySelectorAll('.aircraft-registration-value').forEach((element) => { element.textContent = registration; });
  document.querySelectorAll('.aircraft-model-value').forEach((element) => { element.textContent = profile.model; });
  document.querySelector('#aircraftParkingAirport').textContent = profile.parkingAirport;
  document.querySelector('#aircraftParkingTime').textContent = profile.parkingTime;
  document.querySelector('#aircraftDetailRegistration').textContent = registration;
  document.querySelector('#aircraftDetailModel').textContent = profile.model;
  document.querySelector('#overviewAircraft').textContent = `${registration} · ${profile.model}`;
  document.querySelector('#aircraftCurrentPosition').textContent = `${profile.parkingAirport} · ${airportProfiles[profile.parkingAirport] || '当前位置'}`;
  document.querySelector('#aircraftPositionTime').textContent = `定位时间 ${profile.parkingTime} BJ`;
  const nextLeg = tripLegs.slice(activeLeg + 1).find(leg => leg.aircraft === registration);
  const nextLegInfo = document.querySelector('#nextLegInfo');
  nextLegInfo.hidden = !nextLeg;
  if (nextLeg) {
    document.querySelector('#aircraftNextLeg').textContent = `${nextLeg.dep} → ${nextLeg.arr}`;
    document.querySelector('#aircraftNextLegTime').textContent = `${nextLeg.depDate} · ${nextLeg.depLocal}–${nextLeg.arrLocal} BJ`;
  }
}

function renderMovement(leg, depField, arrField, basisLabel) {
  const meta = movementStateMeta[leg.movementState] || movementStateMeta.planned;
  const basisKey = timeBasis === 'beijing' ? 'beijing' : timeBasis;
  const value = (timeSet, fallback = '—') => timeSet?.[basisKey] || fallback;
  const setTime = (selector, time, empty = false) => {
    const element = document.querySelector(selector);
    element.textContent = time === '—' ? time : `${time} ${basisLabel}`;
    element.classList.toggle('is-empty', empty || time === '—');
  };

  const status = document.querySelector('#movementStatus');
  status.className = `movement-status is-${leg.movementState || 'planned'}`;
  status.querySelector('span').textContent = leg.heroStatus || meta.label;
  document.querySelector('#movementSummary').textContent = meta.summary;
  document.querySelector('#movementUpdatedAt').textContent = `最后同步 ${leg.movementUpdatedAt || '刚刚'}`;
  const planeMark = document.querySelector('.plane-mark');
  if (planeMark) planeMark.textContent = meta.code;

  setTime('#scheduledDeparture', leg[depField]);
  setTime('#scheduledArrival', leg[arrField]);
  setTime('#estimatedDeparture', value(leg.estimatedDep, leg[depField]));
  setTime('#estimatedArrival', value(leg.estimatedArr, leg[arrField]));
  setTime('#actualDeparture', value(leg.actualDep), !leg.actualDep);
  setTime('#actualArrival', value(leg.actualArr), !leg.actualArr);
}

function renderMissionReadiness() {
  const canvas = document.querySelector('#missionReadinessCanvas');
  if (!canvas) return;
  const bounds = canvas.getBoundingClientRect();
  const size = Math.max(180, Math.min(bounds.width || 260, bounds.height || 260));
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(size * ratio);
  canvas.height = Math.round(size * ratio);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const context = canvas.getContext('2d');
  context.scale(ratio, ratio);
  context.clearRect(0, 0, size, size);
  const tokens = getComputedStyle(document.documentElement);
  const colors = {
    ready: tokens.getPropertyValue('--sj-lime').trim() || '#a3e635',
    warning: tokens.getPropertyValue('--sj-amber').trim() || '#f5b942',
    blocked: tokens.getPropertyValue('--sj-red').trim() || '#ff665c',
    empty: tokens.getPropertyValue('--sj-surface-3').trim() || '#151b26',
    inner: tokens.getPropertyValue('--sj-border').trim() || '#252d3d',
    surface: tokens.getPropertyValue('--sj-surface-1').trim() || '#0b0e14',
  };
  const center = size / 2;
  const radius = size * .405;
  const ringWidth = Math.max(13, size * .065);
  context.beginPath();
  context.arc(center, center, radius - ringWidth / 2, 0, Math.PI * 2);
  context.fillStyle = colors.surface;
  context.fill();
  context.lineWidth = ringWidth;
  context.lineCap = 'butt';
  context.beginPath();
  context.arc(center, center, radius, -Math.PI / 2, Math.PI * 1.5);
  context.strokeStyle = colors.empty;
  context.stroke();
  context.beginPath();
  context.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * .82);
  context.strokeStyle = colors.ready;
  context.stroke();
  context.beginPath();
  context.arc(center, center, radius - size * .105, 0, Math.PI * 2);
  context.lineWidth = 1;
  context.strokeStyle = colors.inner;
  context.stroke();
}

function updateMissionPhase(state) {
  const phases = [...document.querySelectorAll('.flight-phase-list li')];
  const activeIndex = state === 'arrived' ? phases.length - 1 : state === 'departed' ? 4 : 2;
  phases.forEach((phase, index) => {
    phase.classList.toggle('is-complete', index < activeIndex || state === 'arrived');
    phase.classList.toggle('is-current', index === activeIndex && state !== 'arrived');
    const stateLabel = phase.querySelector('em');
    if (stateLabel) stateLabel.textContent = index < activeIndex || state === 'arrived' ? '完成' : index === activeIndex ? '当前' : '待执行';
  });
}

function renderLeg(index) {
  activeLeg = index;
  const leg = tripLegs[index];
  document.querySelector('#depCode').textContent = leg.dep;
  document.querySelector('#depName').textContent = leg.depName;
  document.querySelector('#arrCode').textContent = leg.arr;
  document.querySelector('#arrName').textContent = leg.arrName;
  document.querySelector('#flightDuration').textContent = leg.duration;
  document.querySelector('#flightDistance').textContent = leg.distance;
  const taskTypeLabels = { CHARTER: '包机', FERRY: '调机', PAX: 'PAX', MX: '维修', AOG: '停场维修' };
  document.querySelector('.trip-type').textContent = taskTypeLabels[leg.taskType] || leg.taskType;
  document.querySelector('#flightTaskType').textContent = taskTypeLabels[leg.taskType] || leg.taskType;
  renderBilling(leg);
  document.querySelector('#timelineDepTime').textContent = leg.depLocal;
  document.querySelector('#timelineArrTime').textContent = leg.arrLocal;
  document.querySelector('#serviceDepartureAirport').textContent = leg.dep;
  document.querySelector('#serviceDepartureName').textContent = leg.depName.split(' · ')[0];
  document.querySelector('#serviceArrivalAirport').textContent = leg.arr;
  document.querySelector('#serviceArrivalName').textContent = leg.arrName.split(' · ')[0];
  renderAircraft(leg.aircraft);
  const timeFields = {
    beijing: ['depBeijing', 'arrBeijing', 'BJ'],
    lt: ['depLocal', 'arrLocal', 'LT'],
    utc: ['depUtc', 'arrUtc', 'UTC'],
  };
  const [depField, arrField, basisLabel] = timeFields[timeBasis];
  document.querySelector('#depTime').innerHTML = `<span>${leg.depDate} 2026</span><b>${leg[depField]} <small>${basisLabel}</small></b>`;
  document.querySelector('#arrTime').innerHTML = `<span>${leg.arrDate} 2026</span><b>${leg[arrField]} <small>${basisLabel}</small></b>`;
  renderMovement(leg, depField, arrField, basisLabel);
  updateMissionPhase(leg.movementState);
  document.querySelector('#crumbLeg').textContent = `航班 ${index + 1}`;
  document.querySelector('#legNumber').textContent = index + 1;
  document.querySelectorAll('.leg-card').forEach((card, cardIndex) => {
    const cardLeg = tripLegs[cardIndex];
    const cardMovement = movementStateMeta[cardLeg.movementState] || movementStateMeta.planned;
    card.querySelector('small').textContent = `航班 ${cardIndex + 1} · ${cardLeg.cardStatus || cardMovement.label}`;
    card.querySelector('b').textContent = `${cardLeg.dep} → ${cardLeg.arr}`;
    card.querySelector('span').textContent = `${cardLeg.depDate} · ${cardLeg.depLocal}–${cardLeg.arrLocal}`;
    card.classList.toggle('completed', cardLeg.movementState === 'arrived');
    card.classList.toggle('active', cardIndex === index);
    if (cardIndex === index) card.setAttribute('aria-current', 'true'); else card.removeAttribute('aria-current');
  });
  document.querySelector('#prevLeg').disabled = index === 0;
  document.querySelector('#nextLeg').disabled = index === tripLegs.length - 1;
}

document.querySelectorAll('.leg-card').forEach(card => card.addEventListener('click', () => renderLeg(Number(card.dataset.leg))));
document.querySelector('#prevLeg').addEventListener('click', () => renderLeg(activeLeg - 1));
document.querySelector('#nextLeg').addEventListener('click', () => renderLeg(activeLeg + 1));
document.querySelector('.back-btn').addEventListener('click', () => {
  if (window.parent !== window) window.parent.postMessage('flight-detail:back', window.location.origin);
  else window.location.assign('/operations/flights');
});

renderDetailTodos();
renderAnnouncements();

const detailTodoList = document.querySelector('#detailTodoList');
detailTodoList.addEventListener('input', event => {
  const input = event.target.closest('[data-todo-content]');
  if (!input) return;
  const index = Number(input.dataset.todoContent);
  if (detailTodos[index]) detailTodos[index].content = input.value;
});
detailTodoList.addEventListener('click', event => {
  const statusButton = event.target.closest('[data-todo-status]');
  if (statusButton) {
    const index = Number(statusButton.dataset.todoIndex);
    if (detailTodos[index] && todoStatusMeta[statusButton.dataset.todoStatus]) {
      detailTodos[index].status = statusButton.dataset.todoStatus;
      renderDetailTodos();
    }
    return;
  }
  const deleteButton = event.target.closest('[data-todo-delete]');
  if (!deleteButton) return;
  detailTodos.splice(Number(deleteButton.dataset.todoDelete), 1);
  renderDetailTodos();
});

const detailTodoInput = document.querySelector('#detailTodoInput');
const detailTodoComposer = document.querySelector('#detailTodoComposer');
const openTodoComposer = document.querySelector('#openTodoComposer');
const setTodoComposerOpen = open => {
  detailTodoComposer.hidden = !open;
  openTodoComposer.setAttribute('aria-expanded', String(open));
  openTodoComposer.textContent = open ? '收起' : '新增';
  if (open) detailTodoInput.focus();
};
const addDetailTodo = () => {
  const content = detailTodoInput.value.trim();
  if (!content) return;
  detailTodos.push({ content, status: 'pending' });
  detailTodoInput.value = '';
  renderDetailTodos();
  setTodoComposerOpen(false);
};
document.querySelector('#addDetailTodo').addEventListener('click', addDetailTodo);
openTodoComposer?.addEventListener('click', () => {
  setTodoComposerOpen(detailTodoComposer.hidden);
});
detailTodoInput.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    setTodoComposerOpen(false);
    openTodoComposer.focus();
    return;
  }
  if (event.key !== 'Enter' || event.shiftKey) return;
  event.preventDefault();
  addDetailTodo();
});

const announcementForm = document.querySelector('#announcementForm');
const addAnnouncementButton = document.querySelector('#addAnnouncement');
const setAnnouncementFormOpen = open => {
  announcementForm.hidden = !open;
  addAnnouncementButton.setAttribute('aria-expanded', String(open));
  addAnnouncementButton.textContent = open ? '收起' : '新增';
  if (open) document.querySelector('#announcementContent').focus();
};
addAnnouncementButton.addEventListener('click', () => {
  setAnnouncementFormOpen(announcementForm.hidden);
});
document.querySelector('#cancelAnnouncement').addEventListener('click', () => {
  setAnnouncementFormOpen(false);
  announcementForm.reset();
  document.querySelector('#announcementAuthor').value = '张园';
});
announcementForm.addEventListener('submit', event => {
  event.preventDefault();
  const content = document.querySelector('#announcementContent').value.trim();
  const author = document.querySelector('#announcementAuthor').value.trim();
  if (!content || !author) return;
  announcements.unshift({ author, content, createdAt: formatAnnouncementTime(new Date()) });
  localStorage.setItem(announcementKey, JSON.stringify(announcements));
  renderAnnouncements();
  setAnnouncementFormOpen(false);
  announcementForm.reset();
  document.querySelector('#announcementAuthor').value = author;
  showToast('航班公告已发布');
});

document.querySelector('#readinessList').innerHTML = readiness.map(([name, pct, icon, state]) =>
  `<div class="readiness-row ${state}"><b>${name}</b><span><i style="width:${pct}%"></i></span><em>${icon}</em></div>`
).join('');

let navigationTarget = '';

function setActiveTab(id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === id));
}

function switchTab(id) {
  navigationTarget = id;
  setActiveTab(id);
  const target = document.querySelector(`#${id}`);
  if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
  window.setTimeout(() => {
    setActiveTab(id);
  }, 700);
}

document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
document.querySelectorAll('[data-jump]').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.jump)));
document.querySelector('#missionPrimaryAction')?.addEventListener('click', () => {
  switchTab('compliance');
  showToast('已定位至许可与时刻核验');
});

const passengerDocumentTable = document.querySelector('.passenger-document-table');
const passengerDocumentOrderKey = 'starjet-flight-detail-passenger-document-order';
const getPassengerRowKey = row => row.querySelector('.passenger-primary')?.textContent.trim();

function updatePassengerDocumentCount() {
  const count = passengerDocumentTable?.querySelectorAll('[data-passenger-row]').length || 0;
  const countLabel = document.querySelector('#passengerDocumentCount');
  if (countLabel) countLabel.textContent = `${count} 人 · ${count} 份证件`;
}

function restorePassengerDocumentOrder() {
  const savedOrder = JSON.parse(localStorage.getItem(passengerDocumentOrderKey) || '[]');
  if (!Array.isArray(savedOrder) || !savedOrder.length) return;
  const rowsByKey = new Map([...passengerDocumentTable.querySelectorAll('[data-passenger-row]')].map(row => [getPassengerRowKey(row), row]));
  savedOrder.forEach(key => {
    const row = rowsByKey.get(key);
    if (row) passengerDocumentTable.append(row);
  });
}

function savePassengerDocumentOrder() {
  const order = [...passengerDocumentTable.querySelectorAll('[data-passenger-row]')].map(getPassengerRowKey);
  localStorage.setItem(passengerDocumentOrderKey, JSON.stringify(order));
}

function updatePassengerDocumentOrder() {
  const rows = [...passengerDocumentTable.querySelectorAll('[data-passenger-row]')];
  rows.forEach((row, index) => {
    row.querySelector('[data-passenger-sequence]').textContent = String(index + 1).padStart(2, '0');
    row.querySelector('[data-passenger-order]').textContent = String(index + 1);
    row.querySelector('[data-passenger-move="up"]').disabled = index === 0;
    row.querySelector('[data-passenger-move="down"]').disabled = index === rows.length - 1;
  });
  updatePassengerDocumentCount();
}

passengerDocumentTable?.addEventListener('click', event => {
  const button = event.target.closest('[data-passenger-move]');
  if (!button || button.disabled) return;
  const row = button.closest('[data-passenger-row]');
  if (button.dataset.passengerMove === 'up') {
    const previousRow = row.previousElementSibling;
    if (previousRow?.hasAttribute('data-passenger-row')) passengerDocumentTable.insertBefore(row, previousRow);
  } else {
    const nextRow = row.nextElementSibling;
    if (nextRow?.hasAttribute('data-passenger-row')) passengerDocumentTable.insertBefore(nextRow, row);
  }
  updatePassengerDocumentOrder();
  savePassengerDocumentOrder();
  button.focus();
  showToast('乘客证件排序已更新');
});

restorePassengerDocumentOrder();
updatePassengerDocumentOrder();

const sectionObserver = new IntersectionObserver(entries => {
  if (navigationTarget) return;
  const visibleSection = entries
    .filter(entry => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visibleSection) return;
  setActiveTab(visibleSection.target.id);
}, { rootMargin: '-74px 0px -58% 0px', threshold: [0.05, 0.2, 0.5] });

document.querySelectorAll('#dashboard, .tab-panel:not(.retired-overview)').forEach(panel => sectionObserver.observe(panel));

const resumeScrollTracking = () => { navigationTarget = ''; };
window.addEventListener('wheel', resumeScrollTracking, { passive: true });
window.addEventListener('touchstart', resumeScrollTracking, { passive: true });
window.addEventListener('keydown', event => {
  if (['ArrowDown', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp', ' '].includes(event.key)) resumeScrollTracking();
});

const timeToggle = document.querySelector('#timeToggle');
timeToggle.addEventListener('click', event => {
  const button = event.target.closest('[data-time-basis]');
  if (!button) return;
  timeBasis = button.dataset.timeBasis;
  timeToggle.querySelectorAll('[data-time-basis]').forEach(option => {
    const selected = option === button;
    option.classList.toggle('active', selected);
    option.setAttribute('aria-pressed', String(selected));
  });
  renderLeg(activeLeg);
});

renderLeg(activeLeg);
window.requestAnimationFrame(renderMissionReadiness);
window.addEventListener('resize', renderMissionReadiness, { passive: true });

const changeRecordList = document.querySelector('#changeRecordList');
const selectChangeRecord = (record, notify = false) => {
  if (!record) return;
  document.querySelectorAll('[data-change-record]').forEach(item => {
    const active = item === record;
    item.classList.toggle('active', active);
    const action = item.querySelector('[data-change-record-action]');
    action.setAttribute('aria-pressed', String(active));
    action.textContent = active ? '生效' : '设为生效';
  });
  if (notify) showToast('已更新当前生效的航班变更记录');
};
changeRecordList?.addEventListener('click', event => {
  const action = event.target.closest('[data-change-record-action]');
  if (action) selectChangeRecord(action.closest('[data-change-record]'), true);
});
const newestChangeRecord = [...(changeRecordList?.querySelectorAll('[data-change-record]') || [])]
  .sort((a, b) => new Date(b.dataset.recordTime) - new Date(a.dataset.recordTime))[0];
selectChangeRecord(newestChangeRecord);

document.querySelector('#passengerDocumentUpload')?.addEventListener('change', event => {
  const [file] = event.target.files;
  if (!file) return;
  const status = document.querySelector('#passengerOcrStatus');
  const candidateName = file.name.replace(/\.[^.]+$/, '').trim() || 'OCR CANDIDATE';
  const row = document.createElement('div');
  row.className = 'passenger-document-row is-ocr-candidate';
  row.setAttribute('role', 'row');
  row.setAttribute('data-passenger-row', '');
  row.innerHTML = `<span role="cell" data-passenger-sequence></span><span class="passenger-primary" role="cell">${escapeHtml(candidateName)}</span><span role="cell">待复核</span><span role="cell">待复核</span><span role="cell">待复核</span><span role="cell">待复核</span><span class="passenger-code" role="cell">—</span><span role="cell">待复核</span><span class="passenger-code" role="cell">待复核</span><span class="passenger-code" role="cell">待复核</span><span role="cell"><button class="passenger-attachment" type="button" data-uploaded-file="${escapeHtml(file.name)}">查看 1</button></span><span class="passenger-sort-cell" role="cell"><span data-passenger-order></span><span class="passenger-sort-actions"><button type="button" data-passenger-move="up" aria-label="上移 ${escapeHtml(candidateName)}">↑</button><button type="button" data-passenger-move="down" aria-label="下移 ${escapeHtml(candidateName)}">↓</button></span></span>`;
  passengerDocumentTable?.append(row);
  updatePassengerDocumentOrder();
  savePassengerDocumentOrder();
  status.hidden = false;
  status.innerHTML = `<b>${escapeHtml(file.name)}</b><span>模拟 OCR 识别完成，已新增为待复核候选。请补充并核对姓名、性别、出生日期、国籍、证件号码和失效日期；当前结果仅保留在本次预览中。</span>`;
  row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  showToast('识别候选已新增到乘客证件清单');
  event.target.value = '';
});

passengerDocumentTable?.addEventListener('click', event => {
  const attachment = event.target.closest('[data-uploaded-file]');
  if (attachment) showToast(`${attachment.dataset.uploadedFile} 为本次预览上传文件`);
});

const passengerDocumentComparison = document.querySelector('#passengerDocumentComparison');
if (passengerDocumentComparison) {
  passengerDocumentComparison.hidden = !passengerDocumentComparison.querySelector('.passenger-comparison-row:not(.passenger-comparison-head)');
}

const fuelInputs = ['#fuelBeforeDeparture', '#fuelAfterDeparture', '#fuelBeforeRefuel', '#fuelUplift']
  .map(selector => document.querySelector(selector));
const fuelTotalInputs = fuelInputs.slice(2);
const fuelUnit = document.querySelector('#fuelUnit');
const updateFuelTotal = () => {
  const total = fuelTotalInputs.reduce((sum, input) => sum + (Number(input?.value) || 0), 0);
  document.querySelector('#fuelAfterRefuel').textContent = total.toLocaleString('zh-CN');
};
fuelInputs.forEach(input => input?.addEventListener('input', updateFuelTotal));
fuelUnit?.addEventListener('change', event => {
  const nextUnit = event.target.value;
  const previousUnit = event.target.dataset.previousUnit || 'lb';
  const factor = previousUnit === nextUnit ? 1 : nextUnit === 'kg' ? 1 / 2.20462 : 2.20462;
  fuelInputs.forEach(input => {
    input.value = String(Math.round((Number(input.value) || 0) * factor));
    input.step = nextUnit === 'kg' ? '5' : '10';
  });
  document.querySelectorAll('.fuel-unit-label').forEach(label => { label.textContent = nextUnit; });
  event.target.dataset.previousUnit = nextUnit;
  updateFuelTotal();
  showToast(`油量单位已切换为 ${nextUnit}`);
});
if (fuelUnit) fuelUnit.dataset.previousUnit = fuelUnit.value;
document.querySelector('#saveFuelRecords')?.addEventListener('click', () => showToast(`关键节点油量记录已按 ${fuelUnit?.value || 'lb'} 保存`));

const permitTable = document.querySelector('#permitTable');
const applyPermitStatusColor = select => {
  if (select) select.dataset.status = select.value;
};
const updatePermitSummary = () => {
  const selects = [...permitTable.querySelectorAll('.permit-status')];
  selects.forEach(applyPermitStatusColor);
};
permitTable?.addEventListener('change', event => {
  if (event.target.matches('.permit-status')) {
    updatePermitSummary();
    showToast('许可状态已更新');
  }
  if (event.target.matches('.permit-type')) showToast('许可类型已更新');
});
permitTable?.addEventListener('click', event => {
  const confirmButton = event.target.closest('.permit-confirm');
  if (confirmButton) {
    const row = confirmButton.closest('.permit-row');
    const editableCells = [...row.querySelectorAll('[contenteditable="true"]')];
    const [descriptionCell] = editableCells;
    if (!descriptionCell.textContent.trim()) {
      descriptionCell.focus();
      showToast('请填写许可描述');
      return;
    }
    editableCells.forEach(cell => {
      if (!cell.textContent.trim()) cell.textContent = '—';
      cell.removeAttribute('contenteditable');
      cell.removeAttribute('data-placeholder');
    });
    row.classList.remove('is-editing');
    confirmButton.remove();
    updatePermitSummary();
    showToast('航前资源记录已确认');
    return;
  }
  const deleteButton = event.target.closest('.permit-delete');
  if (!deleteButton) return;
  deleteButton.closest('.permit-row')?.remove();
  updatePermitSummary();
  showToast('航前资源记录已删除');
});
document.querySelector('#addPermit')?.addEventListener('click', () => {
  const row = document.createElement('div');
  row.className = 'permit-row is-editing';
  row.innerHTML = '<select class="permit-type" aria-label="新许可类型"><option selected>Permit</option><option>Slot</option><option>PPR</option><option>Parking</option></select><span contenteditable="true" data-placeholder="填写许可描述"></span><select class="permit-status" aria-label="新许可状态"><option selected>待申请</option><option>处理中</option><option>已批准</option><option>不适用</option></select><div class="permit-actions"><button class="permit-confirm" type="button">确认</button><button class="permit-delete" type="button" aria-label="删除新许可">删除</button></div>';
  permitTable.append(row);
  updatePermitSummary();
  row.querySelector('[contenteditable]')?.focus();
});
updatePermitSummary();

const flightEditDialog = document.querySelector('#flightEditDialog');
const flightEditForm = document.querySelector('#flightEditForm');
const flightEditError = document.querySelector('#flightEditError');

function showFlightEditError(message = '') {
  flightEditError.textContent = message;
  flightEditError.hidden = !message;
}

function openFlightEdit() {
  const leg = tripLegs[activeLeg];
  document.querySelector('#editDeparture').value = leg.dep;
  document.querySelector('#editArrival').value = leg.arr;
  document.querySelector('#editDepartureDate').value = leg.depIso;
  document.querySelector('#editDepartureTime').value = leg.depLocal;
  document.querySelector('#editArrivalDate').value = leg.arrIso;
  document.querySelector('#editArrivalTime').value = leg.arrLocal;
  document.querySelector('#editTaskType').value = leg.taskType;
  document.querySelector('#editAircraft').value = leg.aircraft;
  showFlightEditError();
  flightEditDialog.showModal();
  document.querySelector('#editDeparture').focus();
}

function closeFlightEdit() {
  showFlightEditError();
  flightEditDialog.close();
}

function calculateDuration(departureDate, departureTime, arrivalDate, arrivalTime) {
  const departure = new Date(`${departureDate}T${departureTime}:00`);
  const arrival = new Date(`${arrivalDate}T${arrivalTime}:00`);
  const minutes = Math.round((arrival.getTime() - departure.getTime()) / 60000);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return `${Math.floor(minutes / 60)}H ${String(minutes % 60).padStart(2, '0')}M`;
}

flightEditForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!flightEditForm.reportValidity()) return;
  const departure = document.querySelector('#editDeparture').value.trim().toUpperCase();
  const arrival = document.querySelector('#editArrival').value.trim().toUpperCase();
  const departureDate = document.querySelector('#editDepartureDate').value;
  const departureTime = document.querySelector('#editDepartureTime').value;
  const arrivalDate = document.querySelector('#editArrivalDate').value;
  const arrivalTime = document.querySelector('#editArrivalTime').value;
  if (!/^[A-Z]{4}$/.test(departure) || !/^[A-Z]{4}$/.test(arrival)) {
    showFlightEditError('起降机场请输入四位 ICAO 代码');
    return;
  }
  if (departure === arrival) {
    showFlightEditError('起飞机场和到达机场不能相同');
    return;
  }
  const duration = calculateDuration(departureDate, departureTime, arrivalDate, arrivalTime);
  if (!duration) {
    showFlightEditError('到达日期时间必须晚于起飞日期时间');
    return;
  }
  const taskType = document.querySelector('#editTaskType').value;
  const aircraft = document.querySelector('#editAircraft').value;
  const leg = tripLegs[activeLeg];
  Object.assign(leg, {
    dep: departure,
    depName: airportProfiles[departure] || `${departure} 机场`,
    depDate: dateLabel(departureDate),
    depIso: departureDate,
    depLocal: departureTime,
    depUtc: departureTime,
    depBeijing: departureTime,
    arr: arrival,
    arrName: airportProfiles[arrival] || `${arrival} 机场`,
    arrDate: dateLabel(arrivalDate),
    arrIso: arrivalDate,
    arrLocal: arrivalTime,
    arrUtc: arrivalTime,
    arrBeijing: arrivalTime,
    duration,
    taskType,
    aircraft,
  });
  savedFlightEdits[activeLeg] = {
    dep: leg.dep, depName: leg.depName, depDate: leg.depDate, depIso: leg.depIso, depLocal: leg.depLocal, depUtc: leg.depUtc, depBeijing: leg.depBeijing,
    arr: leg.arr, arrName: leg.arrName, arrDate: leg.arrDate, arrIso: leg.arrIso, arrLocal: leg.arrLocal, arrUtc: leg.arrUtc, arrBeijing: leg.arrBeijing,
    duration: leg.duration, taskType: leg.taskType, aircraft: leg.aircraft,
  };
  localStorage.setItem(flightEditKey, JSON.stringify(savedFlightEdits));
  renderLeg(activeLeg);
  closeFlightEdit();
  showToast('航段信息已更新');
});

document.querySelectorAll('#editFlightHead, #editFlightSection').forEach(button => button.addEventListener('click', openFlightEdit));
document.querySelector('#closeFlightEdit').addEventListener('click', closeFlightEdit);
document.querySelector('#cancelFlightEdit').addEventListener('click', closeFlightEdit);
document.querySelectorAll('#editDeparture, #editArrival').forEach(input => input.addEventListener('input', () => {
  input.value = input.value.toUpperCase();
  showFlightEditError();
}));
const exportMaterials = {
  'flight-leg': '航段提取',
  'flight-assignment': '飞行任务书',
  'crew-information': '行程清单 - 机组 / 机组信息',
  'crew-airport-service': '行程清单 - 机组 / 机场服务',
  'crew-service-notice': '行程清单 - 机组 / 服务提示',
  'crew-permit-notice': '行程清单 - 机组 / 许可提示',
  'crew-passenger-information': '行程清单 - 机组 / 乘客信息',
  'crew-documents': '行程清单 - 机组 / 证件',
  'customer-crew-information': '行程清单 - 客户 / 机组信息',
  'customer-airport-service': '行程清单 - 客户 / 机场服务',
  'customer-passenger-information': '行程清单 - 客户 / 乘客信息',
  'general-declaration': '三关文件 / 总申报单（通用）',
  'domestic-general-declaration': '三关文件 / 总申报单（国内）',
  api: '三关文件 / API',
  'customs-crew-declaration': '三关文件 / 海关机组申报单',
  'employee-register': '三关文件 / 员工登记表',
  'passenger-register': '三关文件 / 旅客登记表',
  'security-check-form': '三关文件 / 安检单',
  'carried-items-list': '三关文件 / 携带物品清单',
};

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

const acarsRawDialog = document.querySelector('#acarsRawDialog');
const acarsRawContent = document.querySelector('#acarsRawContent');

function closeAcarsRawDialog() {
  acarsRawDialog?.close();
}

function openAcarsRawDialog(messageKey) {
  const message = acarsRawMessages[messageKey];
  if (!message || !acarsRawDialog) return;
  document.querySelector('#acarsRawType').textContent = `ACARS · ${message.type}`;
  document.querySelector('#acarsRawTitle').textContent = message.title;
  document.querySelector('#acarsRawReceivedAt').textContent = message.receivedAt;
  document.querySelector('#acarsRawSource').textContent = message.source;
  document.querySelector('#acarsRawStatus').textContent = message.status;
  acarsRawContent.textContent = message.raw;
  acarsRawDialog.showModal();
  acarsRawContent.focus();
}

document.querySelector('.acars-panel')?.addEventListener('click', event => {
  const button = event.target.closest('[data-acars-raw]');
  if (button) openAcarsRawDialog(button.dataset.acarsRaw);
});
document.querySelector('#closeAcarsRaw')?.addEventListener('click', closeAcarsRawDialog);
document.querySelector('#closeAcarsRawFooter')?.addEventListener('click', closeAcarsRawDialog);
acarsRawDialog?.addEventListener('click', event => {
  if (event.target === acarsRawDialog) closeAcarsRawDialog();
});
document.querySelector('#copyAcarsRaw')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(acarsRawContent.textContent);
    showToast('原始报文已复制');
  } catch {
    showToast('复制失败，请手动选择报文内容');
  }
});

const exportItemInputs = [...document.querySelectorAll('[data-export-item]')];
const selectedExportCount = document.querySelector('#selectedExportCount');
const exportSelectedButton = document.querySelector('[data-export-selected]');
const previewSelectedButton = document.querySelector('[data-preview-selected]');
const exportPreviewDialog = document.querySelector('#exportPreviewDialog');
const exportPreviewFileList = document.querySelector('#exportPreviewFileList');
const exportPreviewDocument = document.querySelector('#exportPreviewDocument');
const exportPreviewPdf = document.querySelector('#exportPreviewPdf');
const exportPreviewCurrent = document.querySelector('#exportPreviewCurrent');
let activeExportPreviewKey = '';

const exportSampleFiles = {
  'flight-assignment': { name: '飞行任务书.pdf', path: 'sample-files/flight-assignment.pdf' },
  'crew-information': { name: '机组行程单.pdf', path: 'sample-files/crew-trip-sheet.pdf' },
  'crew-airport-service': { name: '机组行程单.pdf', path: 'sample-files/crew-trip-sheet.pdf' },
  'crew-service-notice': { name: '机组行程单.pdf', path: 'sample-files/crew-trip-sheet.pdf' },
  'crew-permit-notice': { name: '机组行程单.pdf', path: 'sample-files/crew-trip-sheet.pdf' },
  'crew-passenger-information': { name: '机组行程单.pdf', path: 'sample-files/crew-trip-sheet.pdf' },
  'crew-documents': { name: '机组行程单.pdf', path: 'sample-files/crew-trip-sheet.pdf' },
  'customer-crew-information': { name: '客户行程单.pdf', path: 'sample-files/customer-trip-sheet.pdf' },
  'customer-airport-service': { name: '客户行程单.pdf', path: 'sample-files/customer-trip-sheet.pdf' },
  'customer-passenger-information': { name: '客户行程单.pdf', path: 'sample-files/customer-trip-sheet.pdf' },
  'general-declaration': { name: '三关文件.pdf', path: 'sample-files/ciq-documents.pdf' },
  'domestic-general-declaration': { name: '三关文件.pdf', path: 'sample-files/ciq-documents.pdf' },
  api: { name: '三关文件.pdf', path: 'sample-files/ciq-documents.pdf' },
  'customs-crew-declaration': { name: '三关文件.pdf', path: 'sample-files/ciq-documents.pdf' },
  'employee-register': { name: '三关文件.pdf', path: 'sample-files/ciq-documents.pdf' },
  'passenger-register': { name: '三关文件.pdf', path: 'sample-files/ciq-documents.pdf' },
  'security-check-form': { name: '三关文件.pdf', path: 'sample-files/ciq-documents.pdf' },
  'carried-items-list': { name: '三关文件.pdf', path: 'sample-files/ciq-documents.pdf' },
};

const exportPreviewSections = {
  'flight-leg': ['航段与航班基础信息', '计划起降时间', '机场与备降机场信息', '任务类型与飞行规则'],
  'flight-assignment': ['飞行任务信息', '飞机与机组配置', '计划航路与时刻', '签派与放行信息'],
  'crew-information': ['机组成员与岗位', '排班状态', '联系方式与执照状态'],
  'crew-airport-service': ['起飞站机场服务', '到达站机场服务', '地面代理联系方式'],
  'crew-service-notice': ['保障注意事项', '地面服务提示', '异常处置说明'],
  'crew-permit-notice': ['许可状态', '时刻状态', '待处理许可提醒'],
  'crew-passenger-information': ['乘客名单', '特殊服务需求', '登机确认状态'],
  'crew-documents': ['机组证件', '乘客证件', '证件有效期提示'],
  'customer-crew-information': ['当班机组姓名与岗位', '机组服务联系方式'],
  'customer-airport-service': ['起降机场信息', '接送机地点', '机场服务安排'],
  'customer-passenger-information': ['乘客名单', '行程时间', '特殊服务说明'],
  'general-declaration': ['航班与飞机信息', '机组名单', '旅客名单', '申报签章'],
  'domestic-general-declaration': ['国内航段信息', '机组与旅客信息', '申报签章'],
  api: ['旅客身份信息', '旅行证件信息', '航班行程信息'],
  'customs-crew-declaration': ['机组人员信息', '携带物品申报', '海关签章'],
  'employee-register': ['员工基本信息', '岗位与证件信息', '出入境记录'],
  'passenger-register': ['旅客基本信息', '证件与国籍信息', '行程记录'],
  'security-check-form': ['安检人员信息', '检查项目', '检查结果与签章'],
  'carried-items-list': ['携带物品明细', '数量与用途', '申报状态'],
};

function selectedExportItems() {
  return exportItemInputs.filter(input => input.checked).map(input => input.value);
}

function updateExportSelection() {
  const selected = selectedExportItems();
  selectedExportCount.textContent = selected.length;
  const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'pdf';
  exportSelectedButton.textContent = `导出 ${format === 'excel' ? 'Excel' : 'PDF'} · ${selected.length} 项`;
  exportSelectedButton.disabled = !selected.length;
  previewSelectedButton.disabled = !selected.length;
  document.querySelectorAll('[data-export-group]').forEach(groupInput => {
    const children = exportItemInputs.filter(input => input.dataset.group === groupInput.dataset.exportGroup);
    const selectedChildren = children.filter(input => input.checked).length;
    groupInput.checked = selectedChildren === children.length;
    groupInput.indeterminate = selectedChildren > 0 && selectedChildren < children.length;
    const count = groupInput.closest('.export-group-head')?.querySelector('[data-export-group-count]');
    if (count) count.textContent = `${selectedChildren} / ${children.length}`;
  });
}

function renderExportPreview(key) {
  const activeFlight = tripLegs[activeLeg];
  const sampleFile = exportSampleFiles[key];
  activeExportPreviewKey = key;
  exportPreviewDocument.hidden = Boolean(sampleFile);
  exportPreviewPdf.hidden = !sampleFile;
  exportPreviewCurrent.textContent = sampleFile ? '下载当前文件' : '导出当前文件';
  if (sampleFile) {
    exportPreviewPdf.src = `${sampleFile.path}#view=FitH&toolbar=1&navpanes=1`;
    document.querySelector('#exportPreviewTitle').textContent = sampleFile.name;
  } else {
    exportPreviewPdf.removeAttribute('src');
    document.querySelector('#exportPreviewTitle').textContent = '文件预览';
  }
  document.querySelector('#exportPreviewDocumentCode').textContent = key.toUpperCase().replaceAll('-', ' ');
  document.querySelector('#exportPreviewDocumentTitle').textContent = exportMaterials[key] || key;
  document.querySelector('#exportPreviewDocumentRoute').textContent = `${activeFlight.dep} → ${activeFlight.arr} · ${activeFlight.depLocal}–${activeFlight.arrLocal} LT`;
  document.querySelector('#exportPreviewDocumentDate').textContent = activeFlight.depDate;
  document.querySelector('#exportPreviewDocumentSections').innerHTML = (exportPreviewSections[key] || ['航班运行信息']).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  document.querySelector('#exportPreviewGeneratedAt').textContent = `预览生成于 ${new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short', hour12: false }).format(new Date())}`;
  exportPreviewFileList.querySelectorAll('button').forEach(button => {
    const active = button.dataset.previewExportFile === key;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-current', active ? 'true' : 'false');
  });
}

function openExportPreview() {
  const selected = selectedExportItems();
  if (!selected.length) return;
  document.querySelector('#exportPreviewCount').textContent = selected.length;
  exportPreviewFileList.innerHTML = selected.map((key, index) => `<button type="button" data-preview-export-file="${escapeHtml(key)}"><span>${String(index + 1).padStart(2, '0')}</span><b>${escapeHtml(exportMaterials[key])}</b></button>`).join('');
  renderExportPreview(selected[0]);
  exportPreviewDialog.showModal();
}

exportItemInputs.forEach(input => input.addEventListener('change', updateExportSelection));
document.querySelectorAll('[data-export-group]').forEach(groupInput => groupInput.addEventListener('change', () => {
  exportItemInputs.filter(input => input.dataset.group === groupInput.dataset.exportGroup).forEach(input => {
    input.checked = groupInput.checked;
  });
  updateExportSelection();
}));
document.querySelectorAll('[data-export-toggle]').forEach(button => button.addEventListener('click', () => {
  const items = document.querySelector(`[data-export-group-items="${button.dataset.exportToggle}"]`);
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  button.textContent = expanded ? '展开' : '收起';
  items.hidden = expanded;
}));
document.querySelector('[data-export-select-all]')?.addEventListener('click', () => {
  exportItemInputs.forEach(input => { input.checked = true; });
  updateExportSelection();
});
document.querySelector('[data-export-clear]')?.addEventListener('click', () => {
  exportItemInputs.forEach(input => { input.checked = false; });
  updateExportSelection();
});
document.querySelectorAll('input[name="exportFormat"]').forEach(input => input.addEventListener('change', updateExportSelection));
previewSelectedButton?.addEventListener('click', openExportPreview);
exportPreviewFileList?.addEventListener('click', event => {
  const button = event.target.closest('[data-preview-export-file]');
  if (button) renderExportPreview(button.dataset.previewExportFile);
});
function closeExportPreview() {
  exportPreviewDialog.close();
  exportPreviewPdf.removeAttribute('src');
}
document.querySelector('#closeExportPreview')?.addEventListener('click', closeExportPreview);
document.querySelector('#closeExportPreviewFooter')?.addEventListener('click', closeExportPreview);
exportPreviewDialog?.addEventListener('click', event => {
  if (event.target === exportPreviewDialog) closeExportPreview();
});
exportPreviewCurrent?.addEventListener('click', () => {
  const sampleFile = exportSampleFiles[activeExportPreviewKey];
  if (sampleFile) {
    const link = document.createElement('a');
    link.href = sampleFile.path;
    link.download = sampleFile.name;
    link.click();
    showToast(`${sampleFile.name}开始下载`);
    return;
  }
  const format = document.querySelector('input[name="exportFormat"]:checked')?.value === 'excel' ? 'Excel' : 'PDF';
  showToast(`${exportMaterials[activeExportPreviewKey]}已加入 ${format} 导出队列`);
});
exportSelectedButton?.addEventListener('click', () => {
  const selected = selectedExportItems();
  const format = document.querySelector('input[name="exportFormat"]:checked')?.value === 'excel' ? 'Excel' : 'PDF';
  showToast(`${selected.length} 项物料已加入 ${format} 导出队列`);
});
updateExportSelection();

const melAttachmentDialog = document.querySelector('#melAttachmentDialog');
document.querySelectorAll('[data-mel-attachment]').forEach((button) => button.addEventListener('click', () => {
  document.querySelector('#melAttachmentFile').textContent = `附件预览 · ${button.dataset.file}`;
  document.querySelector('#melAttachmentControlNo').textContent = `CTL No. ${button.dataset.controlNo}`;
  document.querySelector('#melAttachmentIssueDate').textContent = button.dataset.issueDate;
  document.querySelector('#melAttachmentDueDate').textContent = button.dataset.dueDate;
  melAttachmentDialog?.showModal();
}));
document.querySelector('#closeMelAttachment')?.addEventListener('click', () => melAttachmentDialog?.close());
melAttachmentDialog?.addEventListener('click', (event) => {
  if (event.target === melAttachmentDialog) melAttachmentDialog.close();
});
document.querySelector('#downloadMelAttachment')?.addEventListener('click', () => showToast('保留故障单附件已加入下载队列'));

const melPrintButton = document.querySelector('#printMelRecord');
const finishMelPrint = () => document.body.classList.remove('printing-mel');
melPrintButton?.addEventListener('click', () => {
  const now = new Date();
  document.querySelector('#melPrintedAt').textContent = new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(now);
  document.body.classList.add('printing-mel');
  window.setTimeout(() => window.print(), 80);
});
window.addEventListener('afterprint', finishMelPrint);

const postflightLogDialog = document.querySelector('#postflightLogDialog');
const postflightLogForm = document.querySelector('#postflightLogForm');
const postflightLogList = document.querySelector('#postflightLogList');
const postflightServiceProject = document.querySelector('#postflightServiceProject');
const postflightServiceCombobox = document.querySelector('#postflightServiceCombobox');
const postflightServiceProjectList = document.querySelector('#postflightServiceProjectList');
const postflightLogDescription = document.querySelector('#postflightLogDescription');
const postflightLogCharCount = document.querySelector('#postflightLogCharCount');
const postflightPendingAttachments = document.querySelector('#postflightPendingAttachments');
const postflightDraftKey = `starjet-postflight-logs:${detailParams.get('flightId') || 'default'}`;
const serviceEvaluationOptions = [
  ['local-handlers', '当地代理服务', 'Local Handlers Service'],
  ['crew-transport', '场外机组交通服务', 'Outside Transportation Service for Crew'],
  ['vip-vehicle', '场外车辆出入服务', 'Vehicles Entering the VIP Area'],
  ['vip-pax-crew', '乘客及机组贵宾服务', 'VIP Service for PAX and Crew'],
  ['vip-lounge', '贵宾室服务', 'VIP Lounge Service'],
  ['security-check', '安检通道及安检服务', 'Security Check Service'],
  ['ramp-transport', '场内摆渡服务', 'Ramp Transportation Service'],
  ['tow-vehicle', '拖车服务', 'Tow Vehicle Service'],
  ['aircraft-ramp', '一般勤务服务', 'Aircraft Ramp Service'],
  ['customs', '海关服务', 'Customs Services'],
  ['immigration', '边检服务', 'Immigration Services'],
  ['fuel', '航油服务', 'Fuel Services'],
  ['apron', '停机位安排', 'Apron Arrangement'],
  ['catering', '航食服务', 'Catering Service'],
  ['crew-hotel', '机组酒店安排', 'Crew Hotel Arrangement'],
  ['other', '其它服务', 'Other Service'],
];
const serviceRatingMeta = {
  good: { label: '好评', className: 'is-good' },
  neutral: { label: '中评', className: 'is-neutral' },
  bad: { label: '差评', className: 'is-bad' },
};
let postflightLogs = [];
let pendingPostflightAttachments = [];
let editingPostflightLogId = null;
let activePostflightServiceOption = -1;

try {
  const savedDraft = JSON.parse(localStorage.getItem(postflightDraftKey) || 'null');
  const savedLogs = savedDraft?.logs || savedDraft?.evaluations || [];
  postflightLogs = savedLogs.filter(item => item.code && item.rating).map((item, index) => ({
    id: item.id || `${Date.now()}-${index}`,
    code: item.code,
    rating: item.rating,
    description: item.description || savedDraft?.description || '',
    attachments: Array.isArray(item.attachments) ? item.attachments : [],
    creator: item.creator || '张园',
    createdAt: item.createdAt || new Date().toISOString(),
  }));
} catch { /* Ignore malformed local drafts. */ }

function serviceOption(code) {
  return serviceEvaluationOptions.find(item => item[0] === code) || [code, code, ''];
}

function matchingServiceOptions(query = '') {
  const keyword = query.trim().toLocaleLowerCase();
  if (!keyword) return serviceEvaluationOptions;
  return serviceEvaluationOptions.filter(([code, label, english]) => `${code} ${label} ${english}`.toLocaleLowerCase().includes(keyword));
}

function exactServiceOption(value) {
  const keyword = value.trim().toLocaleLowerCase();
  return serviceEvaluationOptions.find(([code, label, english]) => [code, label, english].some(item => item.toLocaleLowerCase() === keyword));
}

function setActivePostflightServiceOption(index) {
  const options = [...postflightServiceProjectList.querySelectorAll('[role="option"]')];
  if (!options.length) {
    activePostflightServiceOption = -1;
    return;
  }
  activePostflightServiceOption = Math.max(0, Math.min(index, options.length - 1));
  options.forEach((option, optionIndex) => {
    option.classList.toggle('is-active', optionIndex === activePostflightServiceOption);
    option.setAttribute('aria-selected', optionIndex === activePostflightServiceOption ? 'true' : 'false');
  });
  options[activePostflightServiceOption].scrollIntoView({ block: 'nearest' });
}

function renderPostflightServiceOptions(query = '') {
  const options = matchingServiceOptions(query);
  activePostflightServiceOption = -1;
  postflightServiceProjectList.innerHTML = options.length
    ? options.map(([code, label, english]) => `<button type="button" role="option" aria-selected="false" data-service-code="${escapeHtml(code)}"><b>${escapeHtml(label)}</b><small>${escapeHtml(english)}</small></button>`).join('')
    : '<span class="postflight-service-no-result">未找到匹配的服务项目</span>';
  postflightServiceProjectList.hidden = false;
  postflightServiceProject.setAttribute('aria-expanded', 'true');
}

function closePostflightServiceOptions() {
  postflightServiceProjectList.hidden = true;
  postflightServiceProject.setAttribute('aria-expanded', 'false');
  activePostflightServiceOption = -1;
}

function selectPostflightServiceOption(code) {
  const [, label] = serviceOption(code);
  postflightServiceProject.value = label;
  postflightServiceProject.dataset.code = code;
  postflightServiceProject.setCustomValidity('');
  closePostflightServiceOptions();
}

function formatEvaluationTime(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value)).replaceAll('/', '-');
}

function renderPostflightLogs() {
  if (!postflightLogList) return;
  postflightLogList.innerHTML = postflightLogs.length ? postflightLogs.map(item => {
    const [, label, english] = serviceOption(item.code);
    const rating = serviceRatingMeta[item.rating] || serviceRatingMeta.neutral;
    const attachmentMarkup = item.attachments.length
      ? `<span class="postflight-log-files">${item.attachments.map(attachment => `<span class="postflight-log-file"><b>${escapeHtml(attachmentType(attachment.name))}</b><span>${escapeHtml(attachment.name)}</span><small>${escapeHtml(attachment.size || '')}</small></span>`).join('')}</span>`
      : '<span class="postflight-log-no-data">—</span>';
    return `<article class="postflight-log-row" role="row" data-postflight-log-id="${escapeHtml(item.id)}"><span class="postflight-log-service" role="cell"><b>${escapeHtml(label)}</b><small>${escapeHtml(english)}</small></span><span class="postflight-log-rating" role="cell"><em class="${rating.className}">${rating.label}</em></span><span class="postflight-log-description${item.description ? '' : ' is-empty'}" role="cell">${item.description ? escapeHtml(item.description) : '未填写'}</span><span class="postflight-log-attachment-cell" role="cell">${attachmentMarkup}</span><span role="cell">${escapeHtml(item.creator)}</span><time role="cell">${escapeHtml(formatEvaluationTime(item.createdAt))}</time><span class="postflight-log-row-actions" role="cell"><button type="button" data-edit-postflight-log="${escapeHtml(item.id)}">编辑</button><button class="is-danger" type="button" data-delete-postflight-log="${escapeHtml(item.id)}">删除</button></span></article>`;
  }).join('') : '<div class="postflight-log-empty"><b>暂无航后日志</b><span>点击“新增”填写服务评价和航班执行记录</span></div>';
  const tabStatus = document.querySelector('#postflightTabStatus');
  if (tabStatus) {
    tabStatus.hidden = postflightLogs.length === 0;
    if (postflightLogs.length) {
      const statusLabel = `${postflightLogs.length} 条航后日志`;
      tabStatus.className = 'tab-module-status ready';
      tabStatus.setAttribute('aria-label', statusLabel);
      tabStatus.title = statusLabel;
      tabStatus.querySelector('span').textContent = `${postflightLogs.length}条`;
    } else {
      tabStatus.removeAttribute('aria-label');
      tabStatus.removeAttribute('title');
      tabStatus.querySelector('span').textContent = '';
    }
  }
}

function savePostflightLogs() {
  localStorage.setItem(postflightDraftKey, JSON.stringify({ logs: postflightLogs }));
}

function formatAttachmentSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function attachmentType(fileName) {
  const extension = fileName.split('.').pop()?.slice(0, 4).toUpperCase();
  return extension || 'FILE';
}

function renderPendingPostflightAttachments() {
  postflightPendingAttachments.innerHTML = pendingPostflightAttachments.map((file, index) => `<span><b>${escapeHtml(attachmentType(file.name))}</b>${escapeHtml(file.name)}<small>${escapeHtml(file.size)}</small><button type="button" data-remove-postflight-attachment="${index}" aria-label="删除 ${escapeHtml(file.name)}">×</button></span>`).join('');
}

function openPostflightDialog(log = null) {
  postflightLogForm.reset();
  editingPostflightLogId = log?.id || null;
  pendingPostflightAttachments = log?.attachments?.map(file => ({ ...file })) || [];
  renderPendingPostflightAttachments();
  postflightServiceProject.value = '';
  postflightServiceProject.dataset.code = '';
  if (log?.code) selectPostflightServiceOption(log.code);
  postflightLogDescription.value = log?.description || '';
  postflightLogCharCount.textContent = String(postflightLogDescription.value.length);
  const ratingInput = log ? postflightLogForm.querySelector(`input[name="postflightRating"][value="${log.rating}"]`) : null;
  if (ratingInput) ratingInput.checked = true;
  document.querySelector('#postflightDialogModeLabel').textContent = log ? '编辑记录' : '新增记录';
  document.querySelector('#savePostflightLog').textContent = log ? '保存修改' : '保存';
  postflightLogDialog.showModal();
  postflightServiceProject.focus();
}

function closePostflightDialog() {
  postflightLogDialog.close();
}

document.querySelector('#openPostflightLogDialog')?.addEventListener('click', () => openPostflightDialog());
document.querySelector('#closePostflightLogDialog')?.addEventListener('click', closePostflightDialog);
document.querySelector('#cancelPostflightLog')?.addEventListener('click', closePostflightDialog);
postflightServiceProject?.addEventListener('focus', () => renderPostflightServiceOptions(postflightServiceProject.value));
postflightServiceProject?.addEventListener('input', () => {
  postflightServiceProject.dataset.code = '';
  postflightServiceProject.setCustomValidity('');
  renderPostflightServiceOptions(postflightServiceProject.value);
});
postflightServiceProject?.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (postflightServiceProjectList.hidden) renderPostflightServiceOptions(postflightServiceProject.value);
    const options = [...postflightServiceProjectList.querySelectorAll('[role="option"]')];
    setActivePostflightServiceOption(event.key === 'ArrowDown' ? activePostflightServiceOption + 1 : activePostflightServiceOption < 0 ? options.length - 1 : activePostflightServiceOption - 1);
    return;
  }
  if (event.key === 'Enter' && !postflightServiceProjectList.hidden) {
    const option = postflightServiceProjectList.querySelectorAll('[role="option"]')[activePostflightServiceOption];
    if (option) {
      event.preventDefault();
      selectPostflightServiceOption(option.dataset.serviceCode);
    }
    return;
  }
  if (event.key === 'Escape' && !postflightServiceProjectList.hidden) {
    event.preventDefault();
    event.stopPropagation();
    closePostflightServiceOptions();
  }
});
document.querySelector('#togglePostflightServiceProject')?.addEventListener('click', () => {
  if (postflightServiceProjectList.hidden) renderPostflightServiceOptions('');
  else closePostflightServiceOptions();
  postflightServiceProject.focus();
});
postflightServiceProjectList?.addEventListener('mousedown', event => event.preventDefault());
postflightServiceProjectList?.addEventListener('click', event => {
  const option = event.target.closest('[data-service-code]');
  if (option) selectPostflightServiceOption(option.dataset.serviceCode);
});
postflightServiceCombobox?.addEventListener('focusout', () => window.setTimeout(() => {
  if (!postflightServiceCombobox.contains(document.activeElement)) closePostflightServiceOptions();
}, 0));
postflightLogDialog?.addEventListener('cancel', event => {
  event.preventDefault();
  closePostflightDialog();
});
postflightLogDescription?.addEventListener('input', () => {
  postflightLogCharCount.textContent = String(postflightLogDescription.value.length);
});
document.querySelector('#postflightLogAttachments')?.addEventListener('change', event => {
  pendingPostflightAttachments.push(...[...event.target.files].map(file => ({ name: file.name, size: formatAttachmentSize(file.size) })));
  renderPendingPostflightAttachments();
  event.target.value = '';
});
postflightPendingAttachments?.addEventListener('click', event => {
  const removeButton = event.target.closest('[data-remove-postflight-attachment]');
  if (!removeButton) return;
  pendingPostflightAttachments.splice(Number(removeButton.dataset.removePostflightAttachment), 1);
  renderPendingPostflightAttachments();
});
postflightLogList?.addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit-postflight-log]');
  if (editButton) {
    const log = postflightLogs.find(item => item.id === editButton.dataset.editPostflightLog);
    if (log) openPostflightDialog(log);
    return;
  }
  const deleteButton = event.target.closest('[data-delete-postflight-log]');
  if (!deleteButton) return;
  const log = postflightLogs.find(item => item.id === deleteButton.dataset.deletePostflightLog);
  if (!log) return;
  if (deleteButton.dataset.confirmed !== 'true') {
    deleteButton.dataset.confirmed = 'true';
    deleteButton.classList.add('is-confirming');
    deleteButton.textContent = '确认删除';
    window.setTimeout(() => {
      if (!deleteButton.isConnected) return;
      deleteButton.dataset.confirmed = 'false';
      deleteButton.classList.remove('is-confirming');
      deleteButton.textContent = '删除';
    }, 3000);
    return;
  }
  postflightLogs = postflightLogs.filter(item => item.id !== log.id);
  savePostflightLogs();
  renderPostflightLogs();
  showToast('航后日志已删除');
});
postflightLogForm?.addEventListener('submit', event => {
  event.preventDefault();
  const selectedService = serviceEvaluationOptions.find(([code]) => code === postflightServiceProject.dataset.code)
    || exactServiceOption(postflightServiceProject.value);
  if (!selectedService) {
    postflightServiceProject.setCustomValidity('请从下拉列表中选择服务项目');
    postflightServiceProject.reportValidity();
    postflightServiceProject.focus();
    return;
  }
  selectPostflightServiceOption(selectedService[0]);
  if (!postflightLogForm.reportValidity()) return;
  const rating = new FormData(postflightLogForm).get('postflightRating');
  const currentLog = postflightLogs.find(item => item.id === editingPostflightLogId);
  const nextLog = {
    id: currentLog?.id || `${Date.now()}`,
    code: selectedService[0],
    rating,
    description: postflightLogDescription.value.trim(),
    attachments: pendingPostflightAttachments.map(file => ({ ...file })),
    creator: currentLog?.creator || '张园',
    createdAt: currentLog?.createdAt || new Date().toISOString(),
  };
  if (currentLog) postflightLogs = postflightLogs.map(item => item.id === currentLog.id ? nextLog : item);
  else postflightLogs.unshift(nextLog);
  savePostflightLogs();
  renderPostflightLogs();
  closePostflightDialog();
  showToast(currentLog ? '航后日志已更新' : '航后日志已保存');
});

renderPostflightLogs();

document.querySelectorAll('.filters button').forEach(button => button.addEventListener('click', () => {
  button.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  button.classList.add('active');
}));

const groundServiceStorageKey = `starjet-ground-service:${detailParams.get('flightId') || 'default'}`;
const defaultGroundService = {
  dep: {
    location: { fbo: 1, name: '上海机场尚捷商务航空管理有限公司', addr: '上海市长宁区迎宾七路99号', phone: '', lon: '121.346571', lat: '31.186802', googleMaplink: '', routeMapImgList: [] },
    guarantors: [{ guarantorCompany: '', guarantorName: '曹一望 Evan', guarantorPhone: '15021608600' }],
  },
  arr: {
    location: { fbo: 1, name: 'Astana Aviation Services (Business Terminal)', addr: 'Qabanbay Batyr Ave, Astana 020000', phone: '', lon: '71.45279903085687', lat: '51.02315528959985', googleMaplink: 'https://maps.app.goo.gl/MzRrkRn2t1He3mXQA', routeMapImgList: ['https://cdn.rsscc.cn/huoli/huoli_image/huolijingxuan/2026-09/17/1676570.jpg?id=1676570&size=1080x1080'] },
    guarantors: [{ guarantorCompany: '', guarantorName: 'Aidar', guarantorPhone: '+77010720220' }],
  },
};
const defaultMealMenu = {
  count: 27,
  title: '餐单',
  status: '部分确认',
  menuDetail: [
    { category: { main: '西式早餐', sub: '早餐全餐' }, dishes: [
      { name: '传家宝番茄黄瓜鲜叶沙拉', desc: 'Heirloom Tomatoes, Cucumber and Fresh Leaves Salad' },
      { name: '烟熏三文鱼配牛油果酱', desc: 'Smoked Salmon & Avocado' },
      { name: '西式煎蛋卷', desc: 'Western Omelette' },
      { name: '鸡肉香肠、脆培根配黑豆', desc: 'Chicken Sausage, Crispy Bacon & Black Beans' },
      { name: '烤小番茄芦笋配薯饼', desc: 'Roasted Cherry Tomatoes and Asparagus & Hashbrown' },
      { name: '希腊酸奶配格兰诺拉麦片', desc: 'Greek Yogurt and Granola' },
      { name: '新鲜蓝莓、桑葚与草莓', desc: 'Fresh Blueberries, Mulberries & Strawberries' },
    ] },
    { category: { main: '晚餐：鸡汁黄鱼套餐', sub: '沙拉前菜' }, dishes: [{ name: '皇家奥西特拉鱼子酱及传统佐餐配料', desc: 'Royal Oscietra Caviar & Traditional Garnishes' }] },
    { category: { main: '晚餐：鸡汁黄鱼套餐', sub: '汤品' }, dishes: [{ name: '十年陈皮老鸭汤', desc: 'Duck Soup with Orange Skin' }] },
    { category: { main: '晚餐：鸡汁黄鱼套餐', sub: '主菜配菜' }, dishes: [
      { name: '云南火腿鸡汁蒸大黄鱼', desc: 'Steamed Grouper Fish with Ham & Soy Sauce' },
      { name: '鱼仔蜂窝生蚝', desc: 'Crispy Oyster' },
      { name: '黑蒜薄荷炒雪花牛小排', desc: 'Wok Fried Wagyu Beef Ribs with Garlic & Mint' },
      { name: '翡翠鸡纵菌', desc: 'Wok Fried Mushroom' },
      { name: '时令蔬菜', desc: 'Wok Fried Seasonal Vegetable' },
      { name: '米饭', desc: 'Steamed Rice' },
    ] },
    { category: { main: '晚餐：鸡汁黄鱼套餐', sub: '甜品' }, dishes: [
      { name: '天鹅酥', desc: 'Swan Shape Puff Pastry' },
      { name: '精美水果拼盘', desc: 'Assorted Fresh Sliced Fruits' },
    ] },
    { category: { main: '晚餐：小青龙套餐', sub: '沙拉前菜' }, dishes: [{ name: '皇家奥西特拉鱼子酱及传统佐餐配料', desc: 'Royal Oscietra Caviar & Traditional Garnishes' }] },
    { category: { main: '晚餐：小青龙套餐', sub: '汤品' }, dishes: [{ name: '松茸羊肚菌炖乳鸽', desc: 'Pigeon Soup with Mushroom' }] },
    { category: { main: '晚餐：小青龙套餐', sub: '主菜配菜' }, dishes: [
      { name: '古法家烧三年甲鱼', desc: 'Braised Shelled Turtle' },
      { name: '鲍汁扣二头鲜鲍', desc: 'Braised Abalone' },
      { name: '风范汁焗小青龙', desc: 'Baked Boston Lobster' },
      { name: '海鲜馄饨', desc: 'Seafood Wonton' },
      { name: '西芹炒九年百合', desc: 'Wok Fried Celery with Lily Bulb' },
      { name: '时令蔬菜', desc: 'Wok Fried Seasonal Vegetable' },
      { name: '米饭', desc: 'Steamed Rice' },
    ] },
    { category: { main: '晚餐：小青龙套餐', sub: '甜品' }, dishes: [{ name: '精美水果拼盘', desc: 'Assorted Fresh Sliced Fruits' }] },
  ],
};

function cloneData(value) { return JSON.parse(JSON.stringify(value)); }
function readGroundService() {
  try {
    const saved = JSON.parse(localStorage.getItem(groundServiceStorageKey) || 'null');
    return saved?.services?.dep && saved?.services?.arr && saved?.meal?.menuDetail ? saved : { services: cloneData(defaultGroundService), meal: cloneData(defaultMealMenu) };
  } catch { return { services: cloneData(defaultGroundService), meal: cloneData(defaultMealMenu) }; }
}
let groundServiceState = readGroundService();
let editingServiceStation = 'dep';

function saveGroundServiceState() { localStorage.setItem(groundServiceStorageKey, JSON.stringify(groundServiceState)); }
function safeHttpUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
function dishCount() { return groundServiceState.meal.menuDetail.reduce((total, group) => total + group.dishes.length, 0); }

function renderServiceLocation(station) {
  const location = groundServiceState.services[station].location;
  const target = document.querySelector(`#serviceLocation${station === 'dep' ? 'Dep' : 'Arr'}`);
  const mapLink = safeHttpUrl(location.googleMaplink);
  const routeMapLink = safeHttpUrl(location.routeMapImgList?.[0] || '');
  const phone = String(location.phone || '').trim();
  target.innerHTML = `<div class="service-location-name"><i aria-hidden="true"></i><b>${escapeHtml(location.name || '待配置地点')}</b></div><address>${escapeHtml(location.addr || '地址待补充')}</address><div class="service-location-meta"><span>${phone ? `电话 ${escapeHtml(phone)}` : '电话待补充'}</span><span>${escapeHtml(location.lat || '—')}, ${escapeHtml(location.lon || '—')}</span></div><div class="service-location-actions">${mapLink ? `<a href="${escapeHtml(mapLink)}" target="_blank" rel="noopener">打开地图</a>` : '<span>地图链接待补充</span>'}${routeMapLink ? `<a href="${escapeHtml(routeMapLink)}" target="_blank" rel="noopener">查看路线图（${location.routeMapImgList.length}）</a>` : `<span>路线图 ${location.routeMapImgList?.length || 0} 张</span>`}</div>`;
}

function renderGuarantors(station) {
  const target = document.querySelector(`#serviceGuarantor${station === 'dep' ? 'Dep' : 'Arr'}`);
  const guarantors = groundServiceState.services[station].guarantors;
  target.innerHTML = guarantors.length ? guarantors.map((person, index) => {
    const name = person.guarantorName?.trim() || '待填写';
    const phone = person.guarantorPhone?.trim() || '';
    const initials = [...name].slice(0, 2).join('');
    const phoneHref = phone ? `tel:${phone.replace(/[^+\d]/g, '')}` : '';
    return `<article class="guarantor-item"><span class="guarantor-avatar">${escapeHtml(initials)}</span><div><b>${escapeHtml(name)}</b><small>${escapeHtml(person.guarantorCompany?.trim() || '行程保障人')}</small></div><div class="guarantor-actions">${phoneHref ? `<a href="${escapeHtml(phoneHref)}">${escapeHtml(phone)}</a>` : '<span>电话待补充</span>'}<button type="button" data-remove-guarantor="${station}:${index}" aria-label="删除保障人 ${escapeHtml(name)}">×</button></div></article>`;
  }).join('') : '<div class="guarantor-empty">尚未配置行程保障人</div>';
}

function renderMealSummary() {
  const count = dishCount();
  groundServiceState.meal.count = count;
  document.querySelector('#mealDishCount').textContent = count;
  document.querySelector('#mealDishCountInline').textContent = count;
  document.querySelector('#mealDialogCount').textContent = count;
  document.querySelector('#mealStatus').value = groundServiceState.meal.status || '部分确认';
  const planMap = new Map();
  groundServiceState.meal.menuDetail.forEach(group => planMap.set(group.category.main, (planMap.get(group.category.main) || 0) + group.dishes.length));
  document.querySelector('#mealPlanStrip').innerHTML = [...planMap].map(([name, total]) => `<div class="meal-plan-chip"><b>${escapeHtml(name)}</b><span>${total} 道菜 · ${groundServiceState.meal.status}</span></div>`).join('');
}

function renderGroundService() {
  ['dep', 'arr'].forEach(station => { renderServiceLocation(station); renderGuarantors(station); });
  document.querySelector('#serviceLocationCount').textContent = ['dep', 'arr'].filter(station => groundServiceState.services[station].location?.name).length;
  document.querySelector('#serviceGuarantorCount').textContent = ['dep', 'arr'].reduce((total, station) => total + groundServiceState.services[station].guarantors.length, 0);
  renderMealSummary();
}

function renderGuarantorEditor() {
  const target = document.querySelector('#serviceGuarantorEditor');
  target.innerHTML = groundServiceState.services[editingServiceStation].guarantors.map((person, index) => `<div class="guarantor-editor-row" data-guarantor-index="${index}"><input value="${escapeHtml(person.guarantorName)}" placeholder="姓名" aria-label="保障人姓名"><input value="${escapeHtml(person.guarantorCompany)}" placeholder="公司（可选）" aria-label="保障人公司"><input value="${escapeHtml(person.guarantorPhone)}" placeholder="联系电话" aria-label="保障人电话"><button type="button" data-remove-guarantor-row="${index}" aria-label="删除该保障人">×</button></div>`).join('');
}

function openGroundServiceDialog(station, addGuarantor = false) {
  editingServiceStation = station;
  const service = groundServiceState.services[station];
  document.querySelector('#groundServiceDialogStation').textContent = station === 'dep' ? 'DEP · 起飞站' : 'ARR · 到达站';
  document.querySelector('#serviceLocationNameInput').value = service.location.name || '';
  document.querySelector('#serviceLocationAddressInput').value = service.location.addr || '';
  document.querySelector('#serviceLocationPhoneInput').value = service.location.phone || '';
  document.querySelector('#serviceLocationMapInput').value = service.location.googleMaplink || '';
  document.querySelector('#serviceLocationLonInput').value = service.location.lon || '';
  document.querySelector('#serviceLocationLatInput').value = service.location.lat || '';
  document.querySelector('#serviceLocationImagesInput').value = (service.location.routeMapImgList || []).join('\n');
  if (addGuarantor) service.guarantors.push({ guarantorCompany: '', guarantorName: '', guarantorPhone: '' });
  renderGuarantorEditor();
  document.querySelector('#groundServiceDialog').showModal();
  if (addGuarantor) document.querySelector('#serviceGuarantorEditor .guarantor-editor-row:last-child input')?.focus();
}

function readGuarantorEditor() {
  return [...document.querySelectorAll('#serviceGuarantorEditor .guarantor-editor-row')].map(row => {
    const [name, company, phone] = row.querySelectorAll('input');
    return { guarantorName: name.value.trim(), guarantorCompany: company.value.trim(), guarantorPhone: phone.value.trim() };
  }).filter(person => person.guarantorName || person.guarantorPhone || person.guarantorCompany);
}

document.querySelectorAll('[data-add-guarantor]').forEach(button => button.addEventListener('click', () => openGroundServiceDialog(button.dataset.addGuarantor, true)));
function cancelGroundServiceEdit() { groundServiceState = readGroundService(); renderGroundService(); document.querySelector('#groundServiceDialog').close(); }
document.querySelector('#closeGroundService')?.addEventListener('click', cancelGroundServiceEdit);
document.querySelector('#cancelGroundService')?.addEventListener('click', cancelGroundServiceEdit);
document.querySelector('#addGuarantorRow')?.addEventListener('click', () => {
  groundServiceState.services[editingServiceStation].guarantors = readGuarantorEditor();
  groundServiceState.services[editingServiceStation].guarantors.push({ guarantorCompany: '', guarantorName: '', guarantorPhone: '' });
  renderGuarantorEditor();
  document.querySelector('#serviceGuarantorEditor .guarantor-editor-row:last-child input')?.focus();
});
document.querySelector('#serviceGuarantorEditor')?.addEventListener('click', event => {
  const button = event.target.closest('[data-remove-guarantor-row]');
  if (!button) return;
  groundServiceState.services[editingServiceStation].guarantors = readGuarantorEditor();
  groundServiceState.services[editingServiceStation].guarantors.splice(Number(button.dataset.removeGuarantorRow), 1);
  renderGuarantorEditor();
});
document.querySelector('#groundServiceForm')?.addEventListener('submit', event => {
  event.preventDefault();
  const service = groundServiceState.services[editingServiceStation];
  service.location = {
    fbo: 1,
    name: document.querySelector('#serviceLocationNameInput').value.trim(),
    addr: document.querySelector('#serviceLocationAddressInput').value.trim(),
    phone: document.querySelector('#serviceLocationPhoneInput').value.trim(),
    googleMaplink: document.querySelector('#serviceLocationMapInput').value.trim(),
    lon: document.querySelector('#serviceLocationLonInput').value.trim(),
    lat: document.querySelector('#serviceLocationLatInput').value.trim(),
    routeMapImgList: document.querySelector('#serviceLocationImagesInput').value.split('\n').map(value => value.trim()).filter(Boolean),
  };
  service.guarantors = readGuarantorEditor();
  saveGroundServiceState();
  renderGroundService();
  document.querySelector('#groundServiceDialog').close();
  showToast('保障信息已保存');
});
document.querySelector('.service-workbench')?.addEventListener('click', event => {
  const button = event.target.closest('[data-remove-guarantor]');
  if (!button) return;
  const [station, index] = button.dataset.removeGuarantor.split(':');
  groundServiceState.services[station].guarantors.splice(Number(index), 1);
  saveGroundServiceState();
  renderGuarantors(station);
  showToast('保障人已移除');
});
document.querySelector('#saveGroundService')?.addEventListener('click', () => { saveGroundServiceState(); showToast('地面保障配置已保存'); });

let mealEditorTree = [];
const collapsedMealMenus = new Set();
const collapsedMealGroups = new Set();
let draggedMealDish = null;
let draggedMealMenu = null;
let draggedMealGroup = null;

function buildMealEditorTree() {
  const menus = new Map();
  groundServiceState.meal.menuDetail.forEach(group => {
    const menuName = group.category.main || '未命名餐单';
    if (!menus.has(menuName)) menus.set(menuName, { name: menuName, groups: [] });
    menus.get(menuName).groups.push({ name: group.category.sub || '未命名分组', dishes: cloneData(group.dishes) });
  });
  return [...menus.values()];
}

function mealEditorDishCount() {
  return mealEditorTree.reduce((menuTotal, menu) => menuTotal + menu.groups.reduce((groupTotal, group) => groupTotal + group.dishes.length, 0), 0);
}

function renderMealMenuEditor() {
  const count = mealEditorDishCount();
  document.querySelector('#mealDialogCount').textContent = count;
  document.querySelector('#mealMenuEditor').innerHTML = mealEditorTree.map((menu, menuIndex) => {
    const menuCollapsed = collapsedMealMenus.has(menuIndex);
    const menuCount = menu.groups.reduce((total, group) => total + group.dishes.length, 0);
    const groups = menu.groups.map((group, groupIndex) => {
      const groupKey = `${menuIndex}:${groupIndex}`;
      const collapsed = collapsedMealGroups.has(groupKey);
      const dishes = group.dishes.map((dish, dishIndex) => `<div class="meal-dish-editor" data-dish-index="${dishIndex}"><span class="meal-tree-rail" aria-hidden="true"></span><span class="meal-drag-handle" draggable="true" data-drag-dish="${menuIndex}:${groupIndex}:${dishIndex}" role="button" tabindex="0" aria-label="拖动菜品 ${escapeHtml(dish.name || `第 ${dishIndex + 1} 项`)} 调整顺序" title="拖动调整顺序">⋮⋮</span><span class="meal-dish-order">${String(dishIndex + 1).padStart(2, '0')}</span><input value="${escapeHtml(dish.name)}" data-dish-field="name" placeholder="中文菜名" aria-label="中文菜名"><input value="${escapeHtml(dish.desc)}" data-dish-field="desc" placeholder="英文说明" aria-label="英文说明"><button type="button" data-remove-meal-dish="${menuIndex}:${groupIndex}:${dishIndex}" aria-label="删除菜品 ${escapeHtml(dish.name)}">×</button></div>`).join('');
      return `<section class="meal-category-editor${collapsed ? ' is-collapsed' : ''}" data-group-index="${groupIndex}"><div class="meal-category-head"><span class="meal-level-drag-handle" draggable="true" data-drag-group="${menuIndex}:${groupIndex}" role="button" tabindex="0" aria-label="拖动分组 ${escapeHtml(group.name || `分组 ${groupIndex + 1}`)} 调整顺序" title="拖动调整分组顺序">⋮⋮</span><button class="meal-tree-toggle" type="button" data-toggle-meal-group="${menuIndex}:${groupIndex}" aria-expanded="${!collapsed}" aria-label="${collapsed ? '展开' : '折叠'}分组 ${escapeHtml(group.name || `分组 ${groupIndex + 1}`)}"><span aria-hidden="true">›</span></button><span class="meal-group-order">${String(groupIndex + 1).padStart(2, '0')}</span><input value="${escapeHtml(group.name)}" data-group-name aria-label="分组名称"><span class="meal-group-count">${group.dishes.length} 道菜</span><button class="meal-category-delete" type="button" data-remove-meal-group="${menuIndex}:${groupIndex}">删除分组</button></div><div class="meal-category-body"${collapsed ? ' hidden' : ''}><div class="meal-dish-list" data-drop-group="${menuIndex}:${groupIndex}">${dishes || '<div class="meal-dish-empty">暂无菜品，可点击下方按钮添加或将菜品拖入此分组</div>'}</div><button class="add-meal-dish" type="button" data-add-meal-dish="${menuIndex}:${groupIndex}">+ 添加菜品</button></div></section>`;
    }).join('');
    return `<section class="meal-tree-root${menuCollapsed ? ' is-collapsed' : ''}" data-menu-index="${menuIndex}"><div class="meal-tree-root-head"><span class="meal-level-drag-handle" draggable="true" data-drag-menu="${menuIndex}" role="button" tabindex="0" aria-label="拖动餐单 ${escapeHtml(menu.name)} 调整顺序" title="拖动调整餐单顺序">⋮⋮</span><button class="meal-tree-toggle" type="button" data-toggle-meal-menu="${menuIndex}" aria-expanded="${!menuCollapsed}" aria-label="${menuCollapsed ? '展开' : '折叠'}餐单 ${escapeHtml(menu.name)}"><span aria-hidden="true">›</span></button><span class="meal-menu-order">${String(menuIndex + 1).padStart(2, '0')}</span><input value="${escapeHtml(menu.name)}" data-menu-name aria-label="餐单名称"><span class="meal-menu-count">${menu.groups.length} 个分组 · ${menuCount} 道菜</span><button type="button" data-add-meal-group="${menuIndex}">+ 新增分组</button><button class="meal-menu-delete" type="button" data-remove-meal-menu="${menuIndex}">删除餐单</button></div><div class="meal-tree-groups" data-drop-menu="${menuIndex}"${menuCollapsed ? ' hidden' : ''}>${groups || '<div class="meal-tree-empty">暂无分组，请新增分组</div>'}</div></section>`;
  }).join('') || '<div class="meal-tree-empty">暂无餐单，请点击“新增餐单”创建</div>';
}

function syncMealEditorState() {
  [...document.querySelectorAll('.meal-tree-root[data-menu-index]')].forEach(menuNode => {
    const menuIndex = Number(menuNode.dataset.menuIndex);
    const menu = mealEditorTree[menuIndex];
    if (!menu) return;
    menu.name = menuNode.querySelector('[data-menu-name]').value.trim();
    [...menuNode.querySelectorAll('.meal-category-editor')].forEach(groupNode => {
      const groupIndex = Number(groupNode.dataset.groupIndex);
      const group = menu.groups[groupIndex];
      if (!group) return;
      group.name = groupNode.querySelector('[data-group-name]').value.trim();
      group.dishes = [...groupNode.querySelectorAll('.meal-dish-editor')].map(dishNode => ({ name: dishNode.querySelector('[data-dish-field="name"]').value.trim(), desc: dishNode.querySelector('[data-dish-field="desc"]').value.trim() }));
    });
  });
}

document.querySelector('#openMealMenu')?.addEventListener('click', () => { mealEditorTree = buildMealEditorTree(); collapsedMealMenus.clear(); collapsedMealGroups.clear(); renderMealMenuEditor(); document.querySelector('#mealMenuDialog').showModal(); });
function cancelMealMenuEdit() { groundServiceState = readGroundService(); renderGroundService(); document.querySelector('#mealMenuDialog').close(); }
document.querySelector('#closeMealMenu')?.addEventListener('click', cancelMealMenuEdit);
document.querySelector('#cancelMealMenu')?.addEventListener('click', cancelMealMenuEdit);
document.querySelector('#addMealMenu')?.addEventListener('click', () => {
  syncMealEditorState();
  mealEditorTree.push({ name: '新增餐单', groups: [{ name: '新增分组', dishes: [] }] });
  collapsedMealMenus.delete(mealEditorTree.length - 1);
  renderMealMenuEditor();
  document.querySelector('#mealMenuEditor .meal-tree-root:last-child [data-menu-name]')?.focus();
});
document.querySelector('#mealMenuEditor')?.addEventListener('click', event => {
  const toggleMenu = event.target.closest('[data-toggle-meal-menu]');
  const toggleGroup = event.target.closest('[data-toggle-meal-group]');
  const addGroup = event.target.closest('[data-add-meal-group]');
  const addDish = event.target.closest('[data-add-meal-dish]');
  const removeDish = event.target.closest('[data-remove-meal-dish]');
  const removeGroup = event.target.closest('[data-remove-meal-group]');
  const removeMenu = event.target.closest('[data-remove-meal-menu]');
  syncMealEditorState();
  if (toggleMenu) {
    const menuIndex = Number(toggleMenu.dataset.toggleMealMenu);
    if (collapsedMealMenus.has(menuIndex)) collapsedMealMenus.delete(menuIndex);
    else collapsedMealMenus.add(menuIndex);
  }
  if (toggleGroup) {
    const groupKey = toggleGroup.dataset.toggleMealGroup;
    if (collapsedMealGroups.has(groupKey)) collapsedMealGroups.delete(groupKey);
    else collapsedMealGroups.add(groupKey);
  }
  if (addGroup) {
    const menuIndex = Number(addGroup.dataset.addMealGroup);
    mealEditorTree[menuIndex].groups.push({ name: '新增分组', dishes: [] });
    collapsedMealMenus.delete(menuIndex);
  }
  if (addDish) {
    const [menuIndex, groupIndex] = addDish.dataset.addMealDish.split(':').map(Number);
    mealEditorTree[menuIndex].groups[groupIndex].dishes.push({ name: '', desc: '' });
    collapsedMealMenus.delete(menuIndex);
    collapsedMealGroups.delete(`${menuIndex}:${groupIndex}`);
  }
  if (removeDish) { const [menuIndex, groupIndex, dishIndex] = removeDish.dataset.removeMealDish.split(':').map(Number); mealEditorTree[menuIndex].groups[groupIndex].dishes.splice(dishIndex, 1); }
  if (removeGroup) { const [menuIndex, groupIndex] = removeGroup.dataset.removeMealGroup.split(':').map(Number); mealEditorTree[menuIndex].groups.splice(groupIndex, 1); collapsedMealGroups.clear(); }
  if (removeMenu) { mealEditorTree.splice(Number(removeMenu.dataset.removeMealMenu), 1); collapsedMealMenus.clear(); collapsedMealGroups.clear(); }
  if (toggleMenu || toggleGroup || addGroup || addDish || removeDish || removeGroup || removeMenu) renderMealMenuEditor();
});

function clearMealDropIndicators() {
  document.querySelectorAll('.is-drop-before,.is-drop-after,.is-drop-target').forEach(node => node.classList.remove('is-drop-before', 'is-drop-after', 'is-drop-target'));
}

document.querySelector('#mealMenuEditor')?.addEventListener('dragstart', event => {
  const menuHandle = event.target.closest('[data-drag-menu]');
  const groupHandle = event.target.closest('[data-drag-group]');
  const handle = event.target.closest('[data-drag-dish]');
  if (menuHandle) {
    syncMealEditorState();
    draggedMealMenu = Number(menuHandle.dataset.dragMenu);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `menu:${draggedMealMenu}`);
    menuHandle.closest('.meal-tree-root')?.classList.add('is-dragging');
    return;
  }
  if (groupHandle) {
    syncMealEditorState();
    const [menuIndex, groupIndex] = groupHandle.dataset.dragGroup.split(':').map(Number);
    draggedMealGroup = { menuIndex, groupIndex };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `group:${groupHandle.dataset.dragGroup}`);
    groupHandle.closest('.meal-category-editor')?.classList.add('is-dragging');
    return;
  }
  if (!handle) return;
  syncMealEditorState();
  const [menuIndex, groupIndex, dishIndex] = handle.dataset.dragDish.split(':').map(Number);
  draggedMealDish = { menuIndex, groupIndex, dishIndex };
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', handle.dataset.dragDish);
  handle.closest('.meal-dish-editor')?.classList.add('is-dragging');
});

document.querySelector('#mealMenuEditor')?.addEventListener('dragover', event => {
  if (draggedMealMenu !== null) {
    const menu = event.target.closest('.meal-tree-root');
    if (!menu) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    clearMealDropIndicators();
    const after = event.clientY > menu.getBoundingClientRect().top + menu.offsetHeight / 2;
    menu.classList.add(after ? 'is-drop-after' : 'is-drop-before');
    return;
  }
  if (draggedMealGroup) {
    const group = event.target.closest('.meal-category-editor');
    const groupList = event.target.closest('.meal-tree-groups');
    if (!group && !groupList) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    clearMealDropIndicators();
    if (group) {
      const after = event.clientY > group.getBoundingClientRect().top + group.offsetHeight / 2;
      group.classList.add(after ? 'is-drop-after' : 'is-drop-before');
    } else groupList.classList.add('is-drop-target');
    return;
  }
  if (!draggedMealDish) return;
  const dish = event.target.closest('.meal-dish-editor');
  const list = event.target.closest('.meal-dish-list');
  if (!dish && !list) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  clearMealDropIndicators();
  if (dish) {
    const after = event.clientY > dish.getBoundingClientRect().top + dish.offsetHeight / 2;
    dish.classList.add(after ? 'is-drop-after' : 'is-drop-before');
  } else list.classList.add('is-drop-target');
});

document.querySelector('#mealMenuEditor')?.addEventListener('drop', event => {
  if (draggedMealMenu !== null) {
    const targetMenu = event.target.closest('.meal-tree-root');
    if (!targetMenu) return;
    event.preventDefault();
    let targetIndex = Number(targetMenu.dataset.menuIndex) + (targetMenu.classList.contains('is-drop-after') ? 1 : 0);
    const [movedMenu] = mealEditorTree.splice(draggedMealMenu, 1);
    if (targetIndex > draggedMealMenu) targetIndex -= 1;
    mealEditorTree.splice(Math.max(0, Math.min(targetIndex, mealEditorTree.length)), 0, movedMenu);
    draggedMealMenu = null;
    collapsedMealMenus.clear();
    collapsedMealGroups.clear();
    clearMealDropIndicators();
    renderMealMenuEditor();
    return;
  }
  if (draggedMealGroup) {
    const targetGroupNode = event.target.closest('.meal-category-editor');
    const targetGroupList = event.target.closest('.meal-tree-groups');
    if (!targetGroupNode && !targetGroupList) return;
    event.preventDefault();
    const targetMenuIndex = Number((targetGroupNode?.closest('.meal-tree-root') || targetGroupList.closest('.meal-tree-root')).dataset.menuIndex);
    const sourceGroups = mealEditorTree[draggedMealGroup.menuIndex].groups;
    const targetGroups = mealEditorTree[targetMenuIndex].groups;
    let targetGroupIndex = targetGroupNode ? Number(targetGroupNode.dataset.groupIndex) + (targetGroupNode.classList.contains('is-drop-after') ? 1 : 0) : targetGroups.length;
    const [movedGroup] = sourceGroups.splice(draggedMealGroup.groupIndex, 1);
    if (draggedMealGroup.menuIndex === targetMenuIndex && targetGroupIndex > draggedMealGroup.groupIndex) targetGroupIndex -= 1;
    targetGroups.splice(Math.max(0, Math.min(targetGroupIndex, targetGroups.length)), 0, movedGroup);
    draggedMealGroup = null;
    collapsedMealGroups.clear();
    clearMealDropIndicators();
    renderMealMenuEditor();
    return;
  }
  if (!draggedMealDish) return;
  const dish = event.target.closest('.meal-dish-editor');
  const list = event.target.closest('.meal-dish-list');
  if (!dish && !list) return;
  event.preventDefault();
  const targetList = dish?.closest('.meal-dish-list') || list;
  const [targetMenuIndex, targetGroupIndex] = targetList.dataset.dropGroup.split(':').map(Number);
  const sourceGroup = mealEditorTree[draggedMealDish.menuIndex].groups[draggedMealDish.groupIndex];
  const targetGroup = mealEditorTree[targetMenuIndex].groups[targetGroupIndex];
  let targetDishIndex = dish ? Number(dish.dataset.dishIndex) + (dish.classList.contains('is-drop-after') ? 1 : 0) : targetGroup.dishes.length;
  const [movedDish] = sourceGroup.dishes.splice(draggedMealDish.dishIndex, 1);
  if (draggedMealDish.menuIndex === targetMenuIndex && draggedMealDish.groupIndex === targetGroupIndex && targetDishIndex > draggedMealDish.dishIndex) targetDishIndex -= 1;
  targetGroup.dishes.splice(Math.max(0, Math.min(targetDishIndex, targetGroup.dishes.length)), 0, movedDish);
  collapsedMealMenus.delete(targetMenuIndex);
  collapsedMealGroups.delete(`${targetMenuIndex}:${targetGroupIndex}`);
  draggedMealDish = null;
  clearMealDropIndicators();
  renderMealMenuEditor();
});

document.querySelector('#mealMenuEditor')?.addEventListener('dragend', () => {
  draggedMealMenu = null;
  draggedMealGroup = null;
  draggedMealDish = null;
  clearMealDropIndicators();
  document.querySelectorAll('.meal-tree-root.is-dragging,.meal-category-editor.is-dragging,.meal-dish-editor.is-dragging').forEach(node => node.classList.remove('is-dragging'));
});
document.querySelector('#mealMenuForm')?.addEventListener('submit', event => {
  event.preventDefault();
  syncMealEditorState();
  mealEditorTree.forEach(menu => menu.groups.forEach(group => { group.dishes = group.dishes.filter(dish => dish.name || dish.desc); }));
  groundServiceState.meal.menuDetail = mealEditorTree.flatMap(menu => menu.groups.map(group => ({ category: { main: menu.name || '未命名餐单', sub: group.name || '未命名分组' }, dishes: cloneData(group.dishes) })));
  groundServiceState.meal.status = document.querySelector('#mealStatus').value;
  saveGroundServiceState();
  renderMealSummary();
  document.querySelector('#mealMenuDialog').close();
  showToast(`餐单已保存，共 ${dishCount()} 道菜`);
});
document.querySelector('#mealStatus')?.addEventListener('change', event => {
  groundServiceState.meal.status = event.target.value;
  saveGroundServiceState();
  renderMealSummary();
  showToast(`餐单状态已更新为${event.target.value}`);
});

renderGroundService();
