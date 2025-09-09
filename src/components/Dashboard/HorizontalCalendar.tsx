import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { listSchedulesInRange } from "@/api/schedules";
// 생성 API 직접 호출 제거 -> EventEditor 모달로 전환
import type {
  ScheduleDto,
  ScheduleType,
  SchedulePriority,
  EventType,
} from "@/types/domain";
import { EventEditor } from "@/components/Schedule/EventEditor";
import { scheduleBus } from "@/lib/schedule-bus";

interface HorizontalCalendarProps {
  className?: string;
  /** 지정하지 않으면 백엔드가 첫 프로젝트로 처리 */
  projectId?: number;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const toYMD = (d: Date) => d.toISOString().split("T")[0];
const monthLabel = (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
const weekLabel = (start: Date) => {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startPart = `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일`;
  const endPart = `${sameMonth ? "" : `${end.getMonth() + 1}월 `}${end.getDate()}일`;
  return `${startPart} - ${endPart}`;
};

type UiEvent = {
  id: string;
  title: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:mm
  type: ScheduleType;
  priority: SchedulePriority;
  description?: string;
};

export function HorizontalCalendar({ className, projectId }: HorizontalCalendarProps) {
  const [currentOffset, setCurrentOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [events, setEvents] = useState<UiEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // 새 일정 모달 상태 (제목은 빈값으로 시작)
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState<{
    id?: number;
    title: string;
    date: string;
    startTime?: string;
    endTime?: string;
    type: EventType;
    location?: string;
  } | undefined>(undefined);

  const today = new Date();

  // 주 시작(일요일)
  const getStartOfWeek = (date: Date, weekOffset = 0) => {
    const start = new Date(date);
    const day = start.getDay();
    start.setDate(start.getDate() - day + weekOffset * 7);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  // 월 시작(1일)
  const getStartOfMonth = (date: Date, monthOffset = 0) => {
    const start = new Date(date.getFullYear(), date.getMonth() + monthOffset, 1);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  // 현재 주/월 그리드
  const weekDays = useMemo(() => {
    const start = getStartOfWeek(today, currentOffset);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [today, currentOffset]);

  const monthDays = useMemo(() => {
    const startOfMonth = getStartOfMonth(today, currentOffset);
    const endOfMonth = new Date(
      startOfMonth.getFullYear(),
      startOfMonth.getMonth() + 1,
      0
    );
    const startDay = startOfMonth.getDay();
    const days: Date[] = [];

    // 이전달 말일
    for (let i = startDay - 1; i >= 0; i--) {
      const prev = new Date(startOfMonth);
      prev.setDate(prev.getDate() - (i + 1));
      days.push(prev);
    }
    // 이번달
    for (let d = 1; d <= endOfMonth.getDate(); d++) {
      days.push(new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), d));
    }
    // 다음달 앞부분 (42칸 유지)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const next = new Date(endOfMonth);
      next.setDate(endOfMonth.getDate() + i);
      days.push(next);
    }
    return days;
  }, [today, currentOffset]);

  const displayDays = isExpanded ? monthDays : weekDays;
  const currentReferenceDate = isExpanded
    ? getStartOfMonth(today, currentOffset)
    : getStartOfWeek(today, currentOffset);
  const unitLabel = isExpanded ? "달" : "주";

  /** 조회 범위 계산 */
  const fetchRange = useMemo(() => {
    if (isExpanded) {
      const start = getStartOfMonth(today, currentOffset);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      return { from: toYMD(start), to: toYMD(end) };
    } else {
      const start = getStartOfWeek(today, currentOffset);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: toYMD(start), to: toYMD(end) };
    }
  }, [isExpanded, today, currentOffset]);

  /** API → UI 모델 변환 */
  const mapToUi = (data: ScheduleDto[]): UiEvent[] =>
    (data ?? []).map((s) => ({
      id: String(s.id),
      title: s.title ?? "",
      date: s.date ?? "",
      time: s.time ?? "",
      type: (s.type as ScheduleType) ?? "task",
      priority: (s.priority as SchedulePriority) ?? "low",
      description: s.description ?? undefined,
    }));

  /** 데이터 로딩 */
  const reload = async () => {
    setLoading(true);
    try {
      const rows = await listSchedulesInRange({
        from: fetchRange.from,
        to: fetchRange.to,
        projectId,
      });
      setEvents(mapToUi(rows));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRange.from, fetchRange.to, projectId]);

  const getEventsForDate = (date: Date) => {
    const ymd = toYMD(date);
    return events.filter((e) => e.date === ymd);
  };

  const selectedDateEvents = selectedDate
    ? events.filter((e) => e.date === selectedDate)
    : [];

  const getTypeIcon = (type: ScheduleType, cls = "h-3 w-3") => {
    switch (type) {
      case "deadline":
        return <AlertCircle className={`${cls} text-red-500`} />;
      case "meeting":
        return <Users className={`${cls} text-green-500`} />;
      case "task":
      default:
        return <FileText className={`${cls} text-purple-500`} />;
    }
  };

  const getTypeBadge = (type: ScheduleType) => {
    switch (type) {
      case "deadline":
        return (
          <Badge variant="destructive" className="text-xs">
            마감
          </Badge>
        );
      case "meeting":
        return (
          <Badge variant="secondary" className="text-xs">
            회의
          </Badge>
        );
      case "task":
      default:
        return (
          <Badge variant="outline" className="text-xs">
            작업
          </Badge>
        );
    }
  };

  const getPriorityColor = (priority?: SchedulePriority) => {
    switch (priority) {
      case "high":
        return "border-l-red-500";
      case "medium":
        return "border-l-yellow-500";
      case "low":
      default:
        return "border-l-green-500";
    }
  };

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const isSelected = (d: Date) => selectedDate === toYMD(d);
  const formatDateHeader = () =>
    isExpanded ? monthLabel(currentReferenceDate) : weekLabel(currentReferenceDate);

  const isCurrentMonth = (date: Date) => {
    if (!isExpanded) return true;
    const ref = getStartOfMonth(today, currentOffset);
    return date.getMonth() === ref.getMonth() && date.getFullYear() === ref.getFullYear();
  };

  /** 일정 추가 버튼 → 모달 열기(제목 하드코딩 제거) */
  const onClickAdd = () => {
    // 기준 날짜: 선택된 날짜가 있으면 해당 날짜, 없으면 보이는 범위의 시작일
    const base = selectedDate ? new Date(selectedDate) : new Date(fetchRange.from);
    // 기본 시간: 10:00 ~ 10:30
    const start = new Date(base);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const toHHMM = (d: Date) =>
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    setEditorInitial({
      title: "",
      date: toYMD(base),
      startTime: toHHMM(start),
      endTime: toHHMM(end),
      type: "MEETING",
      location: "온라인",
    });
    setEditorOpen(true);
  };

  return (
    <div className={`space-y-6 ${className ?? ""}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {isExpanded ? "월간 일정" : "주간 일정"}
              </CardTitle>
              <CardDescription>{formatDateHeader()}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentOffset((v) => v - 1)}
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4" />
                {`이전 ${unitLabel}`}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentOffset(0)} disabled={loading}>
                {`이번 ${unitLabel}`}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentOffset((v) => v + 1)}
                disabled={loading}
              >
                {`다음 ${unitLabel}`}
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={loading} onClick={onClickAdd}>
                <Plus className="h-4 w-4 mr-2" />
                일정 추가
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {DAY_LABELS.map((day, idx) => (
              <div
                key={day}
                className={`text-center py-2 text-sm font-medium ${
                  idx === 0 ? "text-red-500" : idx === 6 ? "text-blue-500" : ""
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div
            className={`grid grid-cols-7 gap-2 ${
              isExpanded ? "grid-rows-6" : "grid-rows-1"
            }`}
          >
            {displayDays.map((date) => {
              const dayEvents = getEventsForDate(date);
              const key = toYMD(date);
              const inCurrentMonth = isCurrentMonth(date);
              const maxEvents = isExpanded ? 4 : 2;
              const minHeight = isExpanded ? "min-h-[150px]" : "min-h-[120px]";

              return (
                <div
                  key={key}
                  className={`
                    ${minHeight} p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md
                    ${isToday(date) ? "bg-primary/5 border-primary" : "border-border hover:border-primary/50"}
                    ${isSelected(date) ? "ring-2 ring-primary ring-offset-2" : ""}
                    ${!inCurrentMonth ? "opacity-50 bg-muted/20" : ""}
                  `}
                  onClick={() => setSelectedDate(key)}
                >
                  <div
                    className={`text-center mb-3 ${
                      isToday(date)
                        ? "font-bold text-primary"
                        : inCurrentMonth
                        ? ""
                        : "text-muted-foreground"
                    }`}
                  >
                    <span className="text-lg">{date.getDate()}</span>
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, maxEvents).map((event) => (
                      <div
                        key={event.id}
                        className="text-xs p-1.5 rounded bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {getTypeIcon(event.type, "h-2 w-2")}
                          <span className="truncate font-medium">{event.title}</span>
                        </div>
                        {isExpanded && event.time && (
                          <div className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-2 w-2" />
                            <span>{event.time}</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {dayEvents.length > maxEvents && (
                      <div className="text-xs text-muted-foreground text-center py-1 font-medium">
                        +{dayEvents.length - maxEvents}개 더 보기
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 접기/펼치기 */}
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded((v) => !v)}
              className="flex items-center gap-2"
              disabled={loading}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  주간 보기로 접기
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  월간 보기로 펼치기
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 선택한 날짜의 상세 일정 */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>
              {new Date(selectedDate).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </CardTitle>
            <CardDescription>
              {selectedDateEvents.length > 0
                ? `${selectedDateEvents.length}개의 일정`
                : "일정이 없습니다"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-6 border-l-4 bg-muted/30 rounded-r-md ${getPriorityColor(
                      event.priority
                    )}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(event.type, "h-4 w-4")}
                        <span className="font-medium">{event.title}</span>
                      </div>
                      {getTypeBadge(event.type)}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Clock className="h-4 w-4" />
                      <span>{event.time ?? "-"}</span>
                    </div>

                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                        {event.description}
                      </p>
                    )}

                    <div className="flex justify-end">
                      <Button size="sm" variant="outline">
                        상세보기
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  선택한 날짜에 등록된 일정이 없습니다.
                </p>
                <Button size="sm" variant="outline" disabled={loading} onClick={onClickAdd}>
                  <Plus className="h-3 w-3 mr-2" />
                  일정 추가
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 새 일정 모달 (제목 직접 입력) */}
      <EventEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        projectId={projectId ?? 1}
        initial={editorInitial}
        onSaved={async () => {
          setEditorOpen(false);
          await reload(); // 로컬 UI 갱신
          scheduleBus.emitChanged();  // 전역 변경 알림 (사이드바 등)
        }}
      />
    </div>
  );
}