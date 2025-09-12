import { http } from "@/api/http";
import type { FeedbackDto } from "@/types/domain";

/** 프로젝트 피드백 목록 조회 (limit 미지정 시 서버 기본값 3 적용) */
export async function listProjectFeedback(projectId: number, limit?: number) {
  const { data } = await http.get<FeedbackDto[]>(
    `/projects/${projectId}/feedback`,
    { params: limit != null ? { limit } : undefined }
  );
  return data;
}

/** 피드백 생성 (ADMIN/담당교수) */
export async function createProjectFeedback(projectId: number, content: string) {
  const { data } = await http.post<FeedbackDto>(
    `/projects/${projectId}/feedback`,
    { content }
  );
  return data;
}

/** 피드백 수정 (ADMIN/담당교수) */
export async function updateProjectFeedback(
  projectId: number,
  feedbackId: number,
  content: string
) {
  const { data } = await http.patch<FeedbackDto>(
    `/projects/${projectId}/feedback/${feedbackId}`,
    { content }
  );
  return data;
}

/** 피드백 삭제 (ADMIN/담당교수) */
export async function deleteProjectFeedback(projectId: number, feedbackId: number) {
  await http.delete(`/projects/${projectId}/feedback/${feedbackId}`);
}
