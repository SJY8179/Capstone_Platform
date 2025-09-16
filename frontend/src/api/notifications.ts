import { listProjects } from "@/api/projects";
import { listProjectFeedback } from "@/api/feedback";
import { listSchedulesInRange } from "@/api/schedules";
import { getProjectDashboardDeadlines } from "@/api/dashboard";
import type { AppNotification } from "@/types/domain";
import { appBus } from "@/lib/app-bus";

/** 로컬 저장 키 */
const READ_KEY = "capstone.notifications.read.v1";

function getReadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveReadSet(s: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(s)));
  } catch {
    // ignore
  }
}

/** 간단 해시(제목 식별자에 사용) */
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

type FetchOpts = {
  /** 특정 프로젝트만 조회(없으면 내 모든 프로젝트 기반 집계) */
  projectId?: number;
  /** 이벤트 조회 범위(+앞으로 N일) */
  daysAhead?: number;
  /** 마감/이벤트 과거 포함 시간(시간 단위) */
  includePastHours?: number;
  /** 각 프로젝트별 항목 제한 */
  perProjectLimits?: { feedback?: number; deadlines?: number; events?: number };
};

/** 프로젝트 기반으로 피드백/일정/마감을 집계해 알림 리스트로 변환 */
export async function fetchNotifications(opts: FetchOpts = {}): Promise<AppNotification[]> {
  const readSet = getReadSet();
  const {
    projectId,
    daysAhead = 14,
    includePastHours = 6,
    perProjectLimits = { feedback: 5, deadlines: 5, events: 5 },
  } = opts;

  const projects = projectId
    ? [{ id: projectId } as any]
    : await listProjects().catch(() => [] as any[]);

  const now = new Date();
  const from = new Date(now.getTime() - includePastHours * 3600 * 1000);
  const to = new Date(now.getTime() + daysAhead * 24 * 3600 * 1000);
  const toYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const batches = await Promise.all(
    projects.map(async (p: any) => {
      const pid = p.id as number;
      // 피드백
      const fbs = await listProjectFeedback(pid, perProjectLimits.feedback!).catch(() => []);
      // 마감(과제)
      const dls = await getProjectDashboardDeadlines(pid, perProjectLimits.deadlines!).catch(() => []);
      // 일정(이벤트)
      const evs = await listSchedulesInRange({
        from: toYMD(from),
        to: toYMD(to),
        projectId: pid,
      }).catch(() => []);

      const fbNotes: AppNotification[] = (fbs ?? []).map((f: any) => {
        const id = `f:${pid}:${f.id}`;
        const ts = f.createdAt ?? now.toISOString();
        return {
          id,
          type: "feedback",
          title: "새 피드백",
          message: f.content || "",
          timestamp: ts,
          read: readSet.has(id),
          priority: "medium",
          relatedId: String(f.id),
          author: f.author ? { name: f.author } : undefined,
          projectId: pid,
          projectName: p.name ?? p.title ?? null,
        };
      });

      const dlNotes: AppNotification[] = (dls ?? []).map((d: any) => {
        const id = `d:${pid}:${d.dueDate}:${hash(d.title || "")}`;
        const ts = d.dueDate;
        const dueMs = new Date(ts).getTime() - now.getTime();
        const priority: AppNotification["priority"] = dueMs <= 48 * 3600 * 1000 ? "high" : "medium";
        return {
          id,
          type: "assignment",
          title: "마감 임박",
          message: d.title || "과제 마감",
          timestamp: ts,
          read: readSet.has(id),
          priority,
          projectId: pid,
          projectName: p.name ?? p.title ?? null,
        };
      });

      const evNotes: AppNotification[] = (evs ?? []).slice(0, perProjectLimits.events).map((e: any) => {
        const startIso =
          e.startAt ??
          (e.date ? `${e.date}T${e.time ? `${e.time}:00` : "00:00:00"}` : now.toISOString());
        const id = `e:${pid}:${e.id}`;
        const startMs = new Date(startIso).getTime() - now.getTime();
        const priority: AppNotification["priority"] =
          startMs <= 24 * 3600 * 1000 && startMs >= -2 * 3600 * 1000 ? "high" : "medium";
        return {
          id,
          type: "schedule",
          title: "일정 알림",
          message: e.title || "예정된 일정",
          timestamp: startIso,
          read: readSet.has(id),
          priority,
          relatedId: String(e.id),
          projectId: pid,
          projectName: p.name ?? p.title ?? null,
        };
      });

      return [...fbNotes, ...dlNotes, ...evNotes];
    })
  );

  const all = batches.flat().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return all;
}

/** 읽음 처리 유틸 */
export function markNotificationAsRead(id: string) {
  const s = getReadSet();
  if (!s.has(id)) {
    s.add(id);
    saveReadSet(s);
    appBus.emitNotificationsChanged();
  }
}

export function markAllNotificationsAsRead(ids?: string[]) {
  const s = getReadSet();
  if (ids && ids.length) {
    ids.forEach((id) => s.add(id));
  } else {
    // 전체 읽음 (현재 로드된 것 기준이 아니라 저장소 전체를 유지)
    // 여기서는 단순히 브로드캐스트만 하고, 각 컴포넌트는 fetch 후 read=true 로 매핑
  }
  saveReadSet(s);
  appBus.emitNotificationsChanged();
}

export function withReadFlag(items: AppNotification[]): AppNotification[] {
  const s = getReadSet();
  return items.map((n) => ({ ...n, read: s.has(n.id) }));
}

export function countUnread(items: AppNotification[]): number {
  return items.reduce((acc, n) => acc + (n.read ? 0 : 1), 0);
}