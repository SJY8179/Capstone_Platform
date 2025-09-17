// src/pages/Project/Assignments.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
    listAssignments,
    createAssignment,
    changeAssignmentStatus,
    deleteAssignment,
} from "@/api/assignments";
import { getReviewHistory, type ReviewHistoryItem } from "@/api/professorReview";
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
import {
    Loader2,
    RefreshCw,
    Trash2,
    Info,
    History as HistoryIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type FilterTab = "ALL" | "PENDING" | "ONGOING" | "COMPLETED";

/** ISO → 안전한 한국시간 문자열 (마이크로초 절단 + TZ 보정) */
function safeFormatDateTime(iso?: string | null) {
    if (!iso) return "—";
    try {
        let s = iso.trim();
        if (/\.\d{4,}/.test(s)) s = s.replace(/(\.\d{3})\d+/, "$1"); // >ms 절단
        if (!/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) s += "Z"; // TZ 없으면 UTC 가정
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleString("ko-KR");
    } catch {
        return "—";
    }
}

/** 날짜-only/ISO 모두 안전 파싱해서 날짜만 표기 */
function safeFormatDateOnly(iso?: string | null) {
    if (!iso) return "—";
    try {
        let s = iso.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += "T00:00:00Z"; // yyyy-MM-dd
        else {
            if (/\.\d{4,}/.test(s)) s = s.replace(/(\.\d{3})\d+/, "$1");
            if (!/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) s += "Z";
        }
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleDateString("ko-KR");
    } catch {
        return "—";
    }
}

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

    // 상세 Dialog
    const [detailOpen, setDetailOpen] = useState(false);
    const [selected, setSelected] = useState<Assignment | null>(null);
    const [detailTab, setDetailTab] = useState<"details" | "history">("details");
    const [history, setHistory] = useState<ReviewHistoryItem[] | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    const load = async () => {
        const list = await listAssignments(projectId);
        setItems(list);
        // 선택된 항목 최신 동기화
        if (selected) {
            const fresh = list.find((x) => x.id === selected.id) || null;
            setSelected(fresh);
        }
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            if (selected?.id === id) {
                setSelected((prev) => (prev ? { ...prev, status: value } : prev));
            }
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
            if (selected?.id === id) {
                setSelected(null);
                setDetailOpen(false);
            }
        } catch (e) {
            console.error(e);
            toast.error("삭제 실패");
        } finally {
            setBusy(false);
        }
    };

    const openDetail = async (a: Assignment) => {
        setSelected(a);
        setDetailTab("details");
        setDetailOpen(true);
        setHistory(null);
    };

    const maybeLoadHistory = async (assignmentId?: number) => {
        if (!assignmentId) return;
        try {
            setHistoryLoading(true);
            const rows = await getReviewHistory(assignmentId);
            setHistory(rows || []);
        } catch (e) {
            console.error(e);
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    // history 탭 전환 시 로드(최초 1회)
    useEffect(() => {
        if (detailOpen && detailTab === "history" && selected?.id) {
            if (history === null) {
                void maybeLoadHistory(selected.id);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detailOpen, detailTab, selected?.id]);

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
                {(["ALL", "PENDING", "ONGOING", "COMPLETED"] as FilterTab[]).map((t) => (
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
                ))}
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
                                        마감일: {a.dueDate ? safeFormatDateOnly(a.dueDate) : "—"}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-1 rounded ${statusBadgeClass(a.status)}`}>
                                        {a.status}
                                    </span>

                                    <Button variant="outline" size="sm" onClick={() => openDetail(a)} title="상세">
                                        <Info className="h-4 w-4 mr-1" />
                                        상세
                                    </Button>

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
                                        <Button size="sm" onClick={() => setStatus(a.id, "COMPLETED")} disabled={busy}>
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
                        <div className="text-center py-10 text-muted-foreground">표시할 과제가 없습니다.</div>
                    )}
                </CardContent>
            </Card>

            {/* 과제 상세 Dialog */}
            <Dialog
                open={detailOpen}
                onOpenChange={(open) => {
                    setDetailOpen(open);
                    if (!open) {
                        setSelected(null);
                        setHistory(null);
                        setDetailTab("details");
                    }
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5" />
                            {selected?.title || "과제 상세"}
                            {selected?.status ? (
                                <Badge className={`ml-2 ${statusBadgeClass(selected.status)}`}>{selected.status}</Badge>
                            ) : null}
                        </DialogTitle>
                        <DialogDescription>
                            과제에 남긴 승인/반려/메모 기록과 시각을 확인합니다.
                            마감일: {selected?.dueDate ? safeFormatDateOnly(selected?.dueDate) : "—"}
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs
                        value={detailTab}
                        onValueChange={(v) => setDetailTab(v as "details" | "history")}
                        className="mt-2"
                    >
                        <TabsList>
                            <TabsTrigger value="details">상세</TabsTrigger>
                            <TabsTrigger value="history" className="flex items-center gap-1">
                                <HistoryIcon className="h-4 w-4" />
                                검토 이력
                            </TabsTrigger>
                        </TabsList>

                        {/* 상세 탭 */}
                        <TabsContent value="details" className="mt-4">
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">과제 ID</span>
                                    <span>{selected?.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">제목</span>
                                    <span className="font-medium">{selected?.title || "제목 없음"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">마감일</span>
                                    <span>{selected?.dueDate ? safeFormatDateOnly(selected?.dueDate) : "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">현재 상태</span>
                                    <span className={`px-2 py-1 rounded text-xs ${statusBadgeClass(selected?.status)}`}>
                                        {selected?.status}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-2">
                                {selected && selected.status !== "PENDING" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setStatus(selected.id, "PENDING")}
                                        disabled={busy}
                                    >
                                        검토요청
                                    </Button>
                                )}
                                {selected && selected.status !== "ONGOING" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setStatus(selected.id, "ONGOING")}
                                        disabled={busy}
                                    >
                                        진행으로
                                    </Button>
                                )}
                                {selected && selected.status !== "COMPLETED" && (
                                    <Button size="sm" onClick={() => setStatus(selected.id, "COMPLETED")} disabled={busy}>
                                        완료
                                    </Button>
                                )}
                                {selected && (
                                    <Button variant="ghost" size="sm" onClick={() => onDelete(selected.id)} disabled={busy}>
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        삭제
                                    </Button>
                                )}
                            </div>
                        </TabsContent>

                        {/* 검토 이력 탭 */}
                        <TabsContent value="history" className="mt-4">
                            {historyLoading ? (
                                <div className="py-8 text-center text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                                    불러오는 중…
                                </div>
                            ) : history && history.length > 0 ? (
                                <div className="space-y-2">
                                    {history.map((h) => {
                                        const when =
                                            h.at ??
                                            // 백엔드가 다른 키로 줄 수도 있어 안전하게 처리
                                            (h as any)?.createdAtIso ??
                                            (h as any)?.createdAt ??
                                            null;

                                        return (
                                            <div key={h.id ?? `${when}-${h.action}`} className="border rounded-lg p-3 bg-card">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary">{h.action}</Badge>
                                                        <span className="font-medium">{h.actorName}</span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {safeFormatDateTime(when)}
                                                    </span>
                                                </div>
                                                {h.note ? <div className="mt-2 text-sm whitespace-pre-wrap">{h.note}</div> : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-muted-foreground">이력이 없습니다.</div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailOpen(false)}>
                            닫기
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
