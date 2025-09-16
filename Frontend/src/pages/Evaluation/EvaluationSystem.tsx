import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download, MessageSquare, Star, MoreHorizontal, Pencil, Trash2, Tag
} from 'lucide-react';
import type { UserRole } from "@/types/user";
import {
  listProjectFeedbackPage,
  createProjectFeedback,
  updateProjectFeedback,
  deleteProjectFeedback,
} from '@/api/feedback';
import type { FeedbackDto } from '@/types/domain';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { http } from '@/api/http';

const TEXTS = {
  loading: '로딩중...',
  notAllowedTitle: '권한이 없습니다',
  notAllowedDesc: '이 기능은 교수 또는 관리자만 사용할 수 있습니다.',
  professor: {
    title: '피드백 관리',
    description: '학생 프로젝트에 피드백을 제공하세요',
    adminDescription: '시스템의 피드백을 관리하세요',
    export: '피드백 내보내기',
    feedbackList: '피드백 목록',
    newFeedback: '새 피드백 작성',
    feedbackFrom: '님의 피드백',
    noFeedback: '작성된 피드백이 없습니다.',
    newFeedbackTitle: '새 피드백 작성',
    newFeedbackDescription: '프로젝트에 대한 새로운 피드백을 작성합니다.',
    contentTitle: '피드백 내용',
    contentPlaceholder: '학생들에게 전달할 피드백을 작성하세요...',
    ratingTitle: '평점 (1–5, 선택)',
    submitButton: '피드백 제출',
    editTitle: '피드백 수정',
    editDesc: '선택한 피드백 내용을 수정합니다.',
    saveButton: '저장',
    cancelButton: '취소',
    deleteTitle: '피드백 삭제',
    deleteDesc: '정말로 이 피드백을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    deleteConfirm: '삭제',
  }
};

function extractRatingAndPlain(content: string): { rating: number | null; plain: string } {
  const clamp = (n: number) => Math.max(1, Math.min(5, n));
  const patterns: RegExp[] = [
    /^\s*(?:\[|\()?\s*rating\s*[:=]\s*(\d)\s*(?:\/\s*5)?\s*(?:\]|\))?\s*[-–—]?\s*/i,
    /^\s*[★⭐]\s*(\d)\s*\/\s*5\s*[-–—]?\s*/i,
  ];
  for (const p of patterns) {
    const m = content.match(p);
    if (m) {
      const rating = clamp(parseInt(m[1], 10));
      return { rating, plain: content.replace(p, '') };
    }
  }
  return { rating: null, plain: content };
}

function composeContent(rating: number | null, plain: string) {
  const base = (plain ?? '').trim();
  if (!rating) return base;
  return `[rating:${rating}] ${base}`;
}

function StarsDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`평점 ${rating}점`}>
      {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
        />
      ))}
    </div>
  );
}

function StarsPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const current = hover ?? value ?? 0;
  return (
    <div role="radiogroup" aria-label="평점 선택" className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => {
        const filled = n <= current;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(n)}
            className="p-1 rounded-md hover:bg-accent focus:outline-none focus:ring-2"
            aria-label={`${n}점`}
          >
            <Star className={`h-6 w-6 ${filled ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
          </button>
        );
      })}
    </div>
  );
}

interface EvaluationSystemProps {
  userRole: UserRole;
  projectId: number;
}

const PAGE_SIZE = 10;

export function EvaluationSystem({ userRole, projectId }: EvaluationSystemProps) {
  // ---------- state/memo (항상 같은 순서로) ----------
  const [items, setItems] = useState<FeedbackDto[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [newFeedbackText, setNewFeedbackText] = useState('');
  const [newRating, setNewRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [projectName, setProjectName] = useState<string | null>(null);
  const projectBadge = useMemo(
    () => (projectName ? `${projectName} (#${projectId})` : `Project #${projectId}`),
    [projectName, projectId]
  );

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editRating, setEditRating] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<FeedbackDto | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ---------- effects (항상 호출) ----------
  // 초기/리셋 로드 (권한 없으면 즉시 종료 & 로딩 false)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (userRole !== 'professor' && userRole !== 'admin') {
        if (mounted) {
          setItems([]);
          setNextCursor(null);
          setLoadingInit(false);
        }
        return;
      }
      try {
        setLoadingInit(true);
        const page = await listProjectFeedbackPage(projectId, { limit: PAGE_SIZE });
        if (!mounted) return;
        setItems(page.items ?? []);
        setNextCursor(page.nextCursor ?? null);
      } catch (error) {
        console.error("Failed to fetch project feedback:", error);
        toast.error("피드백 목록을 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoadingInit(false);
      }
    })();
    return () => { mounted = false; };
  }, [projectId, userRole]);

  // 프로젝트 이름 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      // 권한 없어도 이름 조회는 허용하지만, 실패해도 조용히 무시
      try {
        let list: any[] = [];
        try {
          const r1 = await http.get("/projects/my");
          list = Array.isArray(r1.data) ? r1.data : r1.data?.items ?? r1.data?.content ?? [];
        } catch {
          const r2 = await http.get("/projects");
          list = Array.isArray(r2.data) ? r2.data : r2.data?.items ?? r2.data?.content ?? [];
        }
        const found = list.find((p: any) => String(p?.id) === String(projectId));
        if (mounted) setProjectName(found?.name ?? found?.title ?? null);
      } catch {
        if (mounted) setProjectName(null);
      }
    })();
    return () => { mounted = false; };
  }, [projectId]);

  // 더 불러오기 콜백 (항상 선언)
  const loadMore = useCallback(async () => {
    if (loadingMore || nextCursor == null) return;
    setLoadingMore(true);
    try {
      const page = await listProjectFeedbackPage(projectId, {
        cursor: nextCursor,
        limit: PAGE_SIZE,
      });
      setItems((prev) => [...prev, ...(page.items ?? [])]);
      setNextCursor(page.nextCursor ?? null);
    } catch (e) {
      console.error(e);
      toast.error("추가 로드에 실패했습니다.");
    } finally {
      setLoadingMore(false);
    }
  }, [projectId, nextCursor, loadingMore]);

  // IntersectionObserver (항상 선언)
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    if (userRole !== 'professor' && userRole !== 'admin') return; // 권한 없으면 관찰 불필요
    const el = sentinelRef.current;
    const obs = new IntersectionObserver((entries) => {
      const ent = entries[0];
      if (ent.isIntersecting) {
        void loadMore();
      }
    }, { rootMargin: "200px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore, nextCursor, userRole]);

  // ---------- 이벤트 핸들러 ----------
  const onSubmitNew = async () => {
    const content = newFeedbackText.trim();
    if (!content) {
      toast.error("내용을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const payloadContent = composeContent(newRating, content);
      const created = await createProjectFeedback(projectId, payloadContent);
      setItems((prev) => {
        if (prev.some((x) => x.id === created.id)) return prev;
        return [created, ...prev];
      });
      setNewFeedbackText("");
      setNewRating(null);
      toast.success("피드백이 등록되었습니다.");
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.message || e?.message || "피드백 등록에 실패했습니다.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (f: FeedbackDto) => {
    const { rating, plain } = extractRatingAndPlain(f.content ?? "");
    setEditingId(f.id);
    setEditText(plain);
    setEditRating(rating);
    setEditOpen(true);
  };

  const onSaveEdit = async () => {
    const id = editingId;
    if (!id) return;
    const prevList = items;
    const idx = prevList.findIndex((x) => x.id === id);
    if (idx < 0) {
      setEditOpen(false);
      return;
    }
    const nextContent = composeContent(editRating, editText.trim());
    const optimistic: FeedbackDto = { ...prevList[idx], content: nextContent };

    setSavingEdit(true);
    setItems((arr) => {
      const copy = [...arr];
      copy[idx] = optimistic;
      return copy;
    });

    try {
      const saved = await updateProjectFeedback(projectId, id, nextContent);
      setItems((arr) => {
        const copy = [...arr];
        const pos = copy.findIndex((x) => x.id === id);
        if (pos >= 0) copy[pos] = saved;
        return copy;
      });
      setEditOpen(false);
      toast.success("수정되었습니다.");
    } catch (e: any) {
      console.error(e);
      setItems(prevList); // 롤백
      const msg = e?.response?.data?.message || e?.message || "수정에 실패했습니다.";
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const prev = items;
    setDeletingId(id);

    setItems((arr) => arr.filter((x) => x.id !== id));

    try {
      await deleteProjectFeedback(projectId, id);
      toast.success("삭제되었습니다.");
      setDeleteTarget(null);
    } catch (e: any) {
      console.error(e);
      setItems(prev); // 롤백
      const msg = e?.response?.data?.message || e?.message || "삭제에 실패했습니다.";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  // ---------- 가드/로딩 체크 (모든 Hook 선언 후) ----------
  if (userRole !== 'professor' && userRole !== 'admin') {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6">
          <h2 className="text-lg font-semibold">{TEXTS.notAllowedTitle}</h2>
          <p className="text-sm text-muted-foreground mt-1">{TEXTS.notAllowedDesc}</p>
        </div>
      </div>
    );
  }

  if (loadingInit) {
    return <div>{TEXTS.loading}</div>;
  }

  // ---------- 렌더 ----------
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            {TEXTS.professor.title}
            <Badge variant="outline" className="inline-flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {projectBadge}
            </Badge>
          </h1>
          <p className="text-muted-foreground">
            {userRole === 'professor' ? TEXTS.professor.description : TEXTS.professor.adminDescription}
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          {TEXTS.professor.export}
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">{TEXTS.professor.feedbackList}</TabsTrigger>
          <TabsTrigger value="new">{TEXTS.professor.newFeedback}</TabsTrigger>
        </TabsList>

        {/* 목록 탭 */}
        <TabsContent value="list" className="mt-6">
          <div className="grid gap-6">
            {items.length > 0 ? (
              items.map((feedback) => {
                const { rating, plain } = extractRatingAndPlain(feedback.content ?? "");
                return (
                  <Card key={feedback.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg">
                            {(feedback.author ?? "익명")}{TEXTS.professor.feedbackFrom}
                          </CardTitle>
                          <CardDescription>
                            작성일: {feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString() : 'N/A'}
                          </CardDescription>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" title="이 피드백이 속한 프로젝트">
                            #{projectId}
                          </Badge>

                          {!!rating && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{rating}/5</span>
                              <StarsDisplay rating={rating} />
                            </div>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="더보기">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => openEdit(feedback)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                수정
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onSelect={() => setDeleteTarget(feedback)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm p-4 border rounded-lg whitespace-pre-wrap">{plain}</p>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  {TEXTS.professor.noFeedback}
                </CardContent>
              </Card>
            )}

            {/* sentinel */}
            {nextCursor !== null && (
              <div ref={sentinelRef} className="py-4 text-center text-sm text-muted-foreground">
                {loadingMore ? "불러오는 중…" : "더 불러오는 중…"}
              </div>
            )}
            {nextCursor === null && items.length > 0 && (
              <div className="py-2 text-center text-xs text-muted-foreground">모든 항목을 불러왔습니다.</div>
            )}
          </div>
        </TabsContent>

        {/* 새 피드백 작성 탭 */}
        <TabsContent value="new" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{TEXTS.professor.newFeedbackTitle}</CardTitle>
              <CardDescription>{TEXTS.professor.newFeedbackDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">{TEXTS.professor.contentTitle}</h3>
                <Textarea
                  placeholder={TEXTS.professor.contentPlaceholder}
                  value={newFeedbackText}
                  onChange={(e) => setNewFeedbackText(e.target.value)}
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">{TEXTS.professor.ratingTitle}</h3>
                <StarsPicker value={newRating} onChange={setNewRating} />
              </div>
              <Button onClick={onSubmitNew} disabled={submitting}>
                <MessageSquare className="h-4 w-4 mr-2" />
                {submitting ? "제출 중..." : TEXTS.professor.submitButton}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 편집 Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{TEXTS.professor.editTitle}</DialogTitle>
            <DialogDescription>{TEXTS.professor.editDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={6}
              placeholder="내용을 입력하세요…"
            />
            <div className="space-y-2">
              <h4 className="font-medium text-sm">{TEXTS.professor.ratingTitle}</h4>
              <StarsPicker value={editRating} onChange={setEditRating} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {TEXTS.professor.cancelButton}
            </Button>
            <Button onClick={onSaveEdit} disabled={savingEdit}>
              {savingEdit ? "저장 중..." : TEXTS.professor.saveButton}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 AlertDialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{TEXTS.professor.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {TEXTS.professor.deleteDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{TEXTS.professor.cancelButton}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={onConfirmDelete}
                disabled={!!deleteTarget && deletingId === deleteTarget.id}
              >
                {!!deleteTarget && deletingId === deleteTarget.id ? "삭제 중..." : TEXTS.professor.deleteConfirm}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
