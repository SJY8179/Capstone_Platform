import { http } from "@/api/http";

/** 교수 검토 액션 */
export type ReviewAction = "APPROVE" | "REJECT";

/** 일괄 처리 요청 아이템(프론트 내부용) */
export interface ReviewItem {
  assignmentId: number;
  projectId: number;
  /** 승인/반려 시 남길 코멘트(선택) */
  comment?: string;
}

/** 검토 대기 목록 아이템 */
export interface PendingReview {
  assignmentId: number;
  projectId: number;
  title?: string;
  projectName?: string;
  teamName?: string;
  /** ISO Datetime (백엔드에서 OffsetDateTime 직렬화) */
  submittedAt?: string | null;
}

/** 일괄 검토 응답 */
export interface BulkReviewResponse {
  successCount: number;
  failCount: number;
  failedIds?: number[];
}

/** 검토 이력 아이템 */
/** 검토 이력 조회 */
export type ReviewHistoryItem = {
  id: number;
  action: "APPROVE" | "REJECT" | "NOTE";
  note?: string | null;
  at: string; // ISO
  actorId?: number | null;
  actorName?: string | null;
};

/** 메모(검토 의견) 저장 페이로드 */
export interface AddReviewNotePayload {
  assignmentId: number;
  projectId: number;
  action: ReviewAction; // 메모가 달리는 시점의 액션
  note: string;
}

/** 검토 대기 목록 조회 (임박 기준 days, 최대 limit) */
export async function listPendingReviews(params?: { days?: number; limit?: number }) {
  const { data } = await http.get<PendingReview[]>("/professor/reviews", { params });
  return data;
}

/**
 * 일괄 검토 (승인/반려)
 */
export async function bulkReview(action: ReviewAction, items: ReviewItem[]) {
  const { data } = await http.post<BulkReviewResponse>("/professor/reviews/bulk", {
    action,
    items,
  });
  return data;
}

/**
 * 검토 메모/사유 저장
 * - 엔드포인트: POST /professor/reviews/note
 * - 백엔드가 메모 엔드포인트를 제공해야 합니다.
 */
export async function addReviewNote(assignmentId: number, comment: string) {
  await http.post("/professor/reviews/note", { assignmentId, comment });
}

/**
 * 과제별 검토 이력 조회
 * - 엔드포인트: GET /professor/reviews/{assignmentId}/history
 */
export async function getReviewHistory(assignmentId: number) {
  const { data } = await http.get<{
    id: number;
    decision: "APPROVE" | "REJECT" | "NOTE";
    comment: string | null;
    createdAt: string;
    reviewerId: number | null;
    reviewerName: string | null;
  }[]>(`/professor/reviews/${assignmentId}/history`);

  // 백엔드 필드 -> 프런트 표준 필드로 매핑
  return data.map((r) => ({
    id: r.id,
    action: r.decision,
    note: r.comment,
    at: r.createdAt,
    actorId: r.reviewerId ?? undefined,
    actorName: r.reviewerName ?? undefined,
  })) as ReviewHistoryItem[];
}