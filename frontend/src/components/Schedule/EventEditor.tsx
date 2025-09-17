import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EventType } from "@/types/domain";
import { createEvent, updateEvent } from "@/api/events";
import { scheduleBus } from "@/lib/schedule-bus";
import { listProjects } from "@/api/projects";
import { useAuth } from "@/stores/auth";
import { toast } from "sonner";
import { accessErrorMessage, getApiError, isAccessError } from "@/api/http";
import { http } from "@/api/http";
import { probeScheduleAccess } from "@/api/schedules";

/* ---------- helpers ---------- */
function toISO(dateYmd: string, timeHm?: string | ""): string {
  const [y, m, d] = dateYmd.split("-").map((v) => parseInt(v, 10));
  let hh = 0, mm = 0;
  if (timeHm && timeHm.includes(":")) {
    [hh, mm] = timeHm.split(":").map((v) => parseInt(v, 10));
  }
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0);
  return dt.toISOString();
}

async function fetchProjectOptionsWithFallback(isAdminOrProf: boolean) {
  // 1차: 기존 API
  try {
    const list = await listProjects({ isAdmin: isAdminOrProf /* admin이면 전체 */ });
    if (Array.isArray(list) && list.length) return list;
  } catch {}

  // 2차: mine
  try {
    const { data } = await http.get("/projects/mine");
    if (Array.isArray(data) && data.length) return data;
  } catch {}

  // 3차: teaching (교수용)
  try {
    const { data } = await http.get("/projects/teaching");
    if (Array.isArray(data) && data.length) return data;
  } catch {}

  // 4차: 전체 (권한 있는 계정만)
  try {
    const { data } = await http.get("/projects");
    if (Array.isArray(data) && data.length) return data;
  } catch {}

  return [];
}

/* ---------- types ---------- */
type EditorInitial = {
  id?: number;          // 있으면 수정 모드
  title: string;
  date: string;         // yyyy-MM-dd
  startTime?: string;   // HH:mm
  endTime?: string;     // HH:mm
  type: EventType;
  location?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** 없을 수 있음 → 이 경우 상단에서 프로젝트를 선택하게 안내 */
  projectId?: number;
  initial?: EditorInitial;
  onSaved?: () => void;
}

/* ---------- component ---------- */
export function EventEditor({
  open,
  onOpenChange,
  projectId,
  initial,
  onSaved,
}: Props) {
  const editMode = !!initial?.id;
  const { user } = useAuth();

  // form
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "");
  const [type, setType] = useState<EventType>(initial?.type ?? "MEETING");
  const [location, setLocation] = useState(initial?.location ?? "");

  // 프로젝트 선택(없을 때만 사용)
  const [projectIdPicked, setProjectIdPicked] = useState<string>("");
  const [projectOptions, setProjectOptions] = useState<{ id: number; name: string }[]>([]);
  const mustPickProject = !projectId;

  // initial 변경 시 폼 리셋
  useEffect(() => {
    setTitle(initial?.title ?? "");
    setDate(initial?.date ?? "");
    setStartTime(initial?.startTime ?? "");
    setEndTime(initial?.endTime ?? "");
    setType(initial?.type ?? "MEETING");
    setLocation(initial?.location ?? "");
  }, [initial, open]);

  // 프로젝트 목록 로딩(프로젝트 미선택 케이스)
  useEffect(() => {
    if (!open || !mustPickProject) return;
    (async () => {
      try {
        const isAdminOrProf = user?.role === "admin" || user?.role === "professor";
        const raw = await fetchProjectOptionsWithFallback(!!isAdminOrProf);

        // 학생은 내 프로젝트만, 교수/관리자는 전체 허용
        const myId = user?.id ? String(user.id) : undefined;

        const mine = raw.filter((p: any) => {
          if (isAdminOrProf) return true;
          const members = Array.isArray(p.members) ? p.members : [];
          return members.some((m: any) =>
            (myId && m?.id != null && String(m.id) === myId) ||
            (user?.email && m?.email && String(m.email).toLowerCase() === String(user.email).toLowerCase()) ||
            (user?.name && m?.name && String(m.name) === String(user.name))
          );
        });

        // **학생만** 권한 프로브 (읽기 불가 프로젝트 숨김)
        const shouldProbe = user?.role === "student";
        let filtered = mine;
        if (shouldProbe) {
          const probed = await Promise.allSettled(
            mine.map(async (p: any) => ({ p, ok: await probeScheduleAccess(p.id).catch(() => false) }))
          );
          filtered = probed
            .map((r) => (r.status === "fulfilled" ? r.value : null))
            .filter(Boolean)
            .filter((v: any) => v.ok)
            .map((v: any) => v.p);
        }

        setProjectOptions(
          filtered.map((p: any) => ({ id: p.id, name: p.name ?? p.title ?? `프로젝트 #${p.id}` }))
        );
      } catch {
        setProjectOptions([]);
      }
    })();
  }, [open, mustPickProject, user]);

  const canSave = useMemo(() => {
    const hasProject = !!projectId || (!!projectIdPicked && !Number.isNaN(Number(projectIdPicked)));
    return !!title && !!date && hasProject;
  }, [title, date, projectId, projectIdPicked]);

  const onSave = async () => {
    if (!canSave) return;
    const pid = projectId ?? Number(projectIdPicked);
    try {
      const startAtIso = toISO(date, startTime || "00:00");
      // 종료시간 비움 -> endAtIso를 빈 문자열로 보내 서버가 null로 세팅하게 함
      const endAtIso = endTime ? toISO(date, endTime) : "";

      if (editMode && initial?.id) {
        await updateEvent(pid, initial.id, {
          title,
          startAtIso,
          endAtIso,
          type,
          location,
        });
      } else {
        await createEvent(pid, {
          title,
          startAtIso,
          endAtIso,
          type,
          location,
        });
      }
      onSaved?.();
      scheduleBus.emitChanged(); //저장 성공하면 전역으로 변경 알림
      toast.success(editMode ? "일정을 저장했어요." : "일정을 추가했어요.");
      onOpenChange(false);
    } catch (e: any) {
      const err = getApiError(e);
      if (isAccessError(err)) {
        toast.error(accessErrorMessage(err.code));
      } else if (err.status === 400) {
        toast.error("입력값을 확인해 주세요.");
      } else {
        toast.error(err.message || "저장에 실패했습니다.");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{editMode ? "일정 편집" : "새 일정 추가"}</DialogTitle>
          <DialogDescription className="sr-only">
            일정 생성/편집 대화상자
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4">
          {/* 프로젝트 선택 (projectId prop이 없을 때만 노출) */}
          {mustPickProject && (
            <div className="grid gap-2">
              <Label>프로젝트</Label>
              <Select value={projectIdPicked} onValueChange={setProjectIdPicked}>
                <SelectTrigger>
                  <SelectValue placeholder={projectOptions.length ? "프로젝트 선택" : "선택할 프로젝트가 없습니다"} />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 스프린트 회의"
            />
          </div>

          <div className="grid gap-2">
            <Label>유형</Label>
            <Select value={type} onValueChange={(v) => setType(v as EventType)}>
              <SelectTrigger>
                <SelectValue placeholder="유형 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEETING">회의</SelectItem>
                <SelectItem value="DEADLINE">마감</SelectItem>
                <SelectItem value="PRESENTATION">발표</SelectItem>
                <SelectItem value="ETC">기타(작업)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="date">날짜</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="start">시작 시간</Label>
              <Input
                id="start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="end">종료 시간(선택)</Label>
            <Input
              id="end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="loc">위치(선택)</Label>
            <Input
              id="loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예: 온라인/랩실"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button onClick={onSave} disabled={!canSave}>
              {editMode ? "저장" : "추가"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
