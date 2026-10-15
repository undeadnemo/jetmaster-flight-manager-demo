const API_MARKER = '/jetmaster-flight-manager-demo/api/';

const ok = (data) =>
  new Response(JSON.stringify({ code: 'OK', data, message: 'OK' }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

const listEnvelope = () => ({
  content: [],
  current: 1,
  items: [],
  page: 1,
  records: [],
  size: 20,
  total: 0,
  totalElements: 0,
  totalPages: 0,
});

const isOptionList = (path) =>
  [
    '/options',
    '/companies',
    '/aircraft-types',
    '/airports',
    '/customers',
    '/currencies',
    '/permission-codes',
    '/roles',
    '/users',
  ].some((part) => path.endsWith(part) || path.includes(`${part}?`));

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.includes(API_MARKER)) return;

  event.respondWith(
    (async () => {
      const path = `${url.pathname.slice(url.pathname.indexOf(API_MARKER) + API_MARKER.length - 1)}${url.search}`;
      if (event.request.method !== 'GET') return ok({ success: true });
      if (isOptionList(path)) return ok([]);

      if (path.includes('/workbench')) {
        return ok({
          alerts: [],
          flights: [],
          notifications: [],
          quickActions: [],
          risks: [],
          statistics: {
            blocked: 0,
            completed: 3,
            criticalRisks: 0,
            inProgress: 2,
            pendingCloseout: 1,
            unreadNotifications: 0,
          },
          tasks: [],
        });
      }

      if (/\/(summary|statistics|overview|dashboard)(\?|$)/.test(path)) {
        return ok({ items: [], total: 0 });
      }
      if (/\/(detail|readiness)(\?|$)/.test(path)) return ok({});
      return ok(listEnvelope());
    })(),
  );
});
