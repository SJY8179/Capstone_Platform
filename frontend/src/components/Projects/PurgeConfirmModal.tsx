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
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { purgeProject } from "@/api/projects";
import type { ProjectListDto } from "@/types/domain";

interface PurgeConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectListDto | null;
  onSuccess?: (projectId: number) => void;
}

export function PurgeConfirmModal({
  open,
  onOpenChange,
  project,
  onSuccess
}: PurgeConfirmModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePurge = async () => {
    if (!project) return;

    if (confirmText !== project.name) {
      toast.error("프로젝트 이름이 일치하지 않습니다.");
      return;
    }

    try {
      setIsSubmitting(true);
      await purgeProject(project.id);

      toast.success("프로젝트가 영구 삭제되었습니다.", {
        description: "삭제된 데이터는 복구할 수 없습니다.",
      });

      onSuccess?.(project.id);
      onOpenChange(false);
      resetState();
    } catch (error) {
      console.error("Purge failed:", error);
      toast.error("영구 삭제에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setStep(1);
    setConfirmText("");
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      resetState();
    }
  };

  if (!project) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            프로젝트 영구 삭제
          </AlertDialogTitle>
          <AlertDialogDescription>
            {step === 1 ? (
              "이 작업은 되돌릴 수 없습니다. 프로젝트와 관련된 모든 데이터가 영구히 삭제됩니다."
            ) : (
              "정말로 영구 삭제하시겠습니까? 이 작업은 절대 복구할 수 없습니다."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="font-medium">{project.name}</div>
            <div className="text-sm text-muted-foreground">
              팀: {project.team} · 진행률: {project.progress}%
            </div>
          </div>

          {step === 1 ? (
            <div className="space-y-3">
              <div className="text-sm">
                <p className="font-medium mb-2">삭제될 데이터:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>프로젝트 정보 및 설정</li>
                  <li>관련 과제 및 일정</li>
                  <li>피드백 및 리뷰</li>
                  <li>프로젝트 문서</li>
                  <li>기타 연관 데이터</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="confirm-text" className="text-destructive">
                확인을 위해 프로젝트 이름을 정확히 입력하세요
              </Label>
              <Input
                id="confirm-text"
                placeholder={project.name}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isSubmitting}
                className="border-destructive/30 focus:border-destructive"
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>
            취소
          </AlertDialogCancel>
          {step === 1 ? (
            <Button
              onClick={() => setStep(2)}
              variant="destructive"
              disabled={isSubmitting}
            >
              계속하기
            </Button>
          ) : (
            <AlertDialogAction
              onClick={handlePurge}
              disabled={isSubmitting || confirmText !== project.name}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting ? "삭제 중..." : "영구 삭제"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default PurgeConfirmModal;