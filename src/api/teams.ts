import { http } from "@/api/http";
import type { TeamListDto, UserDto } from "@/types/domain";

/** 내가 속한 팀 목록만 */
export async function listTeams() {
  const { data } = await http.get<TeamListDto[]>("/teams/my");
  return data;
}

/** (관리자용 등) 전체 팀 목록이 필요하면 이걸 사용 */
export async function listAllTeams(): Promise<TeamListDto[]> {
  const { data } = await http.get<TeamListDto[]>("/teams");
  return data;
}

/** 초대 가능한 유저 목록 */
export async function listInvitableUsers(teamId: number): Promise<UserDto[]> {
  const { data } = await http.get<UserDto[]>(`/teams/${teamId}/invitable-users`);
  return data;
}

/** 팀원 초대 */
export async function addTeamMember(teamId: number, userId: number): Promise<void> {
  await http.post(`/teams/${teamId}/members`, { userId });
}

/** 팀 생성(리더만) */
export async function createTeam(name: string, description: string): Promise<TeamListDto> {
  const { data } = await http.post<TeamListDto>('/teams', { name, description });
  return data;
}

/** 팀 정보 수정(리더만) */
export async function updateTeam(teamId: number, name: string, description: string): Promise<TeamListDto> {
  const { data } = await http.put<TeamListDto>(`/teams/${teamId}`, { name, description });
  return data;
}

/** 리더 변경(리더만) */
export async function changeLeader(teamId: number, newLeaderId: number): Promise<void> {
  await http.patch(`/teams/${teamId}/leader`, { newLeaderId });
}

/** 팀원 삭제(리더만) */
export async function removeMember(teamId: number, memberId: number): Promise<void> {
  await http.delete(`/teams/${teamId}/members/${memberId}`);
}

/** 팀 삭제(리더만) */
export async function deleteTeam(teamId: number): Promise<void> {
  await http.delete(`/teams/${teamId}`);
}