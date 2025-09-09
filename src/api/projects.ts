import { http } from "@/api/http";
import type { ProjectListDto } from "@/types/domain";

export async function listProjects() {
  const { data } = await http.get<ProjectListDto[]>("/projects");
  return data;
<<<<<<< HEAD
}
=======
}


>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
