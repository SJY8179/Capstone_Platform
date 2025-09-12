import { http } from "@/api/http";
import type { TeamListDto } from "@/types/domain";

/** (학생/교수/관리자 공통) 내가 팀 멤버로 속한 팀 */
export async function listTeams() {
  const { data } = await http.get<TeamListDto[]>("/teams/my");
  return data;
}

/** (교수 전용) 내가 담당 교수인 프로젝트의 팀 */
export async function listTeachingTeams() {
  const { data } = await http.get<TeamListDto[]>("/teams/teaching");
  return data;
}

/** (관리자) 전체 팀 */
export async function listAllTeams() {
  const { data } = await http.get<TeamListDto[]>("/teams");
  return data;
}
