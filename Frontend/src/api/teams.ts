// === path : src/api/teams.ts
import { http } from "@/api/http";
import type { TeamListDto, TeamInvitation, UserDto } from "@/types/domain";

/** (학생/교수/관리자 공통) 내가 속한 팀 목록만 */
export async function listTeams() {
  const { data } = await http.get<TeamListDto[]>("/teams/my");
  return data;
}

/** (교수 전용) 내가 담당 교수인 프로젝트의 팀 */
export async function listTeamsByProfessor(): Promise<TeamListDto[]> {
    const { data } = await http.get('/teams/teaching');
    return data;
}

/** (관리자) 전체 팀 */
export async function listAllTeams(): Promise<TeamListDto[]> {
  const { data } = await http.get<TeamListDto[]>("/teams");
  return data;
}

/** 팀원 초대 요청 */
export async function inviteMemberRequest(teamId: number, inviteeId: number): Promise<void> {
  // POST /api/teams/{teamId}/invitations
  await http.post(`/teams/${teamId}/invitations`, { userId: inviteeId });
}

/** 받은 팀원 초대에 응답 */
export async function respondToInvitation(invitationId: number, accept: boolean): Promise<TeamInvitation> {
  // POST /api/invitations/{invitationId}?accept=true
  const { data } = await http.post(`/invitations/${invitationId}?accept=${accept}`);
  return data;
}

/** 팀에 공지 발송 (교수용) */
export async function sendTeamAnnouncement(teamId: number, title: string, content: string): Promise<void> {
  await http.post(`/teams/${teamId}/announcements`, { title, content });
}

/** 새 팀 생성 */
export async function createTeam(name: string, description: string): Promise<TeamListDto> {
  const { data } = await http.post<TeamListDto>('/teams', { name, description });
  return data;
}

/** 팀 정보 수정 (서버는 PUT 매핑) */
export async function updateTeam(teamId: number, name: string, description?: string): Promise<TeamListDto> {
  const { data } = await http.put<TeamListDto>(`/teams/${teamId}`, {
    name,
    description: description ?? "",
  });
  return data;
}

/** 팀장 변경 (서버는 PATCH 매핑, 바디 키: newLeaderId) */
export async function changeLeader(teamId: number, newLeaderId: number): Promise<void> {
  await http.patch(`/teams/${teamId}/leader`, { newLeaderId });
}

/** 팀원 제거 */
export async function removeMember(teamId: number, memberId: number): Promise<void> {
  await http.delete(`/teams/${teamId}/members/${memberId}`);
}

/** 팀 삭제 */
export async function deleteTeam(teamId: number): Promise<void> {
  await http.delete(`/teams/${teamId}`);
}

/** 모든 교수 목록 조회 */
export async function getAllProfessors() {
  const { data } = await http.get<Array<{ id: number; name: string; email: string }>>("/teams/professors");
  return data;
}

/** 팀에 교수 추가 */
export async function addProfessorToTeam(teamId: number, professorId: number) {
  await http.post(`/teams/${teamId}/professors`, { userId: professorId });
}

/** 팀의 교수 목록 조회 */
export async function listTeamProfessors(teamId: number) {
  const { data } = await http.get<UserDto[]>(`/teams/${teamId}/professors`);
  return data;
}