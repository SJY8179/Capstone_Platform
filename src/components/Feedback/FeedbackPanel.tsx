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

/* ===== 공통 유틸: 시간/레이팅 ===== */
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

function parseRating(content?: string | null): { rating: number | null; body: string } {
  const raw = content ?? "";
  const m = raw.match(/\[rating:(\d)\]/i);
  const rating = m ? Math.max(1, Math.min(5, Number(m[1]))) : null;
  const body = raw.replace(/\s*\[rating:\d\]\s*/i, "").trim();
  return { rating, body };
}

function composeWithRating(body: string, rating: number | null) {
  const clean = (body || "").trim();
  return rating ? `[rating:${rating}] ${clean}` : clean;
}

function StarPicker({
  value,
  onChange,
  readOnly = false,
}: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  const makeBtn = (i: number) => {
    const filled = i <= value;
    const base = filled ? "text-yellow-500" : "text-muted-foreground";
    return (
      <button
        key={i}
        type="button"
        className={`px-0.5 ${base} select-none`}
        aria-label={`${i}점`}
        onClick={() => !readOnly && onChange?.(i)}
        disabled={readOnly}
      >
        {filled ? "★" : "☆"}
      </button>
    );
  };
  return <div className="inline-flex">{[1, 2, 3, 4, 5].map(makeBtn)}</div>;
}

type Props = {
  projectId: number;
  /** 작성·수정·삭제 권한(관리자/담당교수) */
  canWrite?: boolean;
  /** 초기에 불러올 개수 (기본 5) */
  initialLimit?: number;
};

export default function FeedbackPanel({ projectId, canWrite, initialLimit = 5 }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedbackDto[]>([]);
  const [loading, setLoading] = useState(true);

  // 작성 폼
  const [text, setText] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRating, setNewRating] = useState<number>(0);

  // 검색(간단 필터)
  const [q, setQ] = useState("");

  // 편집 상태
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingRating, setEditingRating] = useState<number>(0);

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
    const contentBody = text.trim();
    if (!contentBody) {
      toast.message("내용을 입력하세요.");
      return;
    }
    setCreating(true);

    // 낙관적 추가
    const tempId = -Date.now();
    const optimistic: FeedbackDto = {
      id: tempId,
      author: user?.name || "나",
      content: composeWithRating(contentBody, newRating || null),
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [optimistic, ...prev]);
    setText("");
    setNewRating(0);

    try {
      const created = await createProjectFeedback(projectId, optimistic.content || "");
      // temp 교체
      setItems((prev) =>
        prev.map((x) => (x.id === tempId ? created : x))
      );
      toast.success("피드백을 남겼어요.");
    } catch (e) {
      console.error(e);
      // 롤백
      setItems((prev) => prev.filter((x) => x.id !== tempId));
      setText(contentBody);
      setNewRating(newRating);
      toast.error("작성에 실패했어요.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (it: FeedbackDto) => {
    setEditingId(it.id);
    const { rating, body } = parseRating(it.content);
    setEditingValue(body);
    setEditingRating(rating ?? 0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
    setEditingRating(0);
  };

  const onSaveEdit = async (id: number) => {
    const contentBody = editingValue.trim();
    if (!contentBody) {
      toast.message("내용을 입력하세요.");
      return;
    }

    const nextContent = composeWithRating(contentBody, editingRating || null);

    // 낙관적 반영
    const prev = items.find((x) => x.id === id);
    setItems((prevList) =>
      prevList.map((x) => (x.id === id ? { ...x, content: nextContent } : x))
    );

    try {
      await updateProjectFeedback(projectId, id, nextContent);
      toast.success("수정되었습니다.");
      setEditingId(null);
      setEditingValue("");
      setEditingRating(0);
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">별점</span>
              <StarPicker value={newRating} onChange={(v) => setNewRating(v)} />
              {newRating ? <span className="text-xs text-muted-foreground ml-1">{newRating}/5</span> : null}
            </div>
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
          {filtered.map((it) => {
            const { rating, body } = parseRating(it.content);
            const isEditing = editingId === it.id;
            return (
              <Card key={it.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{it.author || "작성자"}</div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {formatK(it.createdAt)}
                      </div>

                      {isEditing ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-muted-foreground">별점</span>
                            <StarPicker value={editingRating} onChange={(v) => setEditingRating(v)} />
                            {editingRating ? (
                              <span className="text-xs text-muted-foreground ml-1">{editingRating}/5</span>
                            ) : null}
                          </div>
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
                        <>
                          {rating != null && (
                            <div className="mb-1">
                              <StarPicker value={rating} readOnly />
                              <span className="text-xs text-muted-foreground ml-2">{rating}/5</span>
                            </div>
                          )}
                          <div className="whitespace-pre-wrap text-sm">
                            {body || "-"}
                          </div>
                        </>
                      )}
                    </div>

                    {/* 액션(권한 보유 시) */}
                    {canWrite && !isEditing && (
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
            );
          })}
        </div>
      )}
    </div>
  );
}
