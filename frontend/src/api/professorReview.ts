import { http } from "@/api/http";

/** 백엔드 교수 검토 API 타입들 */
export type ReviewAction = "APPROVE" | "REJECT";

export interface ReviewItem {
  assignmentId: number;
  projectId: number;
}

export interface PendingReview {
  assignmentId: number;
  projectId: number;
  title?: string;
  projectName?: string;
  teamName?: string;
  /** ISO Datetime (백엔드에서 OffsetDateTime 직렬화) */
  submittedAt?: string | null;
}

export interface BulkReviewResponse {
  successCount: number;
  failCount: number;
}

/** 검토 대기 목록 조회 (임박 기준 days, 최대 limit) */
export async function listPendingReviews(params?: { days?: number; limit?: number }) {
  const { data } = await http.get<PendingReview[]>("/professor/reviews", { params });
  return data;
}

/** 일괄 검토 (승인/반려) */
export async function bulkReview(action: ReviewAction, items: ReviewItem[]) {
  const { data } = await http.post<BulkReviewResponse>("/professor/reviews/bulk", {
    action,
    items,
  });
  return data;
}
