import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProjectRepo } from "@/api/projects";
import { toast } from "sonner";

function parseGithubInput(text: string): { owner: string; name: string; url: string } | null {
  if (!text) return null;
  const t = text.trim().replace(/^git\+/, "").replace(/\.git$/, "");
  const m1 = t.match(/github\.com[/:]([^/]+)\/([^/#?]+)/i);
  if (m1?.[1] && m1?.[2]) {
    const owner = m1[1];
    const name = m1[2];
    return { owner, name, url: `https://github.com/${owner}/${name}` };
  }
  const m2 = t.match(/^([^/\s]+)\/([^/#?\s]+)$/);
  if (m2?.[1] && m2?.[2]) {
    const owner = m2[1];
    const name = m2[2];
    return { owner, name, url: `https://github.com/${owner}/${name}` };
  }
  return null;
}

export default function GithubConnectDialog({
  open,
  onOpenChange,
  projectId,
  onConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onConnected?: (url: string) => void;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const parsed = parseGithubInput(value);
    if (!parsed) {
      toast("형식이 올바르지 않습니다.", {
        description: "owner/repo 또는 GitHub URL을 입력해 주세요.",
      });
      return;
    }
    setSaving(true);
    try {
      const detail = await updateProjectRepo(projectId, parsed.url); // ← 문자열(URL)로 전달
      onConnected?.(detail?.repo?.url ?? parsed.url);
      toast("GitHub 레포가 연결되었습니다.", { description: parsed.url });
      onOpenChange(false);
    } catch (e: any) {
      toast("연동에 실패했습니다.", { description: e?.message ?? "잠시 후 다시 시도해 주세요." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>GitHub 저장소 연동</DialogTitle>
          <DialogDescription>owner/repo 또는 전체 URL을 입력하세요.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="gh-url">저장소</Label>
          <Input
            id="gh-url"
            placeholder="예) acme/capstone 또는 https://github.com/acme/capstone"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>취소</Button>
            <Button onClick={save} disabled={saving}>저장</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}