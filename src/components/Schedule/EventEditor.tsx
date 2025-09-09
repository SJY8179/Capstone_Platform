import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // a11y 경고 제거용
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
  projectId: number;
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

  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "");
  const [type, setType] = useState<EventType>(initial?.type ?? "MEETING");
  const [location, setLocation] = useState(initial?.location ?? "");

  // initial 변경 시 폼 리셋
  useEffect(() => {
    setTitle(initial?.title ?? "");
    setDate(initial?.date ?? "");
    setStartTime(initial?.startTime ?? "");
    setEndTime(initial?.endTime ?? "");
    setType(initial?.type ?? "MEETING");
    setLocation(initial?.location ?? "");
  }, [initial, open]);

  const canSave = useMemo(() => !!title && !!date, [title, date]);

  const onSave = async () => {
    if (!canSave) return;
    try {
      const startAtIso = toISO(date, startTime || "00:00");
      // 종료시간 비움 -> endAtIso를 빈 문자열로 보내 서버가 null로 세팅하게 함
      const endAtIso = endTime ? toISO(date, endTime) : "";

      if (editMode && initial?.id) {
        await updateEvent(projectId, initial.id, {
          title,
          startAtIso,
          endAtIso,
          type,
          location,
        });
      } else {
        await createEvent(projectId, {
          title,
          startAtIso,
          endAtIso,
          type,
          location,
        });
      }
      onSaved?.();
      scheduleBus.emitChanged(); //저장 성공하면 전역으로 변경 알림
    } catch (e: any) {
      alert(e?.message ?? "저장에 실패했습니다.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{editMode ? "일정 편집" : "새 일정 추가"}</DialogTitle>
          {/* 스크린리더용 설명 (경고 제거) */}
          <DialogDescription className="sr-only">
            일정 생성/편집 대화상자
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4">
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