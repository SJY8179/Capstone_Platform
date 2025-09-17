import { http } from "@/api/http";

/** 팀원 초대 요청 생성 */
export async function createInvitation(teamId: number, inviteeId: number, message?: string) {
  await http.post(`/teams/${teamId}/invitations`, { userId: inviteeId, message });
}

/** 초대 수락 */
export async function acceptInvitation(invitationId: number) {
  await http.post(`/invitations/${invitationId}/accept`);
}

/** 초대 거절 */
export async function declineInvitation(invitationId: number) {
  await http.post(`/invitations/${invitationId}/decline`);
}
