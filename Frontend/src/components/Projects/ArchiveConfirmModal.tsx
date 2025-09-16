import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { archiveProject } from "@/api/projects";
import type { ProjectListDto } from "@/types/domain";

interface ArchiveConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectListDto | null;
  onSuccess?: (projectId: number) => void;
  onRestore?: (projectId: number) => void;
}

export function ArchiveConfirmModal({
  open,
  onOpenChange,
  project,
  onSuccess,
  onRestore
}: ArchiveConfirmModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleArchive = async () => {
    if (!project) return;

    if (confirmText !== project.name) {
      toast.error("프로젝트 이름이 일치하지 않습니다.");
      return;
    }

    try {
      setIsSubmitting(true);
      await archiveProject(project.id);

      toast.success("프로젝트가 휴지통으로 이동되었습니다.", {
        description: "프로젝트 관리 > 휴지통 탭에서 복원할 수 있습니다.",
        action: {
          label: "되돌리기",
          onClick: async () => {
            try {
              if (onRestore) {
                onRestore(project.id);
              } else {
                const { restoreProject } = await import("@/api/projects");
                await restoreProject(project.id);
                toast.success("프로젝트가 복원되었습니다.");
                onSuccess?.(project.id);
              }
            } catch (error) {
              toast.error("복원에 실패했습니다.");
            }
          },
        },
      });

      onSuccess?.(project.id);
      onOpenChange(false);
      setConfirmText("");
    } catch (error) {
      console.error("Archive failed:", error);
      toast.error("아카이브에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      setConfirmText("");
    }
  };

  if (!project) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>프로젝트를 휴지통으로 이동</AlertDialogTitle>
          <AlertDialogDescription>
            프로젝트가 휴지통으로 이동되어 기본 목록에서 숨겨집니다.
            언제든지 프로젝트 관리의 휴지통 탭에서 복원할 수 있습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="font-medium">{project.name}</div>
            <div className="text-sm text-muted-foreground">
              팀: {project.team} · 진행률: {project.progress}%
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              확인을 위해 프로젝트 이름을 입력하세요
            </Label>
            <Input
              id="confirm-text"
              placeholder={project.name}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={isSubmitting || confirmText !== project.name}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? "휴지통으로 이동 중..." : "휴지통으로 이동"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ArchiveConfirmModal;