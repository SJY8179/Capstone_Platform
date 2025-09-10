import React, { useEffect, useMemo, useState } from "react";
import {
  listAssignments,
  createAssignment,
  changeAssignmentStatus,
  deleteAssignment,
} from "@/api/assignments";
import type { Assignment } from "@/types/domain";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

type FilterTab = "ALL" | "PENDING" | "ONGOING" | "COMPLETED";

function statusBadgeClass(s?: string | null) {
  switch (s) {
    case "PENDING":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "ONGOING":
      return "bg-blue-100 text-blue-700 border border-blue-200";
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    default:
      return "bg-muted text-foreground";
  }
}

interface Props {
  projectId: number;
}

export default function ProjectAssignments({ projectId }: Props) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("ALL");

  // 새 과제 폼
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<string>(""); // yyyy-MM-dd

  const load = async () => {
    const list = await listAssignments(projectId);
    setItems(list);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (e) {
        console.error(e);
        toast.error("과제 목록 불러오기 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const onRefresh = async () => {
    try {
      setBusy(true);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async () => {
    if (!title.trim()) {
      toast.message("제목을 입력하세요");
      return;
    }
    try {
      setBusy(true);
      await createAssignment(projectId, {
        title: title.trim(),
        dueDateIso: dueDate || undefined,
        status: "ONGOING",
      });
      setTitle("");
      setDueDate("");
      await load();
      toast.success("과제가 추가되었습니다.");
    } catch (e) {
      console.error(e);
      toast.error("과제 추가 실패");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: number, value: Assignment["status"]) => {
    try {
      setBusy(true);
      // 낙관적 반영
      setItems((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: value } : a))
      );
      await changeAssignmentStatus(projectId, id, value);
      toast.success(value === "PENDING" ? "검토 요청됨" : "상태 변경됨");
      await load(); // 최종 동기화
    } catch (e) {
      console.error(e);
      toast.error("상태 변경 실패");
      await load(); // 롤백/보정
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    try {
      setBusy(true);
      await deleteAssignment(projectId, id);
      await load();
      toast.success("삭제되었습니다.");
    } catch (e) {
      console.error(e);
      toast.error("삭제 실패");
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(
    () => items.filter((i) => (filter === "ALL" ? true : i.status === filter)),
    [items, filter]
  );

  if (loading) return <div className="p-6">로딩중...</div>;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">과제 관리</h2>
          <p className="text-muted-foreground">
            과제를 생성/관리하고, 검토 요청을 보낼 수 있습니다.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={busy}>
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          <span className="ml-1">새로고침</span>
        </Button>
      </div>

      {/* 생성 폼 */}
      <Card>
        <CardHeader>
          <CardTitle>새 과제</CardTitle>
          <CardDescription>제목과 마감일(선택)을 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>제목</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 중간 보고서"
            />
          </div>
          <div className="space-y-2">
            <Label>마감일</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={onCreate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              추가
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 필터 탭 */}
      <div className="inline-flex items-center gap-1 rounded-lg border p-1">
        {(["ALL", "PENDING", "ONGOING", "COMPLETED"] as FilterTab[]).map(
          (t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={[
                "px-3 py-1.5 rounded-md text-sm transition",
                filter === t
                  ? "bg-primary text-primary-foreground shadow"
                  : "hover:bg-muted text-foreground/80",
              ].join(" ")}
            >
              {t === "ALL" ? "전체" : t === "PENDING" ? "대기" : t === "ONGOING" ? "진행" : "완료"}
            </button>
          )
        )}
      </div>

      {/* 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>과제 목록</CardTitle>
          <CardDescription>클릭 한 번으로 상태를 변경할 수 있어요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length ? (
            filtered.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between border rounded-xl px-4 py-3 bg-card hover:bg-muted/30 transition"
              >
                <div className="space-y-0.5">
                  <div className="font-medium">{a.title || "제목 없음"}</div>
                  <div className="text-xs text-muted-foreground">
                    마감일:{" "}
                    {a.dueDate
                      ? new Date(a.dueDate).toLocaleDateString("ko-KR")
                      : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${statusBadgeClass(
                      a.status
                    )}`}
                  >
                    {a.status}
                  </span>

                  {a.status !== "PENDING" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatus(a.id, "PENDING")}
                      disabled={busy}
                    >
                      검토요청
                    </Button>
                  )}
                  {a.status !== "ONGOING" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatus(a.id, "ONGOING")}
                      disabled={busy}
                    >
                      진행으로
                    </Button>
                  )}
                  {a.status !== "COMPLETED" && (
                    <Button
                      size="sm"
                      onClick={() => setStatus(a.id, "COMPLETED")}
                      disabled={busy}
                    >
                      완료
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(a.id)}
                    disabled={busy}
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              표시할 과제가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
