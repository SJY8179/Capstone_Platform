// src/api/schedules.ts
import { http } from "@/api/http";
import type { ScheduleDto } from "@/types/domain";

/** ----- [캐시 설정] ----- */
type CacheEntry = { expires: number; data: ScheduleDto[] };
const SCHEDULES_CACHE = new Map<string, CacheEntry>();
const IN_FLIGHT = new Map<string, Promise<ScheduleDto[]>>();
const DEFAULT_TTL_MS = 2 * 60 * 1000; // 2분 (필요시 조정)

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
 * (Deprecated) 전체 일정 목록.
 * - 권한/범위를 명확히 하기 위해 가능하면 사용하지 마세요.
 * - /schedules/range 를 projectId와 함께 사용하세요.
 */
export async function listSchedules() {
  const { data } = await http.get<ScheduleDto[]>("/schedules");
  return data;
}

/**
 * 기간 기반 조회 (프로젝트 단위 필수)
 * GET /schedules/range?from=YYYY-MM-DD&to=YYYY-MM-DD&projectId=...
 * - 메모리 캐시 + in-flight 코얼레싱 적용
 * - 변경 발생 시 invalidateSchedulesCache(projectId) 호출 필요
 */
export async function listSchedulesInRange(params: {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  projectId: number;          // ← 필수
  teamId?: number;
  /** true면 Event만 반환(Assignment 제외) */
  onlyEvents?: boolean;
}) {
  const now = Date.now();
  const cacheKey = keyOf(params);

  // 1) 유효 캐시 히트
  const hit = SCHEDULES_CACHE.get(cacheKey);
  if (hit && hit.expires > now) return hit.data;

  // 2) in-flight 코얼레싱
  const inflight = IN_FLIGHT.get(cacheKey);
  if (inflight) return inflight;

  // 3) 실제 요청
  const p = http
    .get<ScheduleDto[]>("/schedules/range", { params })
    .then(({ data }) => {
      SCHEDULES_CACHE.set(cacheKey, { expires: now + DEFAULT_TTL_MS, data });
      return data;
    })
    .finally(() => {
      IN_FLIGHT.delete(cacheKey);
    });

  IN_FLIGHT.set(cacheKey, p);
  return p;
}