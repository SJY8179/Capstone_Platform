import { http } from "@/api/http";
import type { ProjectOverviewDto, ProjectDocumentDto, RiskDto, DecisionDto } from "@/types/domain";

function toLocalIso(input?: string | Date | null): string | undefined {
  if (!input) return undefined;
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}`;
}

/* -------- Overview -------- */

// 캐시 무효화용 공통 GET
async function fetchOverviewFresh(projectId: number): Promise<ProjectOverviewDto> {
  const { data } = await http.get(`/projects/${projectId}/overview`, {
    params: { t: Date.now() }, // ⚡ 캐시 무효화
  });
  return data;
}

export async function getOverview(projectId: number): Promise<ProjectOverviewDto> {
  // 초깃값도 신선하게
  return fetchOverviewFresh(projectId);
}

export async function saveOverview(projectId: number, markdown: string): Promise<ProjectOverviewDto> {
  await http.put(`/projects/${projectId}/overview`, { markdown });
  // 저장 후 최신본 재조회
  return fetchOverviewFresh(projectId);
}

export async function submitOverviewProposal(projectId: number, markdown: string): Promise<ProjectOverviewDto> {
  await http.post(`/projects/${projectId}/overview/submit`, { markdown });
  // 제출 후 최신본 재조회
  return fetchOverviewFresh(projectId);
}

export async function approveOverviewProposal(projectId: number): Promise<ProjectOverviewDto> {
  await http.post(`/projects/${projectId}/overview/approve`, {});
  // 승인 후 최신본 재조회
  return fetchOverviewFresh(projectId);
}

export async function rejectOverviewProposal(projectId: number): Promise<ProjectOverviewDto> {
  await http.post(`/projects/${projectId}/overview/reject`, {});
  // 반려 후 최신본 재조회
  return fetchOverviewFresh(projectId);
}

/* -------- Documents -------- */
export async function listDocs(projectId: number): Promise<ProjectDocumentDto[]> {
  const { data } = await http.get(`/projects/${projectId}/documents`, { params: { t: Date.now() } });
  return Array.isArray(data) ? data : data?.items ?? [];
}
export async function createDoc(
  projectId: number,
  payload: { title: string; url: string; type: ProjectDocumentDto["type"] }
): Promise<ProjectDocumentDto> {
  const { data } = await http.post(`/projects/${projectId}/documents`, payload);
  return data;
}
export async function deleteDoc(docId: number): Promise<void> {
  await http.delete(`/documents/${docId}`);
}

/* -------- Risks -------- */
export async function listRisks(projectId: number): Promise<RiskDto[]> {
  const { data } = await http.get(`/projects/${projectId}/risks`, { params: { t: Date.now() } });
  return Array.isArray(data) ? data : data?.items ?? [];
}
export async function createRisk(
  projectId: number,
  payload: {
    title: string;
    impact: number;
    likelihood: number;
    mitigation?: string | null;
    owner?: string | null;
    dueDate?: string | Date | null;
    status: string;
  }
) {
  const body = { ...payload, dueDate: toLocalIso(payload.dueDate) };
  const { data } = await http.post(`/projects/${projectId}/risks`, body);
  return data;
}
export async function updateRisk(
  riskId: number,
  patch: Partial<{
    title: string;
    impact: number;
    likelihood: number;
    mitigation: string | null;
    owner: string | null;
    dueDate: string | Date | null;
    status: string;
  }>
) {
  const body = { ...patch, dueDate: toLocalIso(patch.dueDate ?? undefined) };
  const { data } = await http.patch(`/risks/${riskId}`, body);
  return data;
}
export async function deleteRisk(riskId: number): Promise<void> {
  await http.delete(`/risks/${riskId}`);
}

/* -------- Decisions -------- */
export async function listDecisions(projectId: number): Promise<DecisionDto[]> {
  const { data } = await http.get(`/projects/${projectId}/decisions`, { params: { t: Date.now() } });
  return Array.isArray(data) ? data : data?.items ?? [];
}
export async function createDecision(projectId: number, payload: Partial<DecisionDto>): Promise<DecisionDto> {
  const { data } = await http.post(`/projects/${projectId}/decisions`, payload);
  return data;
}
export async function updateDecision(
  id: number,
  patch: Partial<{
    title: string;
    context: string;
    options: string;
    decision: string;
    consequences: string;
    decidedAt: string | Date | null;
    decidedById: number | null;
  }>
) {
  const body = { ...patch, decidedAt: toLocalIso(patch.decidedAt ?? undefined) };
  const { data } = await http.patch(`/decisions/${id}`, body);
  return data;
}
export async function deleteDecision(decisionId: number): Promise<void> {
  await http.delete(`/decisions/${decisionId}`);
}
