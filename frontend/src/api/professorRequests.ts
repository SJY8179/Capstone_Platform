import { http } from "@/api/http";

/** 요청 상태 */
export type ProfessorRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

/** 교수 배정 요청 DTO (프론트 전용 정규화) */
export interface ProfessorRequest {
  id: number;
  projectId: number | null;         // 🔁 pre-request는 null일 수 있음
  projectTitle: string;
  targetProfessorId: number;
  targetProfessorName: string;
  status: ProfessorRequestStatus;
  requestedAt: string | null;       // ISO
}

/** 내부: 응답 정규화 */
function normalize(r: any): ProfessorRequest {
  const pid =
    r?.projectId != null
      ? Number(r.projectId)
      : r?.project?.id != null
      ? Number(r.project?.id)
      : null;

  const ptitleRaw =
    r?.projectTitle ?? r?.title ?? r?.project?.title ?? r?.project?.name ?? "프로젝트";

  return {
    id: Number(r?.id),
    projectId: pid,
    projectTitle: String(ptitleRaw) || "프로젝트",
    targetProfessorId: Number(r?.targetProfessorId ?? r?.targetProfessor?.id),
    targetProfessorName:
      String(r?.targetProfessorName ?? r?.targetProfessor?.name ?? r?.professorName ?? "교수") ||
      "교수",
    status: (String(r?.status ?? "PENDING").toUpperCase() as ProfessorRequestStatus) || "PENDING",
    requestedAt: r?.requestedAt ?? r?.createdAt ?? null,
  };
}

/* -------------------------------------------------
 * 생성 API (pre / post)
 * -------------------------------------------------*/

/**
 * (사전요청) 아직 프로젝트를 생성하지 않고 팀/제목만으로 담당 교수에게 배정을 요청
 * 백엔드: POST /professor-requests
 * 바디 필드명은 백엔드와 **정확히 일치**해야 함 → teamId, title, professorId, message
 */
export async function createProfessorPreRequest(
  teamId: number,
  title: string,
  professorId: number,
  message?: string
): Promise<ProfessorRequest> {
  const { data } = await http.post(`/professor-requests`, {
    teamId,
    title,
    professorId,     // ✅ preferredProfessorId 가 아님!
    message,
  });
  return normalize(data);
}

/**
 * (사후요청) 이미 만들어진 프로젝트에 대해 담당 교수 배정을 요청
 * 백엔드: POST /projects/{projectId}/professor-requests
 */
export async function createProfessorRequestForProject(
  projectId: number,
  professorId: number,
  message?: string
): Promise<ProfessorRequest> {
  const { data } = await http.post(`/projects/${projectId}/professor-requests`, {
    professorId,
    message,
  });
  return normalize(data);
}

/* -------------------------------------------------
 * 조회/승인/거절
 * -------------------------------------------------*/

/** 교수 본인의 대기중 요청 목록 (로그인 교수 기준으로 필터링됨) */
export async function listPendingProfessorRequests(): Promise<ProfessorRequest[]> {
  const { data } = await http.get(`/professor-requests/pending`);
  const rows = Array.isArray(data) ? data : data?.items || data?.content || [];
  return rows.map(normalize);
}

/** 승인(교수 본인만) */
export async function approveProfessorRequest(id: number): Promise<void> {
  await http.post(`/professor-requests/${id}/approve`, {});
}

/** 거절(교수 본인만) — message는 선택 */
export async function rejectProfessorRequest(id: number, message?: string): Promise<void> {
  const body = message && message.trim() ? { message: message.trim() } : {};
  await http.post(`/professor-requests/${id}/reject`, body);
}
