/* oxlint-disable unicorn/prefer-add-event-listener -- rerenders replace bridge-owned handlers on stable DEMO controls. */
(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') !== 'formal') return;

  document.body.classList.add('soc-formal-mode');

  let detailSnapshot = null;
  let activeTimeBasis = 'lt';

  const html = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const text = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value ?? '—';
  };

  const flightStatus = {
    AIRBORNE: ['空中', 'AIRBORNE', 'departed'],
    CANCELLED: ['已取消', 'CANCELLED', 'cancelled'],
    COMPLETED: ['已完成', 'COMPLETED', 'arrived'],
    CONFIRMED: ['已确认', 'CONFIRMED', 'planned'],
    DRAFT: ['草稿', 'DRAFT', 'planned'],
    LANDED: ['已落地', 'LANDED', 'arrived'],
    OFF_BLOCK: ['已离挡', 'OFF BLOCK', 'departed'],
    ON_BLOCK: ['已到挡', 'ON BLOCK', 'arrived'],
    ON_HOLD: ['已暂缓', 'ON HOLD', 'planned'],
    PLANNED: ['已计划', 'PLANNING', 'planned'],
    READY: ['准备就绪', 'READY', 'planned'],
    RELEASED: ['已放行', 'RELEASED', 'planned'],
  };
  const missionLabels = {
    FERRY: '调机',
    OTHER: '其他',
    PAX: '载客',
    TRAINING: '训练',
  };
  const stateTone = {
    ABSENT: 'muted',
    BLOCKED: 'blocked',
    ERROR: 'blocked',
    FORBIDDEN: 'muted',
    NOT_APPLICABLE: 'muted',
    READY: 'ready',
    WARNING: 'warning',
  };
  const stateLabel = {
    ABSENT: '尚未建立',
    BLOCKED: '阻塞',
    ERROR: '加载失败',
    FORBIDDEN: '无权查看',
    NOT_APPLICABLE: '不适用',
    READY: '就绪',
    WARNING: '注意',
  };
  const overallStatusLabel = {
    IN_EXECUTION: '执行中',
    NOT_READY: '未就绪',
    READY_FOR_EXECUTION: '可进入执行',
    READY_FOR_RELEASE: '可签署放行',
    TERMINAL: '已终态',
  };

  const formatInstant = (value, zone, options = {}) => {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('zh-CN', {
        day: options.date ? '2-digit' : undefined,
        hour: '2-digit',
        hour12: false,
        minute: '2-digit',
        month: options.date ? 'short' : undefined,
        second: options.seconds ? '2-digit' : undefined,
        timeZone: zone,
        year: options.date ? 'numeric' : undefined,
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const formatMissionInstant = (value, zone) => {
    if (!value) return { date: '—', time: '—' };
    try {
      const instant = new Date(value);
      const dateParts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        timeZone: zone,
        year: 'numeric',
      }).formatToParts(instant).map((part) => [part.type, part.value]));
      return {
        date: `${dateParts.day} ${dateParts.month.slice(0, 3).toUpperCase()} ${dateParts.year}`,
        time: new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          hour12: false,
          minute: '2-digit',
          timeZone: zone,
        }).format(instant),
      };
    } catch {
      return { date: value, time: '—' };
    }
  };

  const displayZone = (flight, endpoint) => {
    if (activeTimeBasis === 'utc') return 'UTC';
    if (activeTimeBasis === 'beijing') return 'Asia/Shanghai';
    return endpoint === 'arrival'
      ? flight.arrivalAirportTimeZone
      : flight.departureAirportTimeZone;
  };

  const basisLabel = () => activeTimeBasis === 'utc'
    ? 'UTC'
    : activeTimeBasis === 'beijing' ? 'BJ' : 'LT';

  const moduleData = (name) => detailSnapshot?.modules?.[name]?.data;
  const moduleEnvelope = (name) => detailSnapshot?.modules?.[name] || { state: 'ABSENT' };

  function post(type, payload = {}) {
    window.parent.postMessage({ type, ...payload }, window.location.origin);
  }

  function moduleFallback(moduleName, emptyText) {
    const module = moduleEnvelope(moduleName);
    if (module.state === 'READY') return '';
    const copy = module.state === 'FORBIDDEN'
      ? '当前角色无权查看此模块'
      : module.state === 'ERROR'
        ? module.error || '模块加载失败，可刷新后重试'
        : emptyText;
    const css = module.state === 'ERROR' ? 'formal-error' : 'formal-empty';
    return `<div class="${css}"><div><strong>${html(stateLabel[module.state] || '暂无数据')}</strong><span>${html(copy)}</span></div></div>`;
  }

  function renderTopbar(flight, trip) {
    const routeName = trip
      ? trip.legs.map((leg, index) => index === 0
        ? `${leg.departureAirportIcaoCode}—${leg.arrivalAirportIcaoCode}`
        : leg.arrivalAirportIcaoCode).join('—')
      : `${flight.departureAirportIcaoCode}—${flight.arrivalAirportIcaoCode}`;
    const contextLabel = document.querySelector('.crumbs > span');
    if (contextLabel) contextLabel.textContent = trip ? '行程中心' : '航班计划';
    const crumbStrong = document.querySelectorAll('.crumbs strong');
    if (crumbStrong[0]) crumbStrong[0].textContent = trip?.tripNo || flight.flightNo;
    const tripName = document.querySelector('.trip-name');
    if (tripName) tripName.textContent = routeName;
    text('#crumbLeg', flight.flightNo);
    const searchButton = document.querySelector('.top-actions .icon-btn[aria-label="搜索"]');
    if (searchButton) {
      searchButton.textContent = '刷新';
      searchButton.setAttribute('aria-label', '刷新航班详情');
      searchButton.onclick = () => post('soc:flight-detail:refresh');
    }
    const noticeButton = document.querySelector('.top-actions .icon-btn[aria-label="通知"]');
    if (noticeButton) {
      noticeButton.textContent = '航班计划';
      noticeButton.setAttribute('aria-label', '前往航班计划');
      noticeButton.onclick = () => post('soc:flight-detail:navigate', { path: '/operations/flights' });
    }
    const more = document.querySelector('.more-btn');
    if (more) more.hidden = true;
  }

  function renderTripStrip(flight, trip) {
    const flights = trip?.flights?.length ? trip.flights : [flight];
    const activeIndex = Math.max(0, flights.findIndex((item) => item.id === flight.id));
    const summary = document.querySelector('.trip-summary');
    if (summary) {
      summary.innerHTML = `<span>${trip ? '当前行程' : '当前航班'}</span><strong>${html(trip?.tripNo || flight.flightNo)}</strong><small>${html(trip?.id || flight.id)} · ${flights.length} 个航班</small>`;
    }
    const list = document.querySelector('.leg-list');
    if (list) {
      list.innerHTML = flights.map((item, index) => {
        const status = flightStatus[item.status]?.[0] || item.status;
        return `<button class="leg-card${item.id === flight.id ? ' active' : ''}${item.status === 'COMPLETED' ? ' completed' : ''}" data-formal-flight-id="${html(item.id)}" type="button"><small>航班 ${item.legSequenceNo || index + 1} · ${html(status)}</small><b>${html(item.departureAirportIcaoCode)} → ${html(item.arrivalAirportIcaoCode)}</b><span>${html(formatInstant(item.scheduledTakeoffAt, item.departureAirportTimeZone))}–${html(formatInstant(item.scheduledLandingAt, item.arrivalAirportTimeZone))} LT</span></button>`;
      }).join('');
      list.querySelectorAll('[data-formal-flight-id]').forEach((button) => button.addEventListener('click', () => {
        post('soc:flight-detail:open-flight', { flightId: button.dataset.formalFlightId });
      }));
    }
    text('#legNumber', String(activeIndex + 1));
    const pagerLabel = document.querySelector('.leg-pager span');
    if (pagerLabel) pagerLabel.innerHTML = `<b id="legNumber">${activeIndex + 1}</b> / ${flights.length}`;
    const previous = document.querySelector('#prevLeg');
    const next = document.querySelector('#nextLeg');
    if (previous) {
      previous.disabled = activeIndex === 0;
      previous.onclick = () => flights[activeIndex - 1] && post('soc:flight-detail:open-flight', { flightId: flights[activeIndex - 1].id });
    }
    if (next) {
      next.disabled = activeIndex === flights.length - 1;
      next.onclick = () => flights[activeIndex + 1] && post('soc:flight-detail:open-flight', { flightId: flights[activeIndex + 1].id });
    }
  }

  function renderTabs() {
    const aggregate = detailSnapshot.aggregate;
    const crew = moduleData('crew');
    const requirements = moduleData('requirements');
    const services = moduleData('services') || [];
    const release = moduleData('release');
    const movements = moduleData('movements');
    const reports = moduleData('reports');
    const closeout = moduleData('closeout');
    const billing = moduleData('billing');
    const fuelReports = reports?.reports?.filter((item) => item.current && item.reportType === 'FUEL_REMAINING') || [];
    const counts = {
      billing: billing ? [...(billing.flightItems || []), ...(billing.tripItems || [])].length : undefined,
      compliance: release?.currentRevision?.checks?.filter((item) => item.status === 'BLOCKED' || item.status === 'PENDING').length,
      crew: crew?.assignment?.members?.length,
      documents: closeout?.items?.filter((item) => item.type === 'FILE' && item.status === 'SATISFIED').length,
      flight: aggregate.flight.aircraftRegistration ? 1 : 0,
      fuel: fuelReports.length,
      messages: (movements?.events?.filter((item) => item.current).length || 0) + (reports?.reports?.filter((item) => item.current).length || 0),
      passengers: requirements?.passengerCount,
      postflight: closeout ? closeout.items.length + closeout.issues.length : undefined,
      services: services.flatMap((row) => row.nodes || []).length,
    };
    document.querySelectorAll('.tab').forEach((tab) => {
      const badge = tab.querySelector('em');
      const count = counts[tab.dataset.tab];
      if (!badge) return;
      badge.hidden = count === undefined;
      badge.innerHTML = `<i></i><span>${html(count ?? '')}</span>`;
      badge.className = `tab-module-status ${count === 0 ? 'warning' : 'ready'}`;
      badge.setAttribute('aria-label', count === undefined ? '' : `${count} 项`);
      badge.setAttribute('title', count === undefined ? '' : `${count} 项`);
    });
  }

  function renderHero() {
    const flight = detailSnapshot.aggregate.flight;
    const crew = moduleData('crew');
    const requirements = moduleData('requirements');
    const depZone = displayZone(flight, 'departure');
    const arrZone = displayZone(flight, 'arrival');
    const departure = formatMissionInstant(flight.scheduledTakeoffAt, depZone);
    const arrival = formatMissionInstant(flight.scheduledLandingAt, arrZone);
    const durationMinutes = Math.max(0, Math.round((Date.parse(flight.scheduledLandingAt) - Date.parse(flight.scheduledTakeoffAt)) / 60000));
    text('#depCode', flight.departureAirportIcaoCode);
    text('#depName', flight.departureAirportName);
    text('#arrCode', flight.arrivalAirportIcaoCode);
    text('#arrName', flight.arrivalAirportName);
    text('#flightDuration', `${Math.floor(durationMinutes / 60)}H ${String(durationMinutes % 60).padStart(2, '0')}M`);
    text('#flightDistance', `${flight.flightNo} · ${flight.operatingCompanyCode}`);
    const depTime = document.querySelector('#depTime');
    const arrTime = document.querySelector('#arrTime');
    if (depTime) depTime.innerHTML = `<span>${html(departure.date)}</span><b>${html(departure.time)} <small>${basisLabel()}</small></b>`;
    if (arrTime) arrTime.innerHTML = `<span>${html(arrival.date)}</span><b>${html(arrival.time)} <small>${basisLabel()}</small></b>`;
    const status = flightStatus[flight.status] || [flight.status, flight.status, 'planned'];
    const movementStatus = document.querySelector('#movementStatus');
    if (movementStatus) {
      movementStatus.className = `movement-status is-${status[2]}`;
      text('#movementStatus span', status[1]);
    }
    text('.trip-type', missionLabels[flight.missionType] || flight.missionType);
    text('#flightTaskType', missionLabels[flight.missionType] || flight.missionType);
    text('#aircraftModel', flight.aircraftModel || '未分配');
    text('#aircraftRegistration', flight.aircraftRegistration || '—');
    const summary = document.querySelector('.mission-aircraft-summary');
    if (summary) {
      const crewCount = crew?.assignment?.members?.length || 0;
      summary.innerHTML = `<span>执行飞机</span><strong><b>${html(flight.aircraftModel || '未分配')}</b> · <b>${html(flight.aircraftRegistration || '—')}</b></strong><span>任务人员</span><strong>${requirements ? `${requirements.passengerCount} PAX` : 'PAX —'} · ${crewCount} CREW</strong>`;
    }
  }

  function readinessDimension(code) {
    return moduleData('readiness')?.dimensions?.find((item) => item.code === code);
  }

  function renderResourceTile(tile, config) {
    if (!tile) return;
    const tone = stateTone[config.state] || 'muted';
    tile.classList.remove('is-ready', 'is-warning', 'is-blocked');
    tile.classList.add(tone === 'ready' ? 'is-ready' : tone === 'blocked' ? 'is-blocked' : 'is-warning');
    const content = tile.querySelector('div');
    if (!content) return;
    const percentage = config.state === 'READY' ? '100%' : config.state === 'BLOCKED' ? '0%' : '—';
    content.innerHTML = `<b>${html(config.name)}</b><strong>${percentage}</strong><span>${html(config.summary)}</span><em>${html(config.detail)}</em>`;
  }

  function drawReadiness(percent) {
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
    const center = size / 2;
    const radius = size * .405;
    const ringWidth = Math.max(13, size * .065);
    context.lineWidth = ringWidth;
    context.beginPath();
    context.arc(center, center, radius, -Math.PI / 2, Math.PI * 1.5);
    context.strokeStyle = tokens.getPropertyValue('--sj-surface-3').trim() || '#151b26';
    context.stroke();
    context.beginPath();
    context.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * percent / 100);
    context.strokeStyle = tokens.getPropertyValue('--sj-lime').trim() || '#a3e635';
    context.stroke();
  }

  function renderReadiness() {
    const flight = detailSnapshot.aggregate.flight;
    const readiness = moduleData('readiness');
    const crew = moduleData('crew');
    const requirements = moduleData('requirements');
    const services = moduleData('services') || [];
    const release = moduleData('release');
    const closeout = moduleData('closeout');
    const reports = moduleData('reports');
    const fuelPlan = moduleData('detailResources')?.fuelPlan;
    const tiles = document.querySelectorAll('.resource-command .resource-tile');
    const dimensions = readiness?.dimensions || [];
    const applicable = dimensions.filter((item) => item.state !== 'NOT_APPLICABLE');
    const ready = applicable.filter((item) => item.state === 'READY').length;
    const percent = applicable.length ? Math.round(ready / applicable.length * 100) : 0;
    const serviceNodes = services.flatMap((row) => row.nodes || []);
    const completedService = serviceNodes.filter((node) => ['COMPLETED', 'WAIVED'].includes(node.status)).length;
    const fuelReport = reports?.reports?.filter((item) => item.current && item.reportType === 'FUEL_REMAINING').at(-1);
    const configs = [
      { detail: flight.aircraftRegistration ? '来自航班计划的真实飞机事实' : '航班尚未分配飞机', name: '飞机', state: flight.aircraftRegistration ? 'READY' : 'BLOCKED', summary: `${flight.aircraftModel || '未分配'} · ${flight.aircraftRegistration || '—'}` },
      { detail: readinessDimension('CREW_PUBLICATION')?.message || '尚无正式排班事实', name: '机组', state: readinessDimension('CREW_PUBLICATION')?.state || (crew ? 'WARNING' : moduleEnvelope('crew').state), summary: crew?.assignment?.members?.length ? `${crew.assignment.members.length} 名成员` : '尚未排班' },
      { detail: fuelPlan ? `计划 V${fuelPlan.version} · ${fuelPlan.updatedByName}` : fuelReport ? `上报于 ${formatInstant(fuelReport.occurredAt, flight.departureAirportTimeZone)}` : '尚未建立正式燃油计划', name: '燃油', state: fuelPlan || fuelReport ? 'READY' : 'WARNING', summary: fuelPlan ? `起飞前 ${fuelPlan.beforeDeparture} ${fuelPlan.unit}` : fuelReport ? `剩余 ${fuelReport.remainingFuelKg ?? '—'} KG` : '暂无真实燃油数据' },
      { detail: closeout ? `运行收尾 ${stateLabel[closeout.closeout.status] || closeout.closeout.status}` : '文件组合能力尚未接入', name: '文件', state: closeout ? 'WARNING' : 'NOT_APPLICABLE', summary: closeout ? `${closeout.items.filter((item) => item.status === 'SATISFIED').length} / ${closeout.items.length} 已满足` : '未接入' },
      { detail: readinessDimension('RELEASE_CHECKS')?.message || '尚未建立飞行放行', name: '许可', state: readinessDimension('RELEASE_CHECKS')?.state || (release ? 'WARNING' : moduleEnvelope('release').state), summary: release ? `放行修订 V${release.currentRevision.revisionNo}` : '尚未建立放行单' },
      { detail: readinessDimension('FLIGHT_PLAN')?.message || '航班计划状态', name: '时刻', state: readinessDimension('FLIGHT_PLAN')?.state || 'WARNING', summary: `${flight.departureAirportIcaoCode} ${formatInstant(flight.scheduledTakeoffAt, flight.departureAirportTimeZone)} → ${flight.arrivalAirportIcaoCode} ${formatInstant(flight.scheduledLandingAt, flight.arrivalAirportTimeZone)} LT` },
      { detail: readinessDimension('SERVICE')?.message || '保障节点按正式实例统计', name: '地面保障', state: readinessDimension('SERVICE')?.state || moduleEnvelope('services').state, summary: serviceNodes.length ? `${completedService} / ${serviceNodes.length} 节点完成` : '暂无保障节点' },
      { detail: readinessDimension('REQUIREMENT')?.message || '内部任务可能不适用运行需求', name: '旅客', state: readinessDimension('REQUIREMENT')?.state || moduleEnvelope('requirements').state, summary: requirements ? `${requirements.passengerCount} 名旅客 · ${requirements.status}` : '尚无需求摘要' },
    ];
    configs.forEach((config, index) => renderResourceTile(tiles[index], config));
    const core = document.querySelector('.readiness-core');
    if (core) {
      core.setAttribute('aria-label', `整体准备度 ${percent}%`);
      const value = core.querySelector('strong');
      if (value) value.innerHTML = `${percent}<small>%</small>`;
      text('.readiness-core b', readiness ? overallStatusLabel[readiness.overallStatus] || readiness.overallStatus : '暂不可用');
    }
    drawReadiness(percent);
  }

  function currentMovement(type) {
    return moduleData('movements')?.events?.find((item) => item.current && item.eventType === type);
  }

  function renderPhases() {
    const flight = detailSnapshot.aggregate.flight;
    const phaseBoard = document.querySelector('.flight-phase-board');
    if (!phaseBoard) return;
    const sources = moduleData('dynamicSources') || [];
    const sourceLabel = sources.filter((item) => item.status === 'AVAILABLE').map((item) => item.displayName).join(' / ') || '人工事实';
    const phaseDefinitions = [
      ['计划确认', flight.updatedAt, !['DRAFT', 'PLANNED'].includes(flight.status), '航班计划'],
      ['撤轮挡', flight.actualOffBlockAt || flight.estimatedOffBlockAt || flight.scheduledOffBlockAt, Boolean(flight.actualOffBlockAt), currentMovement('ACTUAL_OFF_BLOCK')?.source || sourceLabel],
      ['起飞', flight.actualTakeoffAt || flight.estimatedTakeoffAt || flight.scheduledTakeoffAt, Boolean(flight.actualTakeoffAt), currentMovement('ACTUAL_TAKEOFF')?.source || sourceLabel],
      ['巡航', flight.actualTakeoffAt || flight.estimatedTakeoffAt, flight.status === 'AIRBORNE', sourceLabel],
      ['落地', flight.actualLandingAt || flight.estimatedLandingAt || flight.scheduledLandingAt, Boolean(flight.actualLandingAt), currentMovement('ACTUAL_LANDING')?.source || sourceLabel],
      ['挡轮挡', flight.actualOnBlockAt || flight.estimatedOnBlockAt || flight.scheduledOnBlockAt, Boolean(flight.actualOnBlockAt), currentMovement('ACTUAL_ON_BLOCK')?.source || sourceLabel],
    ];
    const firstPending = phaseDefinitions.findIndex((item) => !item[2]);
    const list = phaseBoard.querySelector('.flight-phase-list');
    if (list) {
      list.innerHTML = phaseDefinitions.map((item, index) => {
        const complete = Boolean(item[2]);
        const current = index === firstPending;
        return `<li class="${complete ? 'is-complete' : current ? 'is-current' : ''}"><span class="phase-node"></span><time>${html(formatInstant(item[1], displayZone(flight, index >= 4 ? 'arrival' : 'departure')))}</time><div><b>${html(item[0])}</b><small>${html(item[3])} <span class="phase-source">${html(basisLabel())}</span></small></div><em>${complete ? '完成' : current ? '当前' : '待执行'}</em></li>`;
      }).join('');
    }
    text('.mission-dynamic-head em', flightStatus[flight.status]?.[0] || flight.status);
    const countdown = phaseBoard.querySelector('.mission-countdown > span');
    const countdownValue = phaseBoard.querySelector('.mission-countdown > strong');
    if (countdown) countdown.textContent = flight.actualTakeoffAt ? '当前阶段' : '距计划起飞';
    if (countdownValue) {
      const milliseconds = Date.parse(flight.scheduledTakeoffAt) - Date.now();
      if (flight.actualTakeoffAt || milliseconds <= 0) countdownValue.textContent = flightStatus[flight.status]?.[1] || flight.status;
      else {
        const minutes = Math.floor(milliseconds / 60000);
        countdownValue.textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`;
      }
    }
    const logButton = phaseBoard.querySelector('.mission-dynamic-head button');
    if (logButton) logButton.onclick = () => switchTab('messages');
  }

  function sectionHeading(title, meta = '') {
    return `<div class="section-heading"><div><h2>${html(title)}</h2></div>${meta ? `<span>${html(meta)}</span>` : ''}</div>`;
  }

  function renderFlightSection() {
    const flight = detailSnapshot.aggregate.flight;
    const trip = moduleData('trip');
    const section = document.querySelector('#flight');
    if (!section) return;
    section.innerHTML = `${sectionHeading('飞机信息与航班计划', `数据版本 V${flight.version}`)}<div class="formal-module-grid"><div><span>行程编号</span><b>${html(trip?.tripNo || '独立航班')}</b></div><div><span>航段标识</span><b>${html(flight.tripLegId || '—')}</b></div><div><span>航班号</span><b>${html(flight.flightNo)}</b></div><div><span>任务类型</span><b>${html(missionLabels[flight.missionType] || flight.missionType)}</b></div><div><span>运行公司</span><b>${html(`${flight.operatingCompanyCode} · ${flight.operatingCompanyName}`)}</b></div><div><span>负责人</span><b>${html(flight.ownerName)}</b></div><div><span>飞机注册号</span><b>${html(flight.aircraftRegistration || '未分配')}</b></div><div><span>机型</span><b>${html(flight.aircraftModel || '—')}</b></div><div><span>运行日期</span><b>${html(flight.operatingDate)}</b></div></div>${flight.remarks ? `<div class="card formal-state"><div><strong>航班备注</strong><span>${html(flight.remarks)}</span></div></div>` : ''}<div class="formal-empty"><div><strong>故障保留 / MEL</strong><span>正式系统尚未接入 MEL 数据所有者，不展示 DEMO 静态故障记录。</span></div></div>`;
  }

  function renderCrewSection() {
    const section = document.querySelector('#crew');
    if (!section) return;
    const fallback = moduleFallback('crew', '当前航班尚未建立机组任务');
    if (fallback) {
      section.innerHTML = `${sectionHeading('机组配置')}${fallback}`;
      return;
    }
    const assignment = moduleData('crew')?.assignment;
    const members = assignment?.members || [];
    section.innerHTML = `${sectionHeading('机组配置', assignment ? `${members.length} 人 · ${assignment.validationStatus || '待确认'}` : '尚未排班')}<div class="formal-list">${members.length ? members.map((member) => `<article><span><b>${html(member.dutyRole || member.role || '机组')}</b><small>${member.primaryDuty ? '主执勤' : '非主执勤'}</small></span><span><b>${html(member.employeeName || member.crewName || member.name || '—')}</b><small>${html(member.crewNo || member.crewProfileId || '—')}</small></span><span><b class="formal-badge ${stateTone[member.validationStatus] || 'warning'}">${html(member.validationStatus || assignment.validationStatus || '待确认')}</b><small>证件与执照请在机组档案查看</small></span></article>`).join('') : '<div class="formal-empty"><div><strong>尚未排班</strong><span>当前航班没有机组成员。</span></div></div>'}</div>`;
  }

  function renderRequirementSection() {
    const section = document.querySelector('#passengers');
    if (!section) return;
    const fallback = moduleFallback('requirements', '当前航班尚未生成运行需求摘要');
    if (fallback) {
      section.innerHTML = `${sectionHeading('旅客与运行需求')}${fallback}`;
      return;
    }
    const requirements = moduleData('requirements');
    section.innerHTML = `${sectionHeading('旅客与运行需求', `${requirements.passengerCount} 名旅客 · V${requirements.requirementVersionNo}`)}<div class="formal-readiness-summary"><div><span>成人</span><b>${requirements.adultCount}</b></div><div><span>儿童</span><b>${requirements.childCount}</b></div><div><span>婴儿</span><b>${requirements.infantCount}</b></div><div><span>需求状态</span><b>${html(requirements.status)}</b></div></div><div class="formal-list">${requirements.items.length ? requirements.items.map((item) => `<article><span><b>${html(item.category)}</b><small>${html(item.applicability)}</small></span><span><b>${html(item.summary)}</b><small>${item.mandatory ? '强制需求' : '可选需求'}</small></span><span><b>${item.quantity}</b><small>数量</small></span></article>`).join('') : '<div class="formal-empty"><div><strong>无额外运行需求</strong><span>需求摘要已生成，但没有可见需求项。</span></div></div>'}</div><div class="formal-empty"><div><strong>旅客证件与行程文件</strong><span>正式证件文件能力尚未接入，不展示 DEMO 样例文件。</span></div></div>`;
  }

  function renderServicesSection() {
    const section = document.querySelector('#services');
    if (!section) return;
    const rows = moduleData('services') || [];
    const resources = moduleData('detailResources');
    const canWriteResources = resources?.availableActions?.includes('WRITE');
    const ground = resources?.groundService;
    const meal = resources?.mealPlan;
    const groundSummary = ground
      ? `<div class="formal-readiness-summary"><div><span>起飞站地点</span><b>${html(ground.departure?.location?.name || '待配置')}</b></div><div><span>到达站地点</span><b>${html(ground.arrival?.location?.name || '待配置')}</b></div><div><span>保障人</span><b>${(ground.departure?.contacts?.length || 0) + (ground.arrival?.contacts?.length || 0)}</b></div><div><span>配置版本</span><b>V${ground.version}</b></div></div>`
      : '<div class="formal-empty"><div><strong>尚未配置地面保障信息</strong><span>可维护起降站地点、路线和保障联系人。</span></div></div>';
    const mealSummary = meal
      ? `<div class="formal-state"><div><strong>餐单 ${html(meal.status)}</strong><span>${meal.groups?.length || 0} 个分组 · ${(meal.groups || []).reduce((total, group) => total + (group.dishes?.length || 0), 0)} 道菜 · V${meal.version}</span></div></div>`
      : '<div class="formal-empty"><div><strong>尚未建立餐单</strong><span>可按餐单和分组维护菜品。</span></div></div>';
    const nodes = rows.flatMap((row) => row.nodes || []);
    section.innerHTML = `${sectionHeading('地面保障与餐食', `${nodes.length} 个执行节点`)}${groundSummary}${mealSummary}<div class="formal-action-grid">${canWriteResources ? '<button class="primary-btn" data-formal-action="ground-edit" type="button">维护保障配置</button><button data-formal-action="meal-edit" type="button">维护餐单</button>' : ''}<button data-formal-nav="/operations/service-progress" type="button">保障进程</button></div>${nodes.length ? `<div class="module-subheading"><div><h3>执行节点</h3></div></div><div class="formal-list">${nodes.map((node) => `<article><span><b>${html(node.name)}</b><small>${html(node.code)}</small></span><span><b>${html(node.status)}</b><small>${html(node.responsibilityRole || '未指定责任角色')}</small></span></article>`).join('')}</div>` : ''}`;
  }

  function renderReleaseSection() {
    const section = document.querySelector('#compliance');
    if (!section) return;
    const permits = moduleData('detailResources')?.permits || [];
    const canWritePermits = moduleData('detailResources')?.availableActions?.includes('WRITE');
    const permitList = `<div class="module-subheading"><div><h3>许可与时刻</h3></div><span>${permits.length} 条</span></div><div class="formal-list">${permits.length ? permits.map((permit) => `<article><span><b>${html(permit.permitType)}</b><small>V${permit.version}</small></span><span><b>${html(permit.description)}</b><small>${html(permit.updatedByName)}</small></span><span><b class="formal-badge ${permit.status === 'APPROVED' || permit.status === 'NOT_REQUIRED' ? 'ready' : 'warning'}">${html(permit.status)}</b><small>${html(formatInstant(permit.updatedAt, 'Asia/Shanghai'))}</small></span></article>`).join('') : '<div class="formal-empty"><div><strong>暂无许可记录</strong><span>新增后会持久化到正式后端。</span></div></div>'}</div>${canWritePermits ? '<button class="primary-btn" data-formal-action="open-permits" type="button">维护许可</button>' : ''}`;
    const fallback = moduleFallback('release', '当前航班尚未建立飞行放行单');
    if (fallback) {
      section.innerHTML = `${sectionHeading('批复 / 许可与飞行放行')}${permitList}${fallback}<button data-formal-nav="/operations/flight-release" type="button">前往飞行放行</button>`;
      return;
    }
    const release = moduleData('release');
    const checks = release.currentRevision?.checks || [];
    section.innerHTML = `${sectionHeading('批复 / 许可与飞行放行', `修订 V${release.currentRevision.revisionNo} · ${release.currentRevision.status}`)}${permitList}<div class="module-subheading"><div><h3>飞行放行</h3></div></div><div class="formal-readiness-summary"><div><span>放行状态</span><b>${html(release.currentRevision.status)}</b></div><div><span>检查结论</span><b>${checks.filter((item) => ['PASSED', 'NOT_APPLICABLE'].includes(item.status)).length} / ${checks.length}</b></div><div><span>签署人</span><b>${html(release.currentRevision.signedByName || '尚未签署')}</b></div><div><span>签署时间</span><b>${html(formatInstant(release.currentRevision.signedAt, release.flight.departureAirportTimeZone))}</b></div></div><div class="formal-list">${checks.map((check) => `<article><span><b>${html(check.checkName)}</b><small>${html(check.checkCode)}</small></span><span><b class="formal-badge ${stateTone[check.status === 'PASSED' ? 'READY' : check.status] || 'warning'}">${html(check.status)}</b><small>${html(check.reason || check.remarks || '无补充说明')}</small></span><span><b>${check.evidence?.length || 0}</b><small>证据文件</small></span></article>`).join('')}</div><button data-formal-nav="/operations/flight-release" type="button">前往飞行放行</button>`;
  }

  function renderFuelSection() {
    const section = document.querySelector('#fuel');
    if (!section) return;
    const resources = moduleData('detailResources');
    const plan = resources?.fuelPlan;
    const canWrite = resources?.availableActions?.includes('WRITE');
    const reports = moduleData('reports')?.reports?.filter((item) => item.current && item.reportType === 'FUEL_REMAINING') || [];
    const total = plan ? Number(plan.beforeRefuel) + Number(plan.uplift) : 0;
    const planContent = plan
      ? `<div class="formal-readiness-summary"><div><span>起飞前存量</span><b>${html(plan.beforeDeparture)} ${html(plan.unit)}</b></div><div><span>起飞后剩余</span><b>${html(plan.afterDeparture)} ${html(plan.unit)}</b></div><div><span>加油前存量</span><b>${html(plan.beforeRefuel)} ${html(plan.unit)}</b></div><div><span>新增加注 / 加油后</span><b>${html(plan.uplift)} / ${html(total)} ${html(plan.unit)}</b></div></div><div class="formal-state"><div><strong>燃油计划 V${plan.version}</strong><span>${html(plan.updatedByName)} · ${html(formatInstant(plan.updatedAt, 'Asia/Shanghai'))}</span></div></div>`
      : '<div class="formal-empty"><div><strong>尚未建立燃油计划</strong><span>可维护起飞、飞行及加油节点燃油。</span></div></div>';
    section.innerHTML = `${sectionHeading('燃油计划', plan ? `V${plan.version} · 已持久化` : '尚未保存')}${planContent}<div class="formal-action-grid">${canWrite ? '<button class="primary-btn" data-formal-action="fuel-edit" type="button">维护燃油计划</button>' : ''}<button data-formal-action="open-reports" type="button">记录或纠正剩余燃油报告</button></div><div class="module-subheading"><div><h3>剩余燃油运行报告</h3></div><span>${reports.length} 条</span></div><div class="formal-list">${reports.length ? reports.map((report) => `<article><span><b>剩余燃油 ${html(report.remainingFuelKg ?? '—')} KG</b><small>最低燃油 ${html(report.minimumFuelKg ?? '—')} KG</small></span><span><b>${html(report.reporterName)}</b><small>${html(report.source)}</small></span><span><b>${html(formatInstant(report.occurredAt, detailSnapshot.aggregate.flight.departureAirportTimeZone))}</b><small>${html(report.content || '无补充说明')}</small></span></article>`).join('') : '<div class="formal-empty"><div><strong>暂无剩余燃油报告</strong><span>燃油计划与实际运行报告分别保存。</span></div></div>'}</div>`;
  }

  function renderMessagesSection() {
    const section = document.querySelector('#messages');
    if (!section) return;
    const movementFallback = moduleFallback('movements', '暂无航班动态');
    const reportFallback = moduleFallback('reports', '暂无运行报告');
    const movements = moduleData('movements')?.events?.filter((item) => item.current) || [];
    const reports = moduleData('reports')?.reports?.filter((item) => item.current) || [];
    const sources = moduleData('dynamicSources') || [];
    section.innerHTML = `${sectionHeading('报文与运行监控', `${movements.length} 条动态 · ${reports.length} 条报告`)}<div class="formal-readiness-summary">${sources.length ? sources.map((source) => `<div><span>${html(source.displayName)}</span><b>${html(source.status === 'AVAILABLE' ? '已接入' : '未接入')}</b></div>`).join('') : '<div><span>动态来源</span><b>仅人工事实</b></div>'}</div><div class="module-subheading"><div><h3>航班动态</h3></div></div>${movementFallback || `<div class="formal-list">${movements.map((event) => `<article><span><b>${html(event.eventType)}</b><small>${html(event.source)}</small></span><span><b>${html(formatInstant(event.eventTime, detailSnapshot.aggregate.flight.departureAirportTimeZone, { date: true }))}</b><small>${html(event.createdByName)}</small></span><span><b>${event.correctionReason ? '已纠正' : '当前事实'}</b><small>${html(event.remarks || '无补充说明')}</small></span></article>`).join('')}</div>`}<div class="module-subheading"><div><h3>运行报告</h3></div></div>${reportFallback || `<div class="formal-list">${reports.length ? reports.map((report) => `<article><span><b>${html(report.reportType)}</b><small>${html(report.severity || 'INFO')}</small></span><span><b>${html(report.reporterName)}</b><small>${html(report.source)}</small></span><span><b>${html(formatInstant(report.occurredAt, detailSnapshot.aggregate.flight.departureAirportTimeZone, { date: true }))}</b><small>${html(report.content || '无补充说明')}</small></span></article>`).join('') : '<div class="formal-empty"><div><strong>暂无运行报告</strong><span>当前航班尚未上报运行信息。</span></div></div>'}</div>`}<div class="formal-state"><div><strong>原始 ACARS / ADS-B 报文</strong><span>外部数据源未接入时不展示 DEMO 静态报文。</span></div></div>`;
  }

  function renderDocumentsSection() {
    const section = document.querySelector('#documents');
    if (!section) return;
    const closeout = moduleData('closeout');
    const fileItems = closeout?.items?.filter((item) => item.type === 'FILE') || [];
    section.innerHTML = `${sectionHeading('航班文件', fileItems.length ? `${fileItems.filter((item) => item.status === 'SATISFIED').length} / ${fileItems.length} 已具备` : '文件组合能力未接入')}<div class="formal-list">${fileItems.length ? fileItems.map((item) => `<article><span><b>${html(item.name)}</b><small>${html(item.code)}</small></span><span><b class="formal-badge ${item.status === 'SATISFIED' ? 'ready' : 'warning'}">${html(item.status)}</b><small>${html(item.instructions || '无补充说明')}</small></span><span><b>${html(item.fileName || '—')}</b><small>${html(formatInstant(item.updatedAt, 'Asia/Shanghai'))}</small></span></article>`).join('') : '<div class="formal-empty"><div><strong>文件组合未接入</strong><span>不展示 DEMO 的样例 PDF；正式组合导出将在独立能力接入后启用。</span></div></div>'}</div>`;
  }

  function renderBillingSection() {
    const section = document.querySelector('#billing');
    if (!section) return;
    const fallback = moduleFallback('billing', '当前航班账单尚未生成');
    if (fallback) {
      section.innerHTML = `${sectionHeading('账单管理')}${fallback}`;
      return;
    }
    const billing = moduleData('billing');
    const items = [...(billing.flightItems || []), ...(billing.tripItems || [])];
    section.innerHTML = `${sectionHeading('账单管理', `${billing.bill.templateName} · ${billing.bill.status}`)}<div class="formal-readiness-summary"><div><span>费用项</span><b>${items.length}</b></div><div><span>待记录</span><b>${items.filter((item) => ['EXPECTED', 'ESTIMATED'].includes(item.status)).length}</b></div><div><span>已收单</span><b>${items.filter((item) => item.documentCount > 0).length}</b></div><div><span>完整性</span><b>${billing.requiredComplete ? '已完整' : '待补充'}</b></div></div><div class="formal-list">${items.map((item) => `<article><span><b>${html(item.name)}</b><small>${html(item.code)} · ${html(item.currency)}</small></span><span><b class="formal-badge ${item.status === 'VERIFIED' ? 'ready' : 'warning'}">${html(item.status)}</b><small>${html(item.supplierName || item.note || '未指定供应商')}</small></span><span><b>${html(item.actualAmount ?? item.estimatedAmount ?? '—')}</b><small>${item.documentCount} 份单据</small></span></article>`).join('')}</div>`;
  }

  function renderCloseoutSection() {
    const section = document.querySelector('#postflight');
    if (!section) return;
    const fallback = moduleFallback('closeout', '航班完成并记录实际挡轮挡后进入运行收尾');
    if (fallback) {
      section.innerHTML = `${sectionHeading('航后日志与运行收尾')}${fallback}`;
      return;
    }
    const closeout = moduleData('closeout');
    section.innerHTML = `${sectionHeading('航后日志与运行收尾', `${closeout.closeout.templateName} · ${closeout.closeout.status}`)}<div class="formal-readiness-summary"><div><span>收尾项目</span><b>${closeout.items.length}</b></div><div><span>已满足</span><b>${closeout.items.filter((item) => item.status === 'SATISFIED').length}</b></div><div><span>开放问题</span><b>${closeout.issues.filter((item) => item.status === 'OPEN').length}</b></div><div><span>阻断项</span><b>${closeout.blockers.length}</b></div></div><div class="formal-list">${closeout.items.map((item) => `<article><span><b>${html(item.name)}</b><small>${html(item.code)}</small></span><span><b class="formal-badge ${item.status === 'SATISFIED' ? 'ready' : 'warning'}">${html(item.status)}</b><small>${item.mandatory ? '强制项目' : '普通项目'}</small></span><span><b>${html(item.completedByName || '—')}</b><small>${html(formatInstant(item.completedAt || item.updatedAt, 'Asia/Shanghai'))}</small></span></article>`).join('')}</div><button class="primary-btn" data-formal-action="open-closeout" type="button">维护运行收尾</button>`;
  }

  function renderSidePanel() {
    const side = document.querySelector('.rightbar');
    if (!side) return;
    const errors = Object.entries(detailSnapshot.modules)
      .filter(([, module]) => module.state === 'ERROR')
      .map(([name, module]) => `${name}：${module.error || '加载失败'}`);
    const todos = detailSnapshot.aggregate.todos || [];
    const actions = new Set(detailSnapshot.aggregate.availableActions || []);
    const movementModule = moduleData('movements');
    const currentMovements = movementModule?.events?.filter((event) => event.current) || [];
    const actionButtons = [
      actions.has('UPDATE_PLAN') ? '<button type="button" data-flight-action="edit">编辑计划</button>' : '',
      actions.has('CONFIRM') ? '<button class="primary-btn" type="button" data-flight-action="confirm">确认航班</button>' : '',
      actions.has('HOLD') ? '<button type="button" data-flight-control="hold">暂停航班</button>' : '',
      actions.has('RESUME') ? '<button type="button" data-flight-control="resume">恢复航班</button>' : '',
      actions.has('REPLACE') ? '<button type="button" data-flight-action="replace">创建替代航班</button>' : '',
      actions.has('CANCEL') ? '<button class="danger-btn" type="button" data-flight-control="cancel">取消航班</button>' : '',
      movementModule?.availableActions?.some((action) => action.startsWith('RECORD_')) ? '<button type="button" data-flight-action="movement">记录动态</button>' : '',
    ].filter(Boolean).join('');
    const correctionButtons = movementModule?.availableActions?.includes('CORRECT')
      ? currentMovements.map((event) => `<button type="button" data-movement-correct="${html(event.id)}">纠正 ${html(event.eventType)}</button>`).join('')
      : '';
    side.innerHTML = `<section class="side-section"><div class="side-title"><h3>航班操作</h3><b class="side-count">${actions.size}</b></div>${actionButtons ? `<div class="formal-action-grid">${actionButtons}</div>` : '<div class="formal-empty"><div><strong>当前状态无可用操作</strong><span>操作项由权限和航班状态共同决定。</span></div></div>'}${correctionButtons ? `<details class="formal-correction-list"><summary>纠正当前动态</summary><div>${correctionButtons}</div></details>` : ''}</section><section class="side-section"><div class="side-title"><h3>数据状态</h3><b class="side-count">${errors.length}</b></div>${errors.length ? `<div class="formal-error"><div><strong>部分模块加载失败</strong><span>${errors.map(html).join('<br>')}</span></div></div>` : '<div class="formal-state"><div><strong>真实数据已同步</strong><span>页面仅展示正式接口返回的业务事实。</span></div></div>'}</section><section class="side-section"><div class="side-title"><h3>普通协作待办</h3><b class="side-count">${todos.length}</b></div><div class="formal-list">${todos.length ? todos.map((todo) => `<article class="formal-todo-row ${todo.status === 'COMPLETED' ? 'is-completed' : ''}" data-formal-todo-toggle="${html(todo.id)}" role="button" tabindex="0"><span><b>${html(todo.status === 'COMPLETED' ? '已完成' : '待处理')}</b><small>${html(todo.assigneeName || '未指定负责人')}</small></span><span><b>${html(todo.content)}</b><small>${html(todo.createdByName)} · ${html(formatInstant(todo.updatedAt, 'Asia/Shanghai'))}</small></span>${detailSnapshot.canWriteTodos ? `<span><button class="formal-todo-delete" data-formal-todo-delete="${html(todo.id)}" type="button" aria-label="删除待办">删除</button></span>` : '<span></span>'}</article>`).join('') : '<div class="formal-empty"><div><strong>暂无待办</strong><span>普通协作待办不代表准备度阻断。</span></div></div>'}</div>${detailSnapshot.canWriteTodos ? '<div class="formal-todo-composer"><input id="formalTodoInput" maxlength="200" placeholder="填写普通协作待办"><button class="primary-btn" id="formalTodoCreate" type="button">添加</button></div>' : ''}</section>`;
    side.querySelector('[data-flight-action="edit"]')?.addEventListener('click', () => post('soc:flight-detail:flight-edit'));
    side.querySelector('[data-flight-action="confirm"]')?.addEventListener('click', () => post('soc:flight-detail:flight-confirm'));
    side.querySelector('[data-flight-action="replace"]')?.addEventListener('click', () => post('soc:flight-detail:flight-replace'));
    side.querySelector('[data-flight-action="movement"]')?.addEventListener('click', () => post('soc:flight-detail:movement-record'));
    side.querySelectorAll('[data-flight-control]').forEach((button) => button.addEventListener('click', () => {
      post('soc:flight-detail:flight-control', { action: button.dataset.flightControl });
    }));
    side.querySelectorAll('[data-movement-correct]').forEach((button) => button.addEventListener('click', () => {
      post('soc:flight-detail:movement-correct', { eventId: button.dataset.movementCorrect });
    }));
    side.querySelectorAll('[data-formal-todo-toggle]').forEach((button) => button.addEventListener('click', (event) => {
      if (event.target.closest('[data-formal-todo-delete]')) return;
      post('soc:flight-detail:todo-toggle', { todoId: button.dataset.formalTodoToggle });
    }));
    side.querySelectorAll('[data-formal-todo-toggle]').forEach((button) => button.addEventListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key) || event.target.closest('[data-formal-todo-delete]')) return;
      event.preventDefault();
      post('soc:flight-detail:todo-toggle', { todoId: button.dataset.formalTodoToggle });
    }));
    side.querySelectorAll('[data-formal-todo-delete]').forEach((button) => button.addEventListener('click', (event) => {
      event.stopPropagation();
      post('soc:flight-detail:todo-delete', { todoId: button.dataset.formalTodoDelete });
    }));
    const input = side.querySelector('#formalTodoInput');
    const create = () => {
      const content = input?.value.trim();
      if (!content) return;
      post('soc:flight-detail:todo-create', { content });
    };
    side.querySelector('#formalTodoCreate')?.addEventListener('click', create);
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') create();
    });
  }

  function bindFormalNavigation() {
    document.querySelectorAll('[data-formal-nav]').forEach((button) => button.addEventListener('click', () => {
      post('soc:flight-detail:navigate', { path: button.dataset.formalNav });
    }));
    document.querySelectorAll('[data-formal-action]').forEach((button) => button.addEventListener('click', () => {
      post(`soc:flight-detail:${button.dataset.formalAction}`);
    }));
  }

  function renderSnapshot(snapshot) {
    detailSnapshot = snapshot;
    const flight = snapshot.aggregate.flight;
    const trip = moduleData('trip');
    renderTopbar(flight, trip);
    renderTripStrip(flight, trip);
    renderTabs();
    renderHero();
    renderReadiness();
    renderPhases();
    renderFlightSection();
    renderCrewSection();
    renderRequirementSection();
    renderServicesSection();
    renderReleaseSection();
    renderFuelSection();
    renderMessagesSection();
    renderDocumentsSection();
    renderBillingSection();
    renderCloseoutSection();
    renderSidePanel();
    bindFormalNavigation();
    text('#toast', '');
    document.documentElement.classList.remove('soc-formal-pending');
    document.body.classList.add('soc-formal-ready');
    const requestedSection = params.get('section');
    if (requestedSection && document.querySelector(`#${CSS.escape(requestedSection)}`)) switchTab(requestedSection);
  }

  function renderFatalError(message) {
    const layout = document.querySelector('.detail-layout');
    if (layout) layout.innerHTML = `<div class="formal-error" style="min-height:calc(100dvh - 48px)"><div><strong>航班详情加载失败</strong><span>${html(message)}</span><br><button class="primary-btn" id="formalRetry" type="button">重试</button></div></div>`;
    document.querySelector('#formalRetry')?.addEventListener('click', () => post('soc:flight-detail:refresh'));
    document.documentElement.classList.remove('soc-formal-pending');
  }

  document.querySelector('#timeToggle')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-time-basis]');
    if (!button || !detailSnapshot) return;
    activeTimeBasis = button.dataset.timeBasis;
    queueMicrotask(() => {
      renderHero();
      renderPhases();
    });
  });

  window.addEventListener('resize', () => {
    if (detailSnapshot) drawReadiness(Number(document.querySelector('.readiness-core strong')?.textContent?.replace(/\D/g, '') || 0));
  }, { passive: true });

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    if (event.data?.type === 'soc:flight-detail:data') renderSnapshot(event.data);
    if (event.data?.type === 'soc:flight-detail:error') renderFatalError(event.data.message || '未知错误');
    if (event.data?.type === 'soc:flight-detail:feedback' && event.data.message) showToast(event.data.message);
  });

  post('soc:flight-detail:ready');
})();
