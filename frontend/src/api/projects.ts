import { http } from "@/api/http";
import type { ProjectListDto } from "@/types/domain";

export async function listProjects() {
  const { data } = await http.get<ProjectListDto[]>("/projects");
  return data;
}
