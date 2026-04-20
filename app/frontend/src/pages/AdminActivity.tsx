import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getAPIBaseURL } from '@/lib/config';
import { getAuthToken } from '@/lib/session';
import { useI18n } from "@/lib/i18n";

interface ActivitySummary {
  total: number;
  success: number;
  failed: number;
}

interface ActivityEvent {
  id: number;
  event_type: string;
  action: string;
  path: string;
  status_code: number;
  user_id?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  details?: Record<string, unknown> | null;
  request_id?: string | null;
  duration_ms?: number | null;
  created_at: string;
}

interface ActivityListResponse {
  total: number;
  items: ActivityEvent[];
}

export default function AdminActivity() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');

  const baseURL = getAPIBaseURL();

  const headers = useMemo(() => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }, []);

  const fetchSummary = async () => {
    if (!headers) return;
    const response = await axios.get<ActivitySummary>(`${baseURL}/api/v1/admin/activity/summary`, { headers });
    setSummary(response.data);
  };

  const fetchEvents = async (offset = 0) => {
    if (!headers) return;
    setLoading(true);
    try {
      const response = await axios.get<ActivityListResponse>(`${baseURL}/api/v1/admin/activity/events`, {
        headers,
        params: {
          limit: 50,
          offset,
          user_id: userIdFilter || undefined,
          event_type: eventTypeFilter || undefined,
          action: actionFilter || undefined,
          path: pathFilter || undefined,
          resource_type: resourceTypeFilter || undefined,
        },
      });
      setEvents(response.data.items);
      setTotal(response.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSummary();
    void fetchEvents(0);
  }, []);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-100">{isZh ? "管理活动审计" : "Admin Activity Audit"}</h1>
          <Button onClick={() => { void fetchSummary(); void fetchEvents(0); }} size="sm">
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-slate-700/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{isZh ? "总请求次数" : "Total Requests"}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold">{summary?.total ?? '--'}</p></CardContent>
          </Card>
          <Card className="border-slate-700/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Success (&lt;400)</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold text-emerald-500">{summary?.success ?? '--'}</p></CardContent>
          </Card>
          <Card className="border-slate-700/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Failed (&gt;=400)</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-semibold text-rose-500">{summary?.failed ?? '--'}</p></CardContent>
          </Card>
        </div>

        <Card className="border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
              <Input
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
                placeholder={isZh ? "按用户ID过滤" : isZh ? "按用户ID过滤" : isZh ? "按用户ID过滤" : "Filter by user ID"}
              />
              <Input
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                placeholder={isZh ? "按事件类型过滤" : isZh ? "按事件类型过滤" : isZh ? "按事件类型过滤" : "Filter by event type"}
              />
              <Input
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                placeholder={isZh ? "按操作过滤" : isZh ? "按操作过滤" : isZh ? "按操作过滤" : "Filter by action"}
              />
              <Input
                value={pathFilter}
                onChange={(e) => setPathFilter(e.target.value)}
                placeholder={isZh ? "按路径过滤（例如：/api/v1手稿）" : isZh ? "按路径过滤（例如：/api/v1手稿）" : isZh ? "按路径过滤（例如：/api/v1手稿）" : "Filter by path (e.g. /api/v1/manuscripts)"}
              />
              <Input
                value={resourceTypeFilter}
                onChange={(e) => setResourceTypeFilter(e.target.value)}
                placeholder={isZh ? "按资源类型过滤" : isZh ? "按资源类型过滤" : isZh ? "按资源类型过滤" : "Filter by resource type"}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => void fetchEvents(0)}>Apply</Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setUserIdFilter('');
                  setEventTypeFilter('');
                  setActionFilter('');
                  setPathFilter('');
                  setResourceTypeFilter('');
                  void fetchEvents(0);
                }}
              >
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-xs text-slate-400">Showing {events.length} / {total}</div>
            <div className="space-y-2">
              {loading && <p className="text-sm text-slate-500">Loading...</p>}
              {!loading && events.map((event) => (
                <div key={event.id} className="rounded border border-slate-700/50 p-3 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge>{event.event_type}</Badge>
                    <Badge variant="outline">{event.action}</Badge>
                    <Badge variant={event.status_code < 400 ? 'secondary' : 'destructive'}>{event.status_code}</Badge>
                    <span className="text-slate-300">{event.path}</span>
                    {event.resource_type && <Badge variant="secondary">{event.resource_type}</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {event.created_at} | user: {event.user_id || 'anonymous'} | resource: {event.resource_id || '-'} | req: {event.request_id || '-'} | {event.duration_ms ?? 0} ms
                  </div>
                  {event.details && (
                    <pre className="mt-2 overflow-x-auto rounded bg-slate-950/70 p-2 text-[11px] text-slate-300">
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
