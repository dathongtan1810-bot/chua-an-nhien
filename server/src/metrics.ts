import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export function createMetrics() {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry, prefix: 'chua_' });
  const m = {
    registry,
    online: new Gauge({ name: 'chua_online_users', help: 'Số người online (duy nhất)', registers: [registry] }),
    connections: new Gauge({ name: 'chua_socket_connections', help: 'Số kết nối socket đang mở', registers: [registry] }),
    areaOnline: new Gauge({ name: 'chua_area_users', help: 'Số người theo khu', labelNames: ['area'], registers: [registry] }),
    events: new Counter({ name: 'chua_socket_events_total', help: 'Sự kiện C→S đã nhận', labelNames: ['event'], registers: [registry] }),
    invalid: new Counter({ name: 'chua_invalid_payload_total', help: 'Payload không hợp lệ', labelNames: ['event'], registers: [registry] }),
    rateLimited: new Counter({ name: 'chua_rate_limited_total', help: 'Số lần bị giới hạn tần suất', labelNames: ['event'], registers: [registry] }),
    rejected: new Counter({ name: 'chua_lantern_rejected_total', help: 'Đèn bị bộ lọc từ chối', labelNames: ['reason'], registers: [registry] }),
    lanterns: new Counter({ name: 'chua_lanterns_total', help: 'Đèn được thả', labelNames: ['status'], registers: [registry] }),
    incense: new Counter({ name: 'chua_incense_sticks_total', help: 'Số nén hương', registers: [registry] }),
    bells: new Counter({ name: 'chua_bells_total', help: 'Số lần chuông ngân', registers: [registry] }),
    reports: new Counter({ name: 'chua_reports_total', help: 'Báo cáo', labelNames: ['type'], registers: [registry] }),
    connRejected: new Counter({ name: 'chua_connections_rejected_total', help: 'Kết nối bị từ chối', labelNames: ['reason'], registers: [registry] }),
    http: new Histogram({
      name: 'chua_http_request_duration_seconds',
      help: 'Thời gian xử lý HTTP',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
      registers: [registry],
    }),
  };
  return m;
}
export type Metrics = ReturnType<typeof createMetrics>;
