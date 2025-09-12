import { http } from "@/api/http";
import type { EventDto, EventType } from "@/types/domain";

/** 프로젝트 이벤트 전체 목록 */
export async function listProjectEvents(projectId: number) {
  const { data } = await http.get<EventDto[]>(
    `/projects/${projectId}/events`
  );
  return data;
}

/** 프로젝트 이벤트 기간 조회 */
export async function listProjectEventsInRange(
  projectId: number,
  params: { from: string; to: string }
) {
  const { from, to } = params;
  const { data } = await http.get<EventDto[]>(
    `/projects/${projectId}/events/range`,
    { params: { from, to } }
  );
  return data;
}

/**
 * 생성
 * - 백엔드는 ISO 문자열을 받습니다. (startAtIso/endAtIso)
 * - type: MEETING | DEADLINE | ETC | PRESENTATION
 */
export async function createEvent(
  projectId: number,
  payload: {
    title: string;
    startAtIso: string;
    endAtIso?: string;
    type?: EventType;
    location?: string;
  }
) {
  const { data } = await http.post<EventDto>(
    `/projects/${projectId}/events`,
    payload
  );
  return data;
}

/**
 * 수정
 * - 부분 수정 가능
 */
export async function updateEvent(
  projectId: number,
  id: number,
  payload: {
    title?: string;
    startAtIso?: string;
    endAtIso?: string;
    type?: EventType;
    location?: string;
  }
) {
  const { data } = await http.patch<EventDto>(
    `/projects/${projectId}/events/${id}`,
    payload
  );
  return data;
}

/** 삭제 */
export async function deleteEvent(projectId: number, id: number) {
  await http.delete(`/projects/${projectId}/events/${id}`);
}
