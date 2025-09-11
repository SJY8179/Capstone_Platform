import { useState } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createTeam } from "@/api/teams";
import type { TeamListDto } from "@/types/domain";

interface CreateTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateSuccess: (newTeam: TeamListDto) => void;
}

export function CreateTeamModal({ isOpen, onClose, onCreateSuccess }: CreateTeamModalProps) {
    const [teamName, setTeamName] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreate = async () => {
        if (!teamName.trim()) {
            alert("팀 이름을 입력해 주세요.");
            return;
        }

        setIsSubmitting(true);
        try {
            const newTeam = await createTeam(teamName, description);
            onCreateSuccess(newTeam);
            alert("새로운 팀이 생성되었습니다.");
            onClose();
        } catch (error) {
            console.error("[팀 생성 실패] Failed to create team:", error);
            alert(`팀 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
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
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>새 팀 생성</DialogTitle>
                    <DialogDescription>
                        새로운 팀의 이름과 설명을 입력하세요. 팀 생성 후 팀원을 초대할 수 있습니다.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="team-name" className="text-right">팀 이름</Label>
                        <Input
                            id="team-name"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            className="col-span-3"
                            placeholder="예: 캡스톤 플랫폼 프로젝트 관리 4조"
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
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose}>취소</Button>
                    <Button type="submit" onClick={handleCreate} disabled={!teamName.trim() || isSubmitting}>
                        {isSubmitting ? "생성 중..." : "팀 생성"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}