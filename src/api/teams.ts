﻿import { http } from "@/api/http";
import type { TeamListDto } from "@/types/domain";

/** 내가 속한 팀 목록만 */
export async function listTeams() {
  const { data } = await http.get<TeamListDto[]>("/teams/my");
  return data;
}

/** (관리자용 등) 전체 팀 목록이 필요하면 이걸 사용 */
export async function listAllTeams() {
  const { data } = await http.get<TeamListDto[]>("/teams");
  return data;
}