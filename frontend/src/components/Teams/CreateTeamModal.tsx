import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createTeam } from "@/api/teams";
import type { TeamListDto } from "@/types/domain";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSuccess: (newTeam: TeamListDto) => void;
}

export function CreateTeamModal({ isOpen, onClose, onCreateSuccess }: CreateTeamModalProps) {
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 모달이 열릴 때 입력 초기화
  useEffect(() => {
    if (isOpen) {
      setTeamName("");
      setDescription("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleCreate = async () => {
    const name = teamName.trim();
    const desc = description.trim();

    if (!name) {
      toast.message("팀 이름을 입력하세요.");
      return;
    }

    try {
      setIsSubmitting(true);

      const newTeam = await createTeam(name, desc || undefined);

      // 목록 반영
      onCreateSuccess(newTeam);

      // ✅ 브라우저 alert 대신 토스트
      toast.success("새로운 팀이 생성되었습니다.", {
        description: newTeam.name,
      });

      handleClose();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "잠시 후 다시 시도해주세요.";
      toast.error("팀 생성에 실패했습니다.", { description: msg });
      console.error("[팀 생성 실패]", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTeamName("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>새 팀 생성</DialogTitle>
          <DialogDescription>
            팀 이름과 설명을 입력하세요. 생성자는 역할에 따라 자동으로 팀에 편입됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="team-name" className="text-right">팀 이름</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              className="col-span-3"
              placeholder="예: 캡스톤 플랫폼 프로젝트 관리 4조"
              maxLength={80}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">팀 설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="우리 팀의 목표나 프로젝트에 대해 간단히 설명해주세요."
              maxLength={500}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button type="submit" onClick={handleCreate} disabled={!teamName.trim() || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "생성 중..." : "팀 생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
