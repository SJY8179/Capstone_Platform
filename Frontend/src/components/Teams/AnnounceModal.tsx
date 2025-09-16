import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AnnounceModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamName: string;
    onSubmit: (title: string, content: string) => Promise<void>;
}

export function AnnounceModal({ isOpen, onClose, teamName, onSubmit }: AnnounceModalProps) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) {
            toast.warning("제목과 내용을 모두 입력해주세요.");
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit(title, content);
            toast.success(`'${teamName}' 팀에 공지를 보냈습니다.`);
            handleClose();
            onClose();
        } catch (error) {
            toast.error("공지 발송에 실패했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setTitle("");
        setContent("");
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{teamName} 팀에 공지 보내기</DialogTitle>
                    <DialogDescription>
                        작성한 내용은 팀에 속한 모든 학생들에게 전송됩니다.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">제목</Label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="content">내용</Label>
                        <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>취소</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        발송
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}