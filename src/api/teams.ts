import { http } from "@/api/http";
<<<<<<< HEAD
import type { TeamListDto, UserDto } from "@/types/domain";
=======
import type { TeamListDto } from "@/types/domain";
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938

export async function listTeams() {
  const { data } = await http.get<TeamListDto[]>("/teams");
  return data;
}

<<<<<<< HEAD
export async function listInvitableUsers(teamId: number): Promise<UserDto[]> {
  const response = await fetch(`/api/teams/${teamId}/invitable-users`);
  if (!response.ok) {
    throw new Error("Failed to fetch invitable users");
  }
  return response.json();
}
=======

>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
