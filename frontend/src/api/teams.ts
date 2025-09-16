import { http } from "@/api/http";
import type { TeamListDto, UserDto } from "@/types/domain";

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

/** ⬇ 초대 가능한 사용자 목록 */
export async function listInvitableUsers(teamId: number) {
  const { data } = await http.get<UserDto[]>(`/teams/${teamId}/invitable-users`);
  return data;
}

/** 새 팀 생성 */
export async function createTeam(name: string, description?: string) {
  const { data } = await http.post<TeamListDto>("/teams", { name, description });
  return data;
}

/** 팀원 초대/추가 */
export async function addTeamMember(teamId: number, userId: number) {
  await http.post(`/teams/${teamId}/members`, { userId });
}

/** 팀 정보 수정 (서버는 PUT 매핑) */
export async function updateTeam(teamId: number, name: string, description?: string) {
  const { data } = await http.put<TeamListDto>(`/teams/${teamId}`, {
    name,
    description: description ?? "",
  });
  return data;
}

/** 팀장 변경 (서버는 PATCH 매핑, 바디 키: newLeaderId) */
export async function changeLeader(teamId: number, newLeaderId: number) {
  await http.patch(`/teams/${teamId}/leader`, { newLeaderId });
}

/** 팀원 제거 */
export async function removeMember(teamId: number, memberId: number) {
  await http.delete(`/teams/${teamId}/members/${memberId}`);
}

/** 팀 삭제 */
export async function deleteTeam(teamId: number) {
  await http.delete(`/teams/${teamId}`);
}

export async function listTeamProfessors(teamId: number) {
  const { data } = await http.get<UserDto[]>(`/teams/${teamId}/professors`);
  return data;
}