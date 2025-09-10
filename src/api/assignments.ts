import { http } from "@/api/http";
import type { Assignment } from "@/types/domain";

/** 목록 */
export async function listAssignments(projectId: number) {
  const { data } = await http.get<Assignment[]>(
    `/projects/${projectId}/assignments`
  );
  return data;
}

/** 생성 */
export async function createAssignment(
  projectId: number,
  payload: {
    title: string;
    /** "yyyy-MM-dd" 또는 ISO_LOCAL_DATE_TIME */
    dueDateIso?: string;
    status?: "COMPLETED" | "ONGOING" | "PENDING";
  }
) {
  const { data } = await http.post<Assignment>(
    `/projects/${projectId}/assignments`,
    { title: payload.title, dueDateIso: payload.dueDateIso, status: payload.status }
  );
  return data;
}

/** 수정 */
export async function updateAssignment(
  projectId: number,
  assignmentId: number,
  payload: {
    title?: string;
    dueDateIso?: string;
    status?: "COMPLETED" | "ONGOING" | "PENDING";
  }
) {
  const { data } = await http.patch<Assignment>(
    `/projects/${projectId}/assignments/${assignmentId}`,
    payload
  );
  return data;
}

/** 상태 변경 (단건) */
export async function changeAssignmentStatus(
  projectId: number,
  assignmentId: number,
  value: "COMPLETED" | "ONGOING" | "PENDING"
) {
  const { data } = await http.patch<Assignment>(
    `/projects/${projectId}/assignments/${assignmentId}/status`,
    null,
    { params: { value } }
  );
  return data;
}

/** 상태 변경 (일괄) */
export async function bulkChangeAssignments(
  projectId: number,
  payload: { assignmentIds: number[]; status: "COMPLETED" | "ONGOING" | "PENDING" }
) {
  await http.post(`/projects/${projectId}/assignments/status-bulk`, payload);
}

/** 삭제 */
export async function deleteAssignment(projectId: number, assignmentId: number) {
  await http.delete(`/projects/${projectId}/assignments/${assignmentId}`);
}