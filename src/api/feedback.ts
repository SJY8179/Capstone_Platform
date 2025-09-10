import { http } from "@/api/http";
import type { FeedbackDto } from "@/types/domain";

export async function listProjectFeedback(projectId: number) {
  const { data } = await http.get<FeedbackDto[]>(
    `/projects/${projectId}/feedback`
  );
  return data;
}


