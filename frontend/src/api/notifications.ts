import { http } from "@/api/http";
import { listProjects } from "@/api/projects";
import { listProjectFeedback } from "@/api/feedback";
import { listSchedulesInRange } from "@/api/schedules";
import { getProjectDashboardDeadlines } from "@/api/dashboard";
import type { AppNotification } from "@/types/domain";
import { appBus } from "@/lib/app-bus";

/** 로컬 저장 키 (클라이언트 집계 항목용) */
const READ_KEY = "capstone.notifications.read.v1";

// ---------- 시간 유틸 ----------
function toEpochMsFromAny(v: any): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.includes(" ") && !v.includes("T") ? v.replace(" ", "T") : v;
    let ms = Date.parse(s);
    if (Number.isFinite(ms)) return ms;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      ms = Date.parse(`${s}T00:00:00`);
      if (Number.isFinite(ms)) return ms;
    }
  }
  if (v instanceof Date) return v.getTime();
  return Date.now(); // 폴백
}
const toIso = (ms: number) => new Date(ms).toISOString();

// ---------- 공통 정렬 (미래=임박한 순 ↑, 과거=최근 순 ↓, 미래 먼저) ----------
export function sortNotifications(items: AppNotification[]): AppNotification[] {
  const now = Date.now();
  const withMs = items.map((n) => ({ n, ms: toEpochMsFromAny(n.timestamp) }));
  const future = withMs.filter(x => x.ms >= now).sort((a, b) => a.ms - b.ms || String(a.n.id).localeCompare(String(b.n.id)));
  const past   = withMs.filter(x => x.ms <  now).sort((a, b) => b.ms - a.ms || String(a.n.id).localeCompare(String(b.n.id)));
  return [...future, ...past].map(x => x.n);
}

// ---------- 로컬 읽음 관리 ----------
function getReadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}
function saveReadSet(s: Set<string>) {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...s])); } catch {}
}
function hash(s: string) {
  let h = 0; for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

type FetchOpts = {
  projectId?: number;
  daysAhead?: number;
  includePastHours?: number;
  perProjectLimits?: { feedback?: number; deadlines?: number; events?: number };
};

/** ---------- 서버 알림 우선 ---------- */
async function fetchServerNotifications(): Promise<AppNotification[]> {
  try {
    const { data } = await http.get(`/notifications`);
    const mapType = (t: string): AppNotification["type"] => {
      switch ((t || "").toUpperCase()) {
        case "TEAM_INVITATION": return "team_invitation";
        case "INVITATION_ACCEPTED": return "invitation_accepted";
        case "INVITATION_DECLINED": return "invitation_declined";
        default: return "system";
      }
    };
    return (data as any[]).map((n) => {
      const ms = toEpochMsFromAny(n.ts ?? n.createdAtMs ?? n.createdAtEpoch ?? n.createdAt);
      return {
        id: `srv:${n.id}`,
        type: mapType(n.type),
        title: n.title,
        message: n.body ?? "",
        timestamp: toIso(ms), // ISO로 정규화
        read: !!n.isRead,
        priority: "medium",
        payload: n.payload ?? null,
      };
    });
  } catch {
    return [];
  }
}

/** ---------- 기존(클라이언트 집계) 보조 ---------- */
async function fetchClientAggregated(opts: FetchOpts): Promise<AppNotification[]> {
  const readSet = getReadSet();
  const {
    projectId, daysAhead = 14, includePastHours = 6,
    perProjectLimits = { feedback: 5, deadlines: 5, events: 5 },
  } = opts;

  const projects = projectId ? [{ id: projectId } as any] : await listProjects().catch(() => [] as any[]);
  const now = Date.now();
  const from = now - includePastHours * 3600 * 1000;
  const to   = now + daysAhead * 24 * 3600 * 1000;
  const toYMD = (dms: number) => {
    const d = new Date(dms);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  const batches = await Promise.all(projects.map(async (p: any) => {
    const pid = p.id as number;
    const fbs = await listProjectFeedback(pid, perProjectLimits.feedback!).catch(() => []);
    const dls = await getProjectDashboardDeadlines(pid, perProjectLimits.deadlines!).catch(() => []);
    const evs = await listSchedulesInRange({ from: toYMD(from), to: toYMD(to), projectId: pid }).catch(() => []);

    const fbNotes: AppNotification[] = (fbs ?? []).map((f: any) => {
      const id = `f:${pid}:${f.id}`;
      const ms = toEpochMsFromAny(f.createdAt ?? now);
      return {
        id,
        type: "feedback",
        title: "새 피드백",
        message: f.content || "",
        timestamp: toIso(ms),
        read: readSet.has(id),
        priority: "medium",
        relatedId: String(f.id),
        author: f.author ? { name: f.author } : undefined,
        projectId: pid,
        projectName: p.name ?? p.title ?? null
      };
    });

    const dlNotes: AppNotification[] = (dls ?? []).map((d: any) => {
      const id = `d:${pid}:${d.dueDate}:${hash(d.title || "")}`;
      const ms = toEpochMsFromAny(d.dueDate);
      const priority: AppNotification["priority"] = ms - now <= 48*3600*1000 ? "high" : "medium";
      return {
        id,
        type: "assignment",
        title: "마감 임박",
        message: d.title || "과제 마감",
        timestamp: toIso(ms),
        read: readSet.has(id),
        priority,
        projectId: pid,
        projectName: p.name ?? p.title ?? null
      };
    });

    const evNotes: AppNotification[] = (evs ?? []).slice(0, perProjectLimits.events).map((e: any) => {
      const startRaw = e.startAt ?? (e.date ? `${e.date}T${e.time ? `${e.time}:00` : "00:00:00"}` : now);
      const ms = toEpochMsFromAny(startRaw);
      const priority: AppNotification["priority"] =
        (ms - now <= 24*3600*1000 && ms - now >= -2*3600*1000) ? "high" : "medium";
      const id = `e:${pid}:${e.id}`;
      return {
        id,
        type: "schedule",
        title: "일정 알림",
        message: e.title || "예정된 일정",
        timestamp: toIso(ms),
        read: readSet.has(id),
        priority,
        relatedId: String(e.id),
        projectId: pid,
        projectName: p.name ?? p.title ?? null
      };
    });

    return [...fbNotes, ...dlNotes, ...evNotes];
  }));

  return batches.flat();
}

/** 🔔 통합 fetch: 서버 우선, 없으면 클라 집계 → 공통 정렬 적용 */
export async function fetchNotifications(opts: FetchOpts = {}): Promise<AppNotification[]> {
  const sv = await fetchServerNotifications();
  const cl = await fetchClientAggregated(opts);
  return sortNotifications([...sv, ...cl]);
}

/** 읽음 처리 */
export async function markNotificationAsRead(id: string) {
  if (id.startsWith("srv:")) {
    const nid = id.slice(4);
    try { await http.post(`/notifications/${nid}/read`); } catch {}
    appBus.emitNotificationsChanged();
    return;
  }
  const s = getReadSet();
  if (!s.has(id)) { s.add(id); saveReadSet(s); appBus.emitNotificationsChanged(); }
}

export async function markAllNotificationsAsRead(ids?: string[]) {
  const serverIds = (ids ?? []).filter((i) => i.startsWith("srv:")).map((i) => i.slice(4));
  if (serverIds.length) {
    await Promise.all(serverIds.map((nid) =>
      http.post(`/notifications/${nid}/read`).catch(()=>{})
    ));
  }
  const s = getReadSet();
  if (ids) ids.filter(i => !i.startsWith("srv:")).forEach((id) => s.add(id));
  saveReadSet(s);
  appBus.emitNotificationsChanged();
}

export function withReadFlag(items: AppNotification[]): AppNotification[] {
  const s = getReadSet();
  return items.map((n) => n.id.startsWith("srv:") ? n : ({ ...n, read: s.has(n.id) }));
}

export function countUnread(items: AppNotification[]): number {
  return items.reduce((acc, n) => acc + (n.read ? 0 : 1), 0);
}
