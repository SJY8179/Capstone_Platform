import { http } from "@/api/http";
import type { TeamListDto, UserDto } from "@/types/domain";

export async function listTeams(): Promise<TeamListDto[]> {
  const { data } = await http.get<TeamListDto[]>("/teams");
  return data;
}

export async function listInvitableUsers(teamId: number): Promise<UserDto[]> {
  // const response = await fetch(`/api/teams/${teamId}/invitable-users`);

  // if (!response.ok) {
  //   throw new Error("Failed to fetch invitable users");
  // }

  // return response.json();
  const { data } = await http.get<UserDto[]>(`/teams/${teamId}/invitable-users`);
  return data;
}

export async function addTeamMember(teamId: number, userId: number): Promise<void> {
  // const response = await fetch(`/api/teams/${teamId}/members`, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({ userId }),
  // });

  // if (!response.ok) {
  //   const errorData = await response.json().catch(() => ({ message: '팀원 추가에 실패했습니다.' }));
  //   throw new Error(errorData.message || '팀원 추가에 실패했습니다.');
  // }
  await http.post(`/teams/${teamId}/members`, { userId });
}

export async function createTeam(name: string, description: string): Promise<TeamListDto> {
  const response = await http.post<TeamListDto>('/teams', { name, description });
  return response.data;
}