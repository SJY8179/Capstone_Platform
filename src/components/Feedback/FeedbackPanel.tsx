import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  listProjectFeedback,
  createProjectFeedback,
  updateProjectFeedback,
  deleteProjectFeedback,
} from "@/api/feedback";
import { useAuth } from "@/stores/auth";
import type { FeedbackDto } from "@/types/domain";

type Props = {
  projectId: number;
  /** 작성·수정·삭제 권한(관리자/담당교수) */
  canWrite?: boolean;
  /** 초기에 불러올 개수 (기본 5) */
  initialLimit?: number;
};

function formatK(iso?: string | null) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

export default function FeedbackPanel({ projectId, canWrite, initialLimit = 5 }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedbackDto[]>([]);
  const [loading, setLoading] = useState(true);

  // 작성 폼
  const [text, setText] = useState("");
  const [creating, setCreating] = useState(false);

  // 검색(간단 필터)
  const [q, setQ] = useState("");

  // 편집 상태
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const rows = await listProjectFeedback(projectId, initialLimit);
      setItems(rows ?? []);
    } catch (e) {
      console.error(e);
      toast.error("피드백 목록을 불러오지 못했어요.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter(
      (it) =>
        (it.author ?? "").toLowerCase().includes(qq) ||
        (it.content ?? "").toLowerCase().includes(qq)
    );
  }, [items, q]);

  const onCreate = async () => {
    const content = text.trim();
    if (!content) {
      toast.message("내용을 입력하세요.");
      return;
    }
    setCreating(true);

    // 낙관적 추가
    const tempId = -Date.now();
    const optimistic: FeedbackDto = {
      id: tempId,
      author: user?.name || "나",
      content,
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [optimistic, ...prev]);
    setText("");

    try {
      const created = await createProjectFeedback(projectId, content);
      // temp 교체
      setItems((prev) =>
        prev.map((x) => (x.id === tempId ? created : x))
      );
      toast.success("피드백을 남겼어요.");
    } catch (e) {
      console.error(e);
      // 롤백
      setItems((prev) => prev.filter((x) => x.id !== tempId));
      setText(content);
      toast.error("작성에 실패했어요.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (it: FeedbackDto) => {
    setEditingId(it.id);
    setEditingValue(it.content ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const onSaveEdit = async (id: number) => {
    const content = editingValue.trim();
    if (!content) {
      toast.message("내용을 입력하세요.");
      return;
    }

    // 낙관적 반영
    const prev = items.find((x) => x.id === id);
    setItems((prevList) =>
      prevList.map((x) => (x.id === id ? { ...x, content } : x))
    );

    try {
      await updateProjectFeedback(projectId, id, content);
      toast.success("수정되었습니다.");
      setEditingId(null);
      setEditingValue("");
    } catch (e) {
      console.error(e);
      // 롤백
      if (prev) {
        setItems((prevList) =>
          prevList.map((x) => (x.id === id ? prev : x))
        );
      }
      toast.error("수정에 실패했어요.");
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm("이 피드백을 삭제할까요?")) return;

    // 낙관적 제거
    const backup = items;
    setItems((prev) => prev.filter((x) => x.id !== id));

    try {
      await deleteProjectFeedback(projectId, id);
      toast.success("삭제했습니다.");
    } catch (e) {
      console.error(e);
      setItems(backup);
      toast.error("삭제에 실패했어요.");
    }
  };

  return (
    <div className="space-y-4">
      {/* 작성 영역 */}
      {canWrite && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="학생들에게 남길 피드백을 입력하세요…"
              rows={3}
            />
            <div className="flex justify-end">
              <Button onClick={onCreate} disabled={creating}>
                {creating ? "등록 중…" : "등록"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 검색/필터 */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="작성자/내용 검색…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          새로고침
        </Button>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-sm text-muted-foreground p-6">불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground p-6">피드백이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((it) => (
            <Card key={it.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{it.author || "작성자"}</div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {formatK(it.createdAt)}
                    </div>

                    {editingId === it.id ? (
                      <>
                        <Textarea
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          rows={3}
                        />
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" onClick={() => onSaveEdit(it.id)}>
                            저장
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            취소
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm">
                        {it.content || "-"}
                      </div>
                    )}
                  </div>

                  {/* 액션(권한 보유 시) */}
                  {canWrite && editingId !== it.id && (
                    <div className="flex-shrink-0 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(it)}>
                        수정
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onDelete(it.id)}>
                        삭제
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
