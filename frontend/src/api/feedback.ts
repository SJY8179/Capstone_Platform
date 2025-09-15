import { http } from "@/api/http";
import type { FeedbackDto, CursorPage } from "@/types/domain";

/** 프로젝트 피드백 목록 조회 (limit 미지정 시 서버 기본값 3 적용)
 *  - 별점은 콘텐츠 내에 메타로 포함됩니다: "[rating:3] 내용..."
 *    표시할 때는 프론트에서 파싱해 별 UI로 렌더링합니다.
 */
export async function listProjectFeedback(projectId: number, limit?: number) {
  const { data } = await http.get<FeedbackDto[]>(
    `/projects/${projectId}/feedback`,
    { params: limit != null ? { limit } : undefined }
  );
  return data;
}

/** 커서 기반 페이지 조회
 *  - 서버에서 { items: FeedbackDto[], nextCursor: number | null } 형태를 반환한다고 가정
 *  - nextCursor 를 다음 요청의 cursor(beforeId)로 넘기면 됩니다.
 */
export async function listProjectFeedbackPage(
  projectId: number,
  opts?: { cursor?: number | null; limit?: number }
) {
  const params: Record<string, any> = {};
  if (opts?.cursor != null) params.beforeId = opts.cursor;
  if (opts?.limit != null) params.limit = opts.limit;

  const { data } = await http.get<CursorPage<FeedbackDto>>(
    `/projects/${projectId}/feedback/page`,
    { params }
  );
  return data;
}

/** 피드백 생성 (ADMIN/담당교수)
 *  - 별점을 함께 저장하려면 content 앞에 "[rating:4] " 같은 메타를 붙여 전송하세요.
 */
export async function createProjectFeedback(projectId: number, content: string) {
  const { data } = await http.post<FeedbackDto>(
    `/projects/${projectId}/feedback`,
    { content }
  );
  return data;
}

/** 피드백 수정 (ADMIN/담당교수)
 *  - 별점 변경 시에도 동일: content에 "[rating:x] " 메타를 포함해서 전송
 */
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