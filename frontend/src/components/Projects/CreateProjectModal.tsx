import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createProject, type ProjectCreateRequest } from "@/api/projects";
import type { ProjectListDto } from "@/types/domain";
import { toast } from "sonner";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSuccess: (newProject: ProjectListDto) => void;
}

export function CreateProjectModal({ isOpen, onClose, onCreateSuccess }: CreateProjectModalProps) {
  const [formData, setFormData] = useState<ProjectCreateRequest>({
    title: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("프로젝트명을 입력해 주세요.");
      return;
    }

    if (formData.title.trim().length < 2 || formData.title.trim().length > 50) {
      toast.error("프로젝트명은 2-50자 사이여야 합니다.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const newProject = await createProject({
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
      });
      
      toast.success("프로젝트가 생성되었습니다.");
      onCreateSuccess(newProject);   // 리스트 갱신
      onClose();                     // ✅ 성공 시 모달 닫기
      resetForm();                   // 닫기 직후 폼 초기화(잔상 방지)
    } catch (error) {
      console.error("[프로젝트 생성 실패]", error);
      toast.error("생성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);        // 제출 버튼만 비활성 → 복구
    }
  };

  // 컴포넌트 언마운트 시 상태 초기화
  useEffect(() => {
    return () => {
      setIsSubmitting(false);
    };
  }, []);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>새 프로젝트</DialogTitle>
          <DialogDescription>
            새로운 프로젝트의 정보를 입력하세요.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project-title" className="text-right">
                프로젝트명 *
              </Label>
              <Input
                id="project-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="col-span-3"
                placeholder="프로젝트명을 입력하세요 (2-50자)"
                maxLength={50}
                disabled={isSubmitting}
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project-description" className="text-right">
                설명
              </Label>
              <Textarea
                id="project-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
                placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
            >
              {isSubmitting ? "생성 중..." : "생성"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}