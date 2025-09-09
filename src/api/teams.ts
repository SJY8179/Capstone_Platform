import { http } from "@/api/http";
import type { TeamListDto, UserDto } from "@/types/domain";

export async function listTeams() {
  const { data } = await http.get<TeamListDto[]>("/teams");
  return data;
}

export async function listInvitableUsers(teamId: number): Promise<UserDto[]> {
  const response = await fetch(`/api/teams/${teamId}/invitable-users`);
  if (!response.ok) {
    throw new Error("Failed to fetch invitable users");
  }
  return response.json();
}