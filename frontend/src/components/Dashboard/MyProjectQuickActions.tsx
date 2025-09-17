import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, GitBranch } from "lucide-react";
import { getProjectDetail } from "@/api/projects";
import GithubConnectDialog from "@/components/Projects/GithubConnectDialog";
import ProjectDetailPanel from "@/components/Projects/ProjectDetailPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function MyProjectQuickActions({ projectId }: { projectId: number }) {
  const [ghOpen, setGhOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const PDP: any = ProjectDetailPanel;

  const onClickGithub = async () => {
    const detail = await getProjectDetail(projectId);
    const url = detail?.repo?.url ?? null;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      setGhOpen(true);
    }
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" className="flex-1" onClick={() => setReportOpen(true)}>
        <FileText className="h-4 w-4 mr-2" />
        보고서 작성
      </Button>
      <Button size="sm" variant="outline" className="flex-1" onClick={onClickGithub}>
        <GitBranch className="h-4 w-4 mr-2" />
        {repoUrl ? "GitHub 열기" : "GitHub 연동"}
      </Button>

      {/* GitHub 연동 */}
      <GithubConnectDialog
        open={ghOpen}
        onOpenChange={setGhOpen}
        projectId={projectId}
        onConnected={(url) => setRepoUrl(url)}
      />

      {/* 프로젝트 상세(개요/편집) 다이얼로그 */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent
          style={{ maxWidth: "none", width: "96vw", maxHeight: "92vh" }}
          className="sm:max-w-none overflow-y-auto p-0"
        >
          <DialogHeader className="sticky top-0 z-10 bg-background p-6 pb-4 border-b">
            <DialogTitle>프로젝트 개요/보고서</DialogTitle>
            <DialogDescription className="sr-only">
              프로젝트 개요 작성/수정
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-4">
            <PDP projectId={projectId} initialTab="overview" forceEdit />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}