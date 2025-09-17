import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { listTeamProfessors, getAllProfessors } from "@/api/teams";
import { createProfessorRequestForProject } from "@/api/professorRequests";
import { toast } from "sonner";

type ProfessorLite = { id: number; name: string; email: string };

export function RequestProfessorDialog({
  open,
  onOpenChange,
  projectId,
  teamId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  teamId: number | null | undefined;
}) {
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [profs, setProfs] = useState<ProfessorLite[]>([]);
  const [profId, setProfId] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      setProfs([]);
      setProfId(undefined);
      setMessage("");
      try {
        let list: ProfessorLite[] = [];
        if (teamId && teamId > 0) {
          list = await listTeamProfessors(teamId);
        }
        if (!list || list.length === 0) {
          list = await getAllProfessors();
        }
        setProfs(list ?? []);
      } catch (e) {
        console.error(e);
        toast.error("교수 목록을 불러오지 못했습니다.");
        setProfs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, teamId]);

  const submit = async () => {
    if (!profId || profId === "none") {
      toast.error("담당 교수님을 선택해 주세요.");
      return;
    }
    try {
      setPosting(true);
      await createProfessorRequestForProject(projectId, parseInt(profId, 10), message.trim() || undefined);
      toast.success("담당 교수님에게 요청을 보냈어요.");
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "요청 전송에 실패했습니다.";
      toast.error(msg);
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !posting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>담당 교수 지정 요청</DialogTitle>
          <DialogDescription>
            프로젝트의 담당 교수님께 배정을 요청할 수 있어요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>교수 선택</Label>
            <Select
              value={profId}
              onValueChange={setProfId}
              disabled={loading || posting}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "교수 목록 로딩 중..." : "담당 교수님을 선택하세요"} />
              </SelectTrigger>
              <SelectContent>
                {(!profs || profs.length === 0) && (
                  <SelectItem value="none" disabled>
                    표시할 교수 목록이 없습니다
                  </SelectItem>
                )}
                {profs.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} ({p.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="req-msg">메세지 (선택)</Label>
            <Textarea
              id="req-msg"
              placeholder="예: 해당 주제에 대한 지도가 필요합니다."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={posting}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={posting}>
            나중에
          </Button>
          <Button onClick={submit} disabled={posting || !profId}>
            {posting ? "전송 중..." : "요청 보내기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
