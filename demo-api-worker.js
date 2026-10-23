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
const config = self.__JETMASTER_DEMO_CONFIG__ || {};
const configPage = (key) => page(config[key] || []);
const configDetail = (key, path) => {
  const id = decodeURIComponent(path.split('/').filter(Boolean).at(-1) || '');
  return (config[key] || []).find((item) => String(item.id) === id) || null;
};

const responseFor = (path) => {
  const cleanPath = path.split('?')[0];
  const liveSnapshot = self.__JETMASTER_LIVE_SNAPSHOT__ || {};
  if (Object.prototype.hasOwnProperty.call(liveSnapshot, cleanPath)) {
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
  if (cleanPath.includes('/operations/flights/') && cleanPath.endsWith('/aggregate')) {
    const flightId = cleanPath.split('/').at(-2);
    return {
      availableActions: ['UPDATE_PLAN', 'WRITE_TODOS'],
      flight: flights.find((item) => String(item.id) === flightId) || flights[2],
      todos: tasks,
      todosVisible: true,
    };
  }
  if (cleanPath.startsWith('/operations/trips')) return page(trips);
  if (cleanPath.startsWith('/operations/flight-preparation-summaries')) return page(serviceRows);
  if (cleanPath.startsWith('/operations/service-progress')) return page(serviceRows);
  if (cleanPath.startsWith('/operations/flight-releases')) return page(releases);
  if (cleanPath === '/crewops/roster') return { events: crew.map((member, index) => ({ endTime: instant(index % 2, 10), id: index + 1, resourceId: member.id, startTime: instant(index % 2, 2), title: flights[index + 2]?.flightNo || '备勤' })), flights };
  if (cleanPath.includes('/crewops/employee-options') || cleanPath.includes('/crewops/profiles')) return page(crew);
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
  if (cleanPath === '/dictionaries/types') return config.dictionaryTypes || [];
  if (cleanPath === '/finance/flight-bill-templates') return config.billTemplates || [];
  if (cleanPath === '/crewops/allowances/rules') return config.allowanceRules || [];
  if (cleanPath === '/notifications/summary') return { total: notifications.length, unread: 1 };
  if (cleanPath.startsWith('/notifications')) return page(notifications);
  if (cleanPath.startsWith('/messaging')) return page(notifications);
  if (cleanPath.includes('/workflow/center')) return { myTasks: tasks, pendingCount: 2, recentInstances: genericRecords };
  if (cleanPath.includes('/workflow/tasks')) return page(tasks);
  if (cleanPath.startsWith('/workflow')) return page(genericRecords);
  if (cleanPath === '/finance/dashboard') return { accountsPayable: 51400, accountsReceivable: 82000, currency: 'CNY', pendingApprovals: 1, recentPayments: payments };
  if (cleanPath.includes('/finance/payment-applications')) return page(payments);
  if (cleanPath.startsWith('/finance')) return page(genericRecords.map((item, index) => ({ ...item, amount: 12000 + index * 8600, currency: 'CNY' })));
  if (cleanPath.startsWith('/suppliers')) return configPage('suppliers');
  if (cleanPath.startsWith('/files')) return page([{ fileName: 'JM2316-放行资料.pdf', id: 1, size: 245760, status: 'AVAILABLE' }, { fileName: 'B1234-保险凭证.pdf', id: 2, size: 182400, status: 'AVAILABLE' }]);
  if (cleanPath.includes('/options') || cleanPath.includes('/suggestions')) return page(genericRecords);
  if (/\/(summary|statistics|overview|dashboard)$/.test(cleanPath)) return { items: genericRecords, total: genericRecords.length };
  if (/\/(detail|readiness)$/.test(cleanPath)) return genericRecords[0];
  return page(genericRecords);
};

self.__JETMASTER_DEMO_RESPONSE_FOR__ = responseFor;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.includes(API_MARKER)) return;
  event.respondWith((async () => {
    if (event.request.method !== 'GET') return ok({ success: true, traceId: 'demo-write-disabled' });
    const start = url.pathname.indexOf(API_MARKER) + API_MARKER.length - 1;
    return ok(responseFor(`${url.pathname.slice(start)}${url.search}`));
  })());
});
