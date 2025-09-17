// src/api/schedules.ts
import { http } from "@/api/http";
import type { ScheduleDto } from "@/types/domain";

/** ----- [캐시 설정] ----- */
type CacheEntry = { expires: number; data: ScheduleDto[] };
const SCHEDULES_CACHE = new Map<string, CacheEntry>();
const IN_FLIGHT = new Map<string, Promise<ScheduleDto[]>>();
const DEFAULT_TTL_MS = 2 * 60 * 1000; // 2분

function keyOf(params: {
  from: string;
  to: string;
  projectId: number;
  teamId?: number;
  onlyEvents?: boolean;
}) {
  const { from, to, projectId, teamId, onlyEvents } = params;
  return `p:${projectId}|f:${from}|t:${to}|team:${teamId ?? "-"}|only:${onlyEvents ? 1 : 0}`;
}

/** 외부에서 호출 가능한 캐시 무효화: projectId 없으면 전체 삭제 */
export function invalidateSchedulesCache(projectId?: number) {
  if (!projectId) {
    SCHEDULES_CACHE.clear();
    return;
  }
  for (const k of Array.from(SCHEDULES_CACHE.keys())) {
    if (k.startsWith(`p:${projectId}|`)) SCHEDULES_CACHE.delete(k);
  }
}

/**
 * 기간 기반 조회 (프로젝트 단위 필수)
 * 1) 우선 `/projects/{id}/schedules/range` 시도
 * 2) 404/405면 구 경로 `/schedules/range?projectId=...`로 폴백
 * 3) 폴백에서 401/403이면 빈 배열 반환(조용히 실패 처리)
 */
export async function listSchedulesInRange(params: {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  projectId: number;          // 필수
  teamId?: number;
  onlyEvents?: boolean;
}) {
  const now = Date.now();
  const cacheKey = keyOf(params);

  // 1) 캐시
  const hit = SCHEDULES_CACHE.get(cacheKey);
  if (hit && hit.expires > now) return hit.data;

  // 2) in-flight
  const inflight = IN_FLIGHT.get(cacheKey);
  if (inflight) return inflight;

  const p = (async () => {
    const { projectId, ...rest } = params;

    // A) 프로젝트 스코프 우선
    try {
      const res = await http.get<ScheduleDto[]>(
        `/projects/${projectId}/schedules/range`,
        {
          params: rest,
          validateStatus: (s) => [200, 404, 405].includes(s),
        }
      );
      if (res.status === 200) {
        const data = res.data ?? [];
        SCHEDULES_CACHE.set(cacheKey, { expires: now + DEFAULT_TTL_MS, data });
        return data;
      }
      // 404/405 → 폴백 시도
    } catch (e) {
      // 네트워크 오류 등 → 폴백 시도
    }

    // B) 구 경로 폴백
    const res2 = await http.get<ScheduleDto[]>("/schedules/range", {
      params,
      validateStatus: (s) => [200, 401, 403].includes(s),
    });
    if (res2.status === 200) {
      const data = res2.data ?? [];
      SCHEDULES_CACHE.set(cacheKey, { expires: now + DEFAULT_TTL_MS, data });
      return data;
    }
    // 401/403 → 조용히 빈 배열(목록만 비우고 화면은 정상 유지)
    SCHEDULES_CACHE.set(cacheKey, { expires: now + DEFAULT_TTL_MS, data: [] });
    return [];
  })().finally(() => {
    IN_FLIGHT.delete(cacheKey);
  });

  IN_FLIGHT.set(cacheKey, p);
  return p;
}

/**
 * 접근 가능 여부 프로브
 * - 프로젝트 스코프 먼저, 404/405면 구 경로
 * - 200이면 true, 401/403이면 false
 */
export async function probeScheduleAccess(projectId: number): Promise<boolean> {
  const today = new Date();
  const toYMD = (d: Date) => d.toISOString().slice(0, 10);
  const ymd = toYMD(today);

  try {
    const res = await http.get(`/projects/${projectId}/schedules/range`, {
      params: { from: ymd, to: ymd, onlyEvents: true },
      validateStatus: (s) => [200, 401, 403, 404, 405].includes(s),
    });
    if (res.status === 200) return true;
    if (res.status === 404 || res.status === 405) {
      // 엔드포인트 없음 → 폴백으로
    } else {
      return false; // 401/403
    }
  } catch {
    // 폴백 시도
  }

  try {
    const res = await http.get("/schedules/range", {
      params: { from: ymd, to: ymd, projectId, onlyEvents: true },
      validateStatus: (s) => [200, 401, 403].includes(s),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

/** (Deprecated) 전체 일정 목록 */
export async function listSchedules() {
  const { data } = await http.get<ScheduleDto[]>("/schedules");
  return data;
}
