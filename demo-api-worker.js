importScripts('./demo-config-snapshot.js');
importScripts('./demo-live-snapshot.js');

const API_MARKER = '/jetmaster-flight-manager-demo/api/';
const DAY = 86_400_000;
const pad = (value) => String(value).padStart(2, '0');
const businessDate = (offset = 0) => {
  const date = new Date(Date.now() + offset * DAY);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};
const instant = (offset, hour, minute = 0) =>
  `${businessDate(offset)}T${pad(hour)}:${pad(minute)}:00Z`;
const ok = (data) =>
  new Response(JSON.stringify({ code: 'OK', data, message: 'OK' }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
const page = (items) => ({
  content: items,
  current: 1,
  items,
  page: 1,
  records: items,
  size: 20,
  total: items.length,
  totalElements: items.length,
  totalPages: items.length ? 1 : 0,
});

const company = { code: 'JETMASTER', id: 1, name: 'Jetmaster 航空' };
const aircraftTypes = [
  { code: 'G650', id: 1, manufacturer: 'Gulfstream', name: 'G650' },
  { code: 'GL7T', id: 2, manufacturer: 'Bombardier', name: 'Global 7500' },
  { code: 'F8X', id: 3, manufacturer: 'Dassault', name: 'Falcon 8X' },
];
const aircraft = [
  { aircraftTypeCode: 'G650', aircraftTypeId: 1, aircraftTypeName: 'G650', id: 101, registration: 'B1234', status: 'AVAILABLE' },
  { aircraftTypeCode: 'G650', aircraftTypeId: 1, aircraftTypeName: 'G650', id: 102, registration: 'B2568', status: 'IN_OPERATION' },
  { aircraftTypeCode: 'GL7T', aircraftTypeId: 2, aircraftTypeName: 'Global 7500', id: 103, registration: 'B3917', status: 'AVAILABLE' },
  { aircraftTypeCode: 'F8X', aircraftTypeId: 3, aircraftTypeName: 'Falcon 8X', id: 104, registration: 'B4826', status: 'MAINTENANCE' },
  { aircraftTypeCode: 'GL7T', aircraftTypeId: 2, aircraftTypeName: 'Global 7500', id: 105, registration: 'B5739', status: 'AVAILABLE' },
];
const airports = [
  { city: '上海', countryCode: 'CN', iataCode: 'PVG', icaoCode: 'ZSPD', id: 201, name: '上海浦东国际机场', timeZone: 'Asia/Shanghai' },
  { city: '北京', countryCode: 'CN', iataCode: 'PEK', icaoCode: 'ZBAA', id: 202, name: '北京首都国际机场', timeZone: 'Asia/Shanghai' },
  { city: '深圳', countryCode: 'CN', iataCode: 'SZX', icaoCode: 'ZGSZ', id: 203, name: '深圳宝安国际机场', timeZone: 'Asia/Shanghai' },
  { city: '香港', countryCode: 'HK', iataCode: 'HKG', icaoCode: 'VHHH', id: 204, name: '香港国际机场', timeZone: 'Asia/Hong_Kong' },
  { city: '新加坡', countryCode: 'SG', iataCode: 'SIN', icaoCode: 'WSSS', id: 205, name: '新加坡樟宜机场', timeZone: 'Asia/Singapore' },
];
const flightSeed = [
  [-2, 'JM2101', 'B1234', 'ZSPD', 'ZBAA', 1, 3, 'COMPLETED'],
  [-1, 'JM2108', 'B3917', 'ZBAA', 'ZGSZ', 2, 5, 'COMPLETED'],
  [0, 'JM2316', 'B2568', 'ZSPD', 'VHHH', 1, 4, 'IN_PROGRESS'],
  [0, 'JM2322', 'B1234', 'VHHH', 'WSSS', 7, 10, 'CONFIRMED'],
  [1, 'JM2406', 'B5739', 'WSSS', 'ZGSZ', 2, 6, 'PLANNED'],
  [2, 'JM2512', 'B3917', 'ZGSZ', 'ZSPD', 4, 7, 'PLANNED'],
];
const flights = flightSeed.map(([offset, flightNo, registration, departure, arrival, start, end, status], index) => ({
  aircraftRegistration: registration,
  arrivalAirportIcao: arrival,
  arrivalAirportName: airports.find((item) => item.icaoCode === arrival)?.name,
  arrivalTime: instant(offset, end),
  departureAirportIcao: departure,
  departureAirportName: airports.find((item) => item.icaoCode === departure)?.name,
  departureTime: instant(offset, start),
  estimatedArrivalTime: instant(offset, end),
  estimatedDepartureTime: instant(offset, start),
  flightDate: businessDate(offset),
  flightNo,
  id: 1001 + index,
  operatingCompanyCode: company.code,
  operatingCompanyName: company.name,
  status,
  tripNo: `TRIP-${businessDate(offset).replaceAll('-', '')}-${index + 1}`,
}));
const trips = flights.slice(2, 6).map((flight, index) => ({
  aircraftRegistration: flight.aircraftRegistration,
  customerName: ['华东商务客户', '亚太包机客户', 'Jetmaster 训练中心', '华南托管客户'][index],
  endDate: flight.flightDate,
  flightCount: 1,
  id: 3001 + index,
  name: `${flight.departureAirportIcao}-${flight.arrivalAirportIcao} 演示行程`,
  operatingCompanyName: company.name,
  startDate: flight.flightDate,
  status: index < 2 ? 'CONFIRMED' : 'DRAFT',
  tripNo: flight.tripNo,
}));
const crew = [
  { employeeNo: 'JM-C001', id: 401, name: '陈机长', position: '责任机长', status: 'AVAILABLE' },
  { employeeNo: 'JM-C002', id: 402, name: '林副驾驶', position: '副驾驶', status: 'ON_DUTY' },
  { employeeNo: 'JM-C003', id: 403, name: '周乘务长', position: '乘务长', status: 'ON_DUTY' },
  { employeeNo: 'JM-C004', id: 404, name: '许乘务员', position: '乘务员', status: 'AVAILABLE' },
];
const suppliers = [
  { category: '地面代理', code: 'SUP-001', contactName: '李经理', id: 501, name: '浦东公务机服务中心', status: 'ACTIVE' },
  { category: '航油', code: 'SUP-002', contactName: '王经理', id: 502, name: '亚太航油服务', status: 'ACTIVE' },
  { category: '配餐', code: 'SUP-003', contactName: '赵经理', id: 503, name: '云端航空配餐', status: 'ACTIVE' },
];
const tasks = [
  { assigneeName: '运行控制员', businessNo: 'JM2316', createdAt: instant(0, 0), id: 601, name: '确认香港地面保障', status: 'PENDING', title: '确认香港地面保障' },
  { assigneeName: '财务审核员', businessNo: 'PAY-20261023-01', createdAt: instant(0, 1), id: 602, name: '审核航油付款申请', status: 'IN_PROGRESS', title: '审核航油付款申请' },
];
const notifications = [
  { content: 'JM2316 已进入放行准备阶段。', createdAt: instant(0, 0, 15), id: 701, read: false, status: 'UNREAD', title: '航班状态更新', type: 'FLIGHT' },
  { content: 'B4826 计划维护记录已更新。', createdAt: instant(-1, 8), id: 702, read: true, status: 'READ', title: '飞机维护提醒', type: 'AIRCRAFT' },
];
const payments = [
  { amount: 38600, applicantName: '运行保障部', applicationNo: 'PAY-20261023-01', currency: 'CNY', id: 801, status: 'PENDING_APPROVAL', supplierName: suppliers[1].name },
  { amount: 12800, applicantName: '客舱服务部', applicationNo: 'PAY-20261023-02', currency: 'CNY', id: 802, status: 'APPROVED', supplierName: suppliers[2].name },
];
const serviceRows = flights.slice(2, 5).map((flight, index) => ({
  aircraftRegistration: flight.aircraftRegistration,
  arrivalAirportIcao: flight.arrivalAirportIcao,
  cateringStatus: index === 0 ? 'COMPLETED' : 'PENDING',
  departureAirportIcao: flight.departureAirportIcao,
  flightId: flight.id,
  flightNo: flight.flightNo,
  fuelStatus: index < 2 ? 'COMPLETED' : 'PENDING',
  groundHandlingStatus: index === 0 ? 'COMPLETED' : 'IN_PROGRESS',
  id: 9001 + index,
  scheduledDepartureTime: flight.departureTime,
  status: index === 0 ? 'READY' : 'IN_PROGRESS',
}));
const releases = flights.slice(2, 5).map((flight, index) => ({
  aircraftRegistration: flight.aircraftRegistration,
  departureAirportIcao: flight.departureAirportIcao,
  flightId: flight.id,
  flightNo: flight.flightNo,
  id: 9101 + index,
  releaseNo: `REL-${flight.flightNo}`,
  scheduledDepartureTime: flight.departureTime,
  status: index === 0 ? 'RELEASED' : 'PENDING',
}));
const genericRecords = [
  { code: 'DEMO-001', createdAt: instant(-1, 8), id: 1, name: '演示记录 A', status: 'ACTIVE' },
  { code: 'DEMO-002', createdAt: instant(0, 2), id: 2, name: '演示记录 B', status: 'PENDING' },
  { code: 'DEMO-003', createdAt: instant(1, 3), id: 3, name: '演示记录 C', status: 'COMPLETED' },
];
const allowanceRule = {
  calculationMode: 'DOMESTIC_OVERSEAS', code: 'JM-ALLOWANCE-01', currentRevisionNo: 1,
  id: 'alrl_demo00000000000000000001', name: 'Jetmaster 机组驻外补贴规则',
  publishedRevisionNo: 1, updatedAt: instant(-1, 8), version: 1,
};
const allowanceBatch = {
  createdAt: instant(-1, 8), createdBy: 1, generationMode: 'AUTOMATIC',
  id: 'albt_demo00000000000000000001', payableAmountCny: '3650.00', pendingCount: 0,
  periodEnd: businessDate(0), periodStart: businessDate(-7), resultCount: 2,
  sourceFingerprint: 'jetmaster-demo', status: 'PREVIEW', updatedAt: instant(0, 1), version: 1,
};
const allowanceResults = crew.slice(0, 2).map((member, index) => ({
  adjustmentCny: '0.00', batchId: allowanceBatch.id, blockHours: `${4 + index}.00`,
  businessDate: businessDate(-index), communicationDays: '1.00', crewCategory: index ? 'CABIN_CREW' : 'PILOT',
  crewNo: member.employeeNo, crewProfileId: member.id, domesticDays: '0.00', employeeName: member.name,
  id: `alrs_demo0000000000000000000${index + 1}`, overseasDays: '1.00', payableAmountCny: `${1800 + index * 50}.00`,
  positioningDays: '0.00', routeSummary: 'ZSPD → VHHH', ruleId: allowanceRule.id,
  ruleNameSnapshot: allowanceRule.name, ruleRevisionNo: 1, sourceFlightIds: [flights[index + 2].id],
  sourceFlightNos: [flights[index + 2].flightNo], status: 'PENDING_REVIEW', systemAmountCny: `${1800 + index * 50}.00`, version: 1,
}));
const expenseSubjects = [
  { accountingSubjectCode: '660201', accountingSubjectId: 'acct-travel', accountingSubjectName: '差旅费', accountingSubjectPath: '管理费用 / 差旅费', createdAt: instant(-3, 8), documentTitleKeyword: '住宿', enabled: true, expenseName: '机组住宿费', id: 1, priority: 100, skillCode: 'HOTEL_BILL', skillName: '酒店账单', supplierNameKeyword: '', updatedAt: instant(-1, 8) },
  { accountingSubjectCode: '640102', accountingSubjectId: 'acct-fuel', accountingSubjectName: '航油费', accountingSubjectPath: '主营业务成本 / 航油费', createdAt: instant(-3, 8), documentTitleKeyword: '航油', enabled: true, expenseName: '航油费用', id: 2, priority: 90, skillCode: 'FUEL_BILL', skillName: '航油账单', supplierNameKeyword: '', updatedAt: instant(-1, 8) },
];
const config = self.__JETMASTER_DEMO_CONFIG__ || {};
const configPage = (key) => page(config[key] || []);
const configDetail = (key, path) => {
  const id = decodeURIComponent(path.split('/').filter(Boolean).at(-1) || '');
  return (config[key] || []).find((item) => String(item.id) === id) || null;
};

const collectionItems = (value) =>
  Array.isArray(value)
    ? value
    : value?.items || value?.content || value?.records || [];

const normalizeFlight = (item = flights[2]) => {
  const departureCode =
    item.departureAirportIcaoCode || item.departureAirportIcao || 'ZSPD';
  const arrivalCode =
    item.arrivalAirportIcaoCode || item.arrivalAirportIcao || 'VHHH';
  const selectedAircraft = aircraft.find(
    (candidate) => candidate.registration === item.aircraftRegistration,
  );
  return {
    ...item,
    aircraftId: item.aircraftId || selectedAircraft?.id || null,
    aircraftModel:
      item.aircraftModel || selectedAircraft?.aircraftTypeName || 'G650',
    arrivalAirportIcaoCode: arrivalCode,
    arrivalAirportName:
      item.arrivalAirportName ||
      airports.find((airport) => airport.icaoCode === arrivalCode)?.name,
    arrivalAirportTimeZone:
      item.arrivalAirportTimeZone ||
      airports.find((airport) => airport.icaoCode === arrivalCode)?.timeZone ||
      'Asia/Shanghai',
    departureAirportIcaoCode: departureCode,
    departureAirportName:
      item.departureAirportName ||
      airports.find((airport) => airport.icaoCode === departureCode)?.name,
    departureAirportTimeZone:
      item.departureAirportTimeZone ||
      airports.find((airport) => airport.icaoCode === departureCode)?.timeZone ||
      'Asia/Shanghai',
    missionType: item.missionType || 'PAX',
    operatingCompanyCode: item.operatingCompanyCode || company.code,
    operatingCompanyId: item.operatingCompanyId || company.id,
    operatingDate: item.operatingDate || item.flightDate || businessDate(),
    ownerName: item.ownerName || '系统管理员',
    scheduledLandingAt:
      item.scheduledLandingAt || item.arrivalTime || instant(0, 12),
    scheduledTakeoffAt:
      item.scheduledTakeoffAt || item.departureTime || instant(0, 9),
    version: item.version || 1,
  };
};

const demoFlights = () => {
  const liveFlights = collectionItems(
    (self.__JETMASTER_LIVE_SNAPSHOT__ || {})['/operations/flights'],
  );
  return liveFlights.length ? liveFlights : flights;
};

const requestedFlight = (cleanPath) => {
  const flightId = decodeURIComponent(cleanPath.split('/').at(-2) || '');
  const candidates = demoFlights();
  return normalizeFlight(
    candidates.find((item) => String(item.id) === flightId) || candidates[0],
  );
};

const requirementForFlight = (flight) => {
  const index = Math.max(
    0,
    demoFlights().findIndex((item) => String(item.id) === String(flight.id)),
  );
  const passengerProfiles = [
    { adult: 6, child: 1, infant: 0 },
    { adult: 4, child: 0, infant: 0 },
    { adult: 8, child: 2, infant: 1 },
    { adult: 5, child: 1, infant: 1 },
    { adult: 7, child: 0, infant: 0 },
    { adult: 3, child: 1, infant: 0 },
  ];
  const profile = passengerProfiles[index % passengerProfiles.length];
  const passengerCount = profile.adult + profile.child + profile.infant;
  const routeSummary = `${flight.departureAirportIcaoCode} → ${flight.arrivalAirportIcaoCode}`;
  return {
    adultCount: profile.adult,
    childCount: profile.child,
    flightId: flight.id,
    flightNo: flight.flightNo,
    id: `rqsm_demo_${index + 1}`,
    infantCount: profile.infant,
    items: [
      {
        applicability: 'IN_FLIGHT',
        category: 'SPECIAL_MEAL',
        mandatory: true,
        quantity: passengerCount,
        summary: `按 ${passengerCount} 人准备餐食与饮品`,
      },
      {
        applicability: 'DEPARTURE',
        category: 'GROUND_TRANSPORT',
        mandatory: true,
        quantity: 1,
        summary: '安排一辆商务接送车',
      },
      {
        applicability: 'BOTH',
        category: 'VIP',
        mandatory: false,
        quantity: 1,
        summary: '安排要客快速通道与礼宾引导',
      },
    ],
    orderId: `ord_demo_${index + 1}`,
    orderNo: `SO-${businessDate(index - 2).replaceAll('-', '')}-${pad(index + 1)}`,
    passengerCount,
    requirementVersionNo: 1,
    routeSummary,
    status: index % 3 === 2 ? 'ACKNOWLEDGED' : 'PENDING',
    updatedAt: instant(0, 1, index * 5),
    version: 1,
  };
};

const billForFlight = (flight) => {
  const index = Math.max(
    0,
    demoFlights().findIndex((item) => String(item.id) === String(flight.id)),
  );
  const billId = `flbl_demo_${index + 1}`;
  const base = 18_000 + index * 2_400;
  const definitions = [
    ['FUEL', '航油费用', base + 8_000, base + 7_650, true],
    ['HANDLING', '地面保障服务费', 8_600 + index * 500, 8_450 + index * 520, true],
    ['CATERING', '航空配餐费', 3_200 + index * 260, 3_080 + index * 240, true],
    ['AIRPORT', '机场起降及停场费', 12_500 + index * 700, 12_380 + index * 680, true],
    ['CREW_HOTEL', '机组住宿费', 4_800 + index * 300, index % 2 ? 4_650 + index * 280 : 0, false],
  ];
  const flightItems = definitions.map(
    ([code, name, estimatedAmount, actualAmount, required], itemIndex) => ({
      actualAmount,
      code,
      currency: 'CNY',
      documentCount: actualAmount ? 1 : 0,
      estimatedAmount,
      id: `flbi_demo_${index + 1}_${itemIndex + 1}`,
      name,
      ownerBillId: billId,
      ownerType: 'FLIGHT',
      required,
      status: actualAmount ? 'ACTUAL_RECORDED' : 'ESTIMATED',
      updatedAt: instant(0, 1, itemIndex * 3),
      version: 1,
    }),
  );
  const estimatedAmount = flightItems.reduce(
    (total, item) => total + item.estimatedAmount,
    0,
  );
  const actualAmount = flightItems.reduce(
    (total, item) => total + item.actualAmount,
    0,
  );
  return {
    availableActions: ['UPDATE_ESTIMATE', 'UPDATE_ACTUAL'],
    bill: {
      createdAt: instant(-1, 8),
      flightId: flight.id,
      flightNo: flight.flightNo,
      id: billId,
      routeRuleCode: 'JM-DEMO',
      routeRuleVersion: 1,
      routeScope: 'DOMESTIC',
      status: actualAmount === estimatedAmount ? 'RECONCILED' : 'DRAFT',
      templateId: 'fbtp_demo',
      templateName: 'Jetmaster 标准航班账单',
      templateRevisionNo: 1,
      updatedAt: instant(0, 1),
      version: 1,
    },
    flightItems,
    history: [
      {
        action: 'INITIALIZED',
        createdAt: instant(-1, 8),
        createdByName: '系统管理员',
        id: `flbh_demo_${index + 1}`,
        remarks: '按航班账单模板生成演示费用项',
      },
    ],
    requiredComplete: flightItems
      .filter((item) => item.required)
      .every((item) => item.actualAmount > 0),
    summaries: [
      {
        actualAmount,
        currency: 'CNY',
        estimatedAmount,
        variance: actualAmount - estimatedAmount,
      },
    ],
    tripItems: [],
  };
};

const responseFor = (path) => {
  const cleanPath = path.split('?')[0];
  const liveSnapshot = self.__JETMASTER_LIVE_SNAPSHOT__ || {};
  if (
    Object.prototype.hasOwnProperty.call(liveSnapshot, cleanPath) &&
    !cleanPath.startsWith('/crewops/allowances')
  ) {
    return liveSnapshot[cleanPath];
  }
  if (cleanPath === '/operations/workbench') return {
    flights: flights.slice(2, 6), generatedAt: new Date().toISOString(), myTodos: tasks,
    notifications, operatingDate: businessDate(), readiness: serviceRows,
    risks: [{ id: 1, level: 'MEDIUM', message: 'B4826 处于计划维护状态' }],
    summary: { activeFlights: 2, completedFlights: 2, criticalRisks: 0, heldFlights: 0, myTodos: 2, pendingAcknowledgements: 1, pendingCloseouts: 1, totalFlights: flights.length, unreadNotifications: 1 },
    timeZone: 'Asia/Shanghai',
  };
  if (cleanPath === '/operations/flights') return page(flights);
  if (/^\/operations\/flights\/\d+$/.test(cleanPath)) return flights.find((item) => cleanPath.endsWith(String(item.id))) || flights[0];
  if (cleanPath.includes('/operations/flights/') && cleanPath.endsWith('/todos')) return page(tasks);
  if (cleanPath.includes('/operations/flights/') && cleanPath.endsWith('/requirement-summary')) {
    return requirementForFlight(requestedFlight(cleanPath));
  }
  if (cleanPath.includes('/operations/flights/') && cleanPath.endsWith('/aggregate')) {
    const flightId = cleanPath.split('/').at(-2);
    const liveFlights = collectionItems(liveSnapshot['/operations/flights']);
    const selectedFlight =
      liveFlights.find((item) => String(item.id) === flightId) ||
      flights.find((item) => String(item.id) === flightId) ||
      liveFlights[0] ||
      flights[2];
    return {
      availableActions: [
        'CANCEL',
        'CONFIRM',
        'HOLD',
        'REPLACE',
        'RESUME',
        'UPDATE_PLAN',
        'WRITE_TODOS',
      ],
      flight: normalizeFlight(selectedFlight),
      todos: tasks,
      todosVisible: true,
    };
  }
  if (
    cleanPath.includes('/operations/flights/') &&
    cleanPath.endsWith('/detail-resources')
  ) {
    return {
      approvalChanges: [],
      availableActions: ['WRITE'],
      melDeferrals: [],
      permits: [],
    };
  }
  if (cleanPath.includes('/operations/flights/') && cleanPath.endsWith('/readiness')) {
    const selectedFlight = normalizeFlight(collectionItems(liveSnapshot['/operations/flights'])[0] || flights[2]);
    return { blockers: [], canExecute: true, canSign: true, dimensions: [{ code: 'FLIGHT_PLAN', mandatoryForExecution: true, mandatoryForSigning: true, message: '航班计划已确认', state: 'READY' }], factVersion: 'demo-1', flightId: selectedFlight.id, flightNo: selectedFlight.flightNo, generatedAt: instant(0, 1), overallStatus: 'READY_FOR_RELEASE', release: { status: 'DRAFT' }, sourceUpdatedAt: instant(0, 1), warnings: [] };
  }
  if (cleanPath.includes('/operations/flights/') && cleanPath.endsWith('/release')) {
    const selectedFlight = normalizeFlight(collectionItems(liveSnapshot['/operations/flights'])[0] || flights[2]);
    const readiness = responseFor(`/operations/flights/${selectedFlight.id}/readiness`);
    return { currentRevision: { checks: [{ checkCode: 'FLIGHT_PLAN', checkName: '飞行计划', evidence: [], id: 1, mandatory: true, notApplicableAllowed: false, reason: null, remarks: '演示数据已核对', revisionId: 'flrr_demo', sortOrder: 1, status: 'PASSED', version: 1 }], conditionFingerprint: 'demo', createdAt: instant(-1, 8), createdBy: 1, createdByName: '系统管理员', id: 'flrr_demo', releaseId: 'flre_demo', revisionNo: 1, rulesetVersion: 'demo-1', signatureHistory: [], snapshotJson: '{}', sourceFlightVersion: selectedFlight.version, status: 'DRAFT', updatedAt: instant(0, 1), version: 1 }, flight: { aircraftModel: selectedFlight.aircraftModel, aircraftRegistration: selectedFlight.aircraftRegistration, arrivalAirportIcaoCode: selectedFlight.arrivalAirportIcaoCode, arrivalAirportTimeZone: selectedFlight.arrivalAirportTimeZone, departureAirportIcaoCode: selectedFlight.departureAirportIcaoCode, departureAirportTimeZone: selectedFlight.departureAirportTimeZone, flightNo: selectedFlight.flightNo, operatingDate: selectedFlight.operatingDate, scheduledLandingAt: selectedFlight.scheduledLandingAt, scheduledTakeoffAt: selectedFlight.scheduledTakeoffAt, status: selectedFlight.status, version: selectedFlight.version }, flightId: selectedFlight.id, id: 'flre_demo', readiness, version: 1 };
  }
  if (cleanPath.includes('/operations/flights/') && cleanPath.endsWith('/closeout')) {
    const selectedFlight = normalizeFlight(collectionItems(liveSnapshot['/operations/flights'])[0] || flights[2]);
    return { availableActions: ['UPDATE_ITEM', 'OPEN_ISSUE'], blockers: [], closeout: { createdAt: instant(-1, 8), flightId: selectedFlight.id, id: 'flco_demo', status: 'OPEN', templateCode: 'JM-CLOSEOUT', templateId: 'demo-template', templateName: 'Jetmaster 航班运行收尾', templateRevisionNo: 1, updatedAt: instant(0, 1), version: 1 }, flight: { flightNo: selectedFlight.flightNo, id: selectedFlight.id, status: selectedFlight.status, version: selectedFlight.version }, history: [], issues: [], items: [{ closeoutId: 'flco_demo', code: 'LOG', id: 1, mandatory: true, name: '航后运行记录', sequenceNo: 1, status: 'PENDING', type: 'TEXT', updatedAt: instant(0, 1), version: 1 }], serviceEvaluationItems: [] };
  }
  if (cleanPath.startsWith('/operations/trips')) return page(trips);
  if (cleanPath.startsWith('/operations/flight-preparation-summaries')) return page(serviceRows);
  if (cleanPath.startsWith('/operations/service-progress')) return page(serviceRows);
  if (cleanPath.startsWith('/operations/flight-releases')) return page(releases);
  if (cleanPath === '/crewops/roster') return { events: crew.map((member, index) => ({ endTime: instant(index % 2, 10), id: index + 1, resourceId: member.id, startTime: instant(index % 2, 2), title: flights[index + 2]?.flightNo || '备勤' })), flights };
  if (cleanPath.includes('/crewops/employee-options') || cleanPath.includes('/crewops/profiles')) return page(crew);
  if (cleanPath === '/crewops/allowances/batches') return [allowanceBatch];
  if (cleanPath === `/crewops/allowances/batches/${allowanceBatch.id}`) return { batch: allowanceBatch, results: allowanceResults };
  if (cleanPath === '/crewops/allowances/bindings') return [];
  if (cleanPath === '/crewops/allowances/flight-facts') return flights.slice(2, 5).map((flight) => ({
    actualArrivalAirportIcaoCode: flight.arrivalAirportIcao,
    actualDepartureAirportIcaoCode: flight.departureAirportIcao,
    engineShutdownAt: flight.arrivalTime,
    flightId: flight.id,
    flightNo: flight.flightNo,
    operatingDate: flight.flightDate,
    plannedArrivalAirportIcaoCode: flight.arrivalAirportIcao,
    plannedDepartureAirportIcaoCode: flight.departureAirportIcao,
    positioning: false,
    source: 'MANUAL',
    version: 1,
  }));
  if (cleanPath === '/crewops/allowances/rules') return [allowanceRule];
  if (cleanPath === `/crewops/allowances/rules/${allowanceRule.id}`) return {
    revision: { communicationEnabled: true, createdAt: instant(-7, 8), createdBy: 1, departureLeadMinutes: 180, halfDayThresholdMinute: 720, includePositioning: true, note: 'Jetmaster 演示规则', returnCutoffMinute: 120, returnCutoffScope: 'RULE1_ONLY', returnPostMinutes: 60, revisionNo: 1, revisionReason: '演示数据', ruleId: allowanceRule.id, status: 'PUBLISHED', validFrom: businessDate(-30), validTo: null },
    rule: allowanceRule,
    standards: [{ communicationAmount: '100.00', crewCategory: 'PILOT', currency: 'CNY', fullDayAmount: '1800.00', halfDayAmount: '900.00', hourlyAmount: '100.00', id: 1, regionCode: 'OVERSEAS', revisionNo: 1, ruleId: allowanceRule.id }],
  };
  if (cleanPath.startsWith('/crewops')) return page(crew.map((item, index) => ({ ...item, allowanceAmount: 800 + index * 150, businessDate: businessDate(index - 1) })));
  if (cleanPath === '/aviation/aircraft' || cleanPath.endsWith('/aircraft/options')) return configPage('aircraft');
  if (/^\/aviation\/aircraft\/[^/]+$/.test(cleanPath)) return configDetail('aircraft', cleanPath);
  if (cleanPath === '/aviation/aircraft-types') return configPage('aircraftTypes');
  if (/^\/aviation\/aircraft-types\/[^/]+$/.test(cleanPath)) return configDetail('aircraftTypes', cleanPath);
  if (cleanPath === '/aviation/airports' || cleanPath === '/aviation/airports/suggestions') return configPage('airports');
  if (/^\/aviation\/airports\/[^/]+$/.test(cleanPath)) return configDetail('airports', cleanPath);
  if (cleanPath === '/aviation/operating-companies') return configPage('operatingCompanies');
  if (/^\/aviation\/operating-companies\/[^/]+$/.test(cleanPath)) return configDetail('operatingCompanies', cleanPath);
  if (cleanPath === '/aviation/countries') return configPage('countries');
  if (/^\/aviation\/countries\/[^/]+$/.test(cleanPath)) return configDetail('countries', cleanPath);
  if (cleanPath === '/aviation/handling-agents') return configPage('handlingAgents');
  if (/^\/aviation\/handling-agents\/[^/]+$/.test(cleanPath)) return configDetail('handlingAgents', cleanPath);
  if (cleanPath === '/master-data/customers') return configPage('customers');
  if (cleanPath === '/master-data/materials') return configPage('materials');
  if (cleanPath === '/master-data/suppliers') return configPage('suppliers');
  if (cleanPath === '/master-data/units') return configPage('units');
  if (cleanPath === '/master-data/warehouses') return configPage('warehouses');
  if (cleanPath === '/master-data/cost-item-types') return config.costItemTypes || [];
  if (cleanPath === '/master-data/expense-subjects') return expenseSubjects;
  if (cleanPath === '/dictionaries/types') return config.dictionaryTypes || [];
  if (cleanPath === '/finance/flight-bill-templates') return config.billTemplates || [];
  if (cleanPath === '/notifications/summary') return { total: notifications.length, unread: 1 };
  if (cleanPath.startsWith('/notifications')) return page(notifications);
  if (cleanPath.startsWith('/messaging')) return page(notifications);
  if (cleanPath.includes('/workflow/center')) return { myTasks: tasks, pendingCount: 2, recentInstances: genericRecords };
  if (cleanPath.includes('/workflow/tasks')) return page(tasks);
  if (cleanPath.startsWith('/workflow')) return page(genericRecords);
  if (cleanPath === '/finance/dashboard') return { accountsPayable: 51400, accountsReceivable: 82000, currency: 'CNY', pendingApprovals: 1, recentPayments: payments };
  if (cleanPath.includes('/finance/flights/') && cleanPath.endsWith('/bill')) {
    return billForFlight(requestedFlight(cleanPath));
  }
  if (cleanPath.includes('/finance/payment-applications')) return page(payments);
  if (cleanPath === '/finance/cost-statistics/reference-data') return {
    currencies: ['CNY', 'USD'],
    dimensions: ['COMPANY', 'CUSTOMER', 'AIRCRAFT', 'TRIP', 'FLIGHT', 'STATION', 'ROUTE'],
    operatingCompanies: [{ ...company, enabled: true }],
    periods: [businessDate().slice(0, 7), businessDate(-30).slice(0, 7)],
  };
  if (cleanPath === '/finance/cost-statistics/summary') return {
    dimension: 'FLIGHT',
    period: businessDate().slice(0, 7),
    rows: flights.slice(2, 5).map((flight, index) => ({ cost: `${18600 + index * 4200}.00`, currency: 'CNY', key: String(flight.id), label: `${flight.flightNo} · ${flight.departureAirportIcao}-${flight.arrivalAirportIcao}`, recordCount: 3 + index })),
    unallocated: [{ cost: '3200.00', currency: 'CNY', recordCount: 1 }],
  };
  if (cleanPath === '/finance/cost-statistics/details') return { items: [], page: 1, size: 20, total: 0 };
  if (cleanPath === '/finance/entry-cost-subjects') return [
    { hierarchyDepth: 2, id: 'acct-travel', name: '差旅费', parentId: null, path: '管理费用 / 差旅费', subjectLevel1: '管理费用', subjectLevel2: '差旅费', subjectLevel3: null },
    { hierarchyDepth: 2, id: 'acct-fuel', name: '航油费', parentId: null, path: '主营业务成本 / 航油费', subjectLevel1: '主营业务成本', subjectLevel2: '航油费', subjectLevel3: null },
  ];
  if (cleanPath === '/finance/entry-recognition-skills') return [
    { businessType: 'HOTEL', code: 'HOTEL_BILL', currentVersion: 1, displayConfig: {}, id: 'skill-hotel', name: '酒店账单' },
    { businessType: 'FUEL', code: 'FUEL_BILL', currentVersion: 1, displayConfig: {}, id: 'skill-fuel', name: '航油账单' },
  ];
  if (cleanPath.startsWith('/finance')) return page(genericRecords.map((item, index) => ({ ...item, amount: 12000 + index * 8600, currency: 'CNY' })));
  if (cleanPath.startsWith('/suppliers')) return configPage('suppliers');
  if (cleanPath.startsWith('/files')) return page([{ fileName: 'JM2316-放行资料.pdf', id: 1, size: 245760, status: 'AVAILABLE' }, { fileName: 'B1234-保险凭证.pdf', id: 2, size: 182400, status: 'AVAILABLE' }]);
  if (cleanPath.includes('/options') || cleanPath.includes('/suggestions')) return page(genericRecords);
  if (/\/(summary|statistics|overview|dashboard)$/.test(cleanPath)) return { items: genericRecords, total: genericRecords.length };
  if (/\/(detail|readiness)$/.test(cleanPath)) return genericRecords[0];
  return page(genericRecords);
};

self.__JETMASTER_DEMO_RESPONSE_FOR__ = responseFor;
const writeResponseFor = (path, payload) => {
  const cleanPath = path.split('?')[0];
  if (cleanPath === '/crewops/allowances/batches/automatic') return [allowanceBatch];
  if (cleanPath.includes('/crewops/allowances/rules/')) return responseFor(`/crewops/allowances/rules/${allowanceRule.id}`);
  if (cleanPath.startsWith('/master-data/expense-subjects')) return { ...expenseSubjects[0], ...payload, id: payload.id || Date.now() };
  return { ...payload, id: payload.id || `demo-${Date.now()}`, success: true, traceId: 'demo-local-write' };
};
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.includes(API_MARKER)) return;
  event.respondWith((async () => {
    if (event.request.method !== 'GET') {
      const payload = await event.request.clone().json().catch(() => ({}));
      const start = url.pathname.indexOf(API_MARKER) + API_MARKER.length - 1;
      return ok(writeResponseFor(`${url.pathname.slice(start)}${url.search}`, payload));
    }
    const start = url.pathname.indexOf(API_MARKER) + API_MARKER.length - 1;
    return ok(responseFor(`${url.pathname.slice(start)}${url.search}`));
  })());
});
