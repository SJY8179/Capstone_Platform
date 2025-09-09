import { http } from "@/api/http";
import type { TeamListDto } from "@/types/domain";

export async function listTeams() {
  const { data } = await http.get<TeamListDto[]>("/teams");
  return data;
}
