import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TeamListDto, ProjectListDto } from "@/types/domain";

// 컴포넌트가 받을 Props 정의
interface ProjectSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: TeamListDto | null;
    onProjectSelect: (projectId: number) => void;
    actionType: "feedback" | "schedule";
}

export function ProjectSelectionModal({
    isOpen,
    onClose,
    team,
    onProjectSelect,
    actionType,
}: ProjectSelectionModalProps) {
    if (!team) return null;

    const titleText =
        actionType === "feedback"
            ? "피드백할 프로젝트를 선택하세요"
            : "일정을 관리할 프로젝트를 선택하세요";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {team.name}: {titleText}
                    </DialogTitle>
                    <DialogDescription>
                        아래 목록에서 원하는 프로젝트를 클릭하면 해당 페이지로 바로
                        이동합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-auto space-y-3 my-4">
                    {(team?.projects ?? []).length > 0 ? (
                        team!.projects!.map((project: ProjectListDto) => (
                            <div
                                key={project.id}
                                className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => {
                                    onProjectSelect(project.id);
                                    onClose();
                                }}
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        onProjectSelect(project.id);
                                        onClose();
                                    }
                                }}
                            >
                                <p className="font-semibold text-primary">{project.name}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {project.description || "프로젝트 개요가 없습니다."}
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            이 팀이 참여 중인 프로젝트가 없습니다.
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        취소
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}