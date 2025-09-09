import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  AlertCircle,
  Video,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface HorizontalCalendarProps {
  className?: string;
}

interface ScheduleEvent {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: "deadline" | "presentation" | "meeting" | "task";
  priority: "high" | "medium" | "low";
  description?: string;
}

export function HorizontalCalendar({ className }: HorizontalCalendarProps) {
  const [currentOffset, setCurrentOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);

  // 오늘 기준 더미 일정 (실서비스에선 API 연동)
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const addDays = (d: Date, n: number) =>
    new Date(d.getTime() + n * 24 * 60 * 60 * 1000);

  const scheduleEvents: ScheduleEvent[] = [
    {
      id: 1,
      title: "중간 보고서 제출",
      date: fmt(addDays(today, 5)),
      time: "23:59",
      type: "deadline",
      priority: "high",
      description: "AI 기반 스마트 캠퍼스 플랫폼 중간 보고서 제출",
    },
    {
      id: 2,
      title: "팀 Alpha 발표",
      date: fmt(addDays(today, 8)),
      time: "14:00",
      type: "presentation",
      priority: "high",
      description: "프로토타입 데모 세션",
    },
    {
      id: 3,
      title: "팀 회의",
      date: fmt(addDays(today, 2)),
      time: "19:00",
      type: "meeting",
      priority: "medium",
      description: "이번 주 진행상황 및 다음 스프린트 계획",
    },
    {
      id: 4,
      title: "교수님 미팅",
      date: fmt(addDays(today, 10)),
      time: "15:30",
      type: "meeting",
      priority: "medium",
      description: "프로젝트 진행 방향 점검",
    },
    {
      id: 5,
      title: "설계 문서 작성",
      date: fmt(addDays(today, 12)),
      time: "18:00",
      type: "task",
      priority: "high",
      description: "아키텍처/ERD 정리 및 팀 공유",
    },
    {
      id: 6,
      title: "오늘 프로젝트 회의",
      date: fmt(today),
      time: "16:00",
      type: "meeting",
      priority: "medium",
      description: "기능 분담/이슈 정리",
    },
    {
      id: 7,
      title: "내일 과제 마감 준비",
      date: fmt(addDays(today, 1)),
      time: "10:00",
      type: "task",
      priority: "high",
      description: "리뷰 항목 체크 및 제출물 정리",
    },
  ];

  // 주 시작(일요일 기준) 계산
  const getStartOfWeek = (date: Date, weekOffset = 0) => {
    const start = new Date(date);
    const day = start.getDay(); // 0(일)~6(토)
    const diff = start.getDate() - day + weekOffset * 7;
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  // 현재 주의 7일 구성
  const getCurrentWeekDays = () => {
    const startOfWeek = getStartOfWeek(today, currentOffset);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  };

  // 월 시작일 계산
  const getStartOfMonth = (date: Date, monthOffset = 0) => {
    const start = new Date(date.getFullYear(), date.getMonth() + monthOffset, 1);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  // 월간 달력용 6주(최대 42칸) 채우기
  const getCurrentMonthDays = () => {
    const startOfMonth = getStartOfMonth(today, currentOffset);
    const endOfMonth = new Date(
      startOfMonth.getFullYear(),
      startOfMonth.getMonth() + 1,
      0
    );

    const startDay = startOfMonth.getDay(); // 0~6
    const days: Date[] = [];

    // 이전달 말일 채우기
    for (let i = startDay - 1; i >= 0; i--) {
      const prev = new Date(startOfMonth);
      prev.setDate(prev.getDate() - i - 1);
      days.push(prev);
    }

    // 현재달 채우기
    for (let i = 1; i <= endOfMonth.getDate(); i++) {
      days.push(new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), i));
    }

    // 다음달 앞부분 채우기(총 42칸 유지)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const next = new Date(endOfMonth);
      next.setDate(endOfMonth.getDate() + i);
      days.push(next);
    }

    return days;
  };

  const weekDays = getCurrentWeekDays();
  const monthDays = getCurrentMonthDays();
  const displayDays = isExpanded ? monthDays : weekDays;
  const currentReferenceDate = isExpanded
    ? getStartOfMonth(today, currentOffset)
    : getStartOfWeek(today, currentOffset);

  // 날짜별 일정
  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split("T")[0];
    return scheduleEvents.filter((e) => e.date === dateString);
  };

  const selectedDateEvents = selectedDate
    ? getEventsForDate(new Date(selectedDate))
    : [];

  const getTypeIcon = (type: string, cls = "h-3 w-3") => {
    switch (type) {
      case "deadline":
        return <AlertCircle className={`${cls} text-red-500`} />;
      case "presentation":
        return <Video className={`${cls} text-blue-500`} />;
      case "meeting":
        return <Users className={`${cls} text-green-500`} />;
      case "task":
        return <FileText className={`${cls} text-purple-500`} />;
      default:
        return <CalendarIcon className={`${cls} text-gray-500`} />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "deadline":
        return (
          <Badge variant="destructive" className="text-xs">
            마감
          </Badge>
        );
      case "presentation":
        return (
          <Badge variant="default" className="text-xs">
            발표
          </Badge>
        );
      case "meeting":
        return (
          <Badge variant="secondary" className="text-xs">
            회의
          </Badge>
        );
      case "task":
        return (
          <Badge variant="outline" className="text-xs">
            작업
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {type}
          </Badge>
        );
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500";
      case "medium":
        return "border-l-yellow-500";
      case "low":
        return "border-l-green-500";
      default:
        return "border-l-gray-300";
    }
  };

  const isToday = (date: Date) =>
    date.toDateString() === new Date().toDateString();

  const isSelected = (date: Date) =>
    selectedDate === date.toISOString().split("T")[0];

  const formatDateHeader = () => {
    if (isExpanded) {
      return `${currentReferenceDate.getFullYear()}년 ${
        currentReferenceDate.getMonth() + 1
      }월`;
    } else {
      const start = new Date(currentReferenceDate);
      const end = new Date(currentReferenceDate);
      end.setDate(start.getDate() + 6);
      return `${start.getFullYear()}년 ${
        start.getMonth() + 1
      }월 ${start.getDate()}일 - ${end.getMonth() + 1}월 ${end.getDate()}일`;
    }
  };

  const isCurrentMonth = (date: Date) => {
    if (!isExpanded) return true;
    const ref = getStartOfMonth(today, currentOffset);
    return (
      date.getMonth() === ref.getMonth() && date.getFullYear() === ref.getFullYear()
    );
  };

  return (
    <div className={`space-y-6 ${className ?? ""}`}>
      {/* 캘린더 헤더 */}
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
              >
                <ChevronLeft className="h-4 w-4" />
                {isExpanded ? "이전 달" : "이전 주"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentOffset(0)}>
                오늘로
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentOffset((v) => v + 1)}
              >
                {isExpanded ? "다음 달" : "다음 주"}
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                일정 추가
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* 요일 헤더 */}
            {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
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

          <div
            className={`grid grid-cols-7 gap-2 ${
              isExpanded ? "grid-rows-6" : "grid-rows-1"
            }`}
          >
            {displayDays.map((date) => {
              const events = getEventsForDate(date);
              const dateString = date.toISOString().split("T")[0];
              const currentMonthDate = isCurrentMonth(date);
              const maxEvents = isExpanded ? 4 : 2;
              const minHeight = isExpanded ? "min-h-[150px]" : "min-h-[120px]";

              return (
                <div
                  key={dateString}
                  className={`
                    ${minHeight} p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md
                    ${isToday(date) ? "bg-primary/5 border-primary" : "border-border hover:border-primary/50"}
                    ${isSelected(date) ? "ring-2 ring-primary ring-offset-2" : ""}
                    ${!currentMonthDate ? "opacity-50 bg-muted/20" : ""}
                  `}
                  onClick={() => setSelectedDate(dateString)}
                >
                  <div
                    className={`text-center mb-3 ${
                      isToday(date)
                        ? "font-bold text-primary"
                        : currentMonthDate
                        ? ""
                        : "text-muted-foreground"
                    }`}
                  >
                    <span className="text-lg">{date.getDate()}</span>
                  </div>

                  <div className="space-y-1">
                    {events.slice(0, maxEvents).map((event) => (
                      <div
                        key={event.id}
                        className="text-xs p-1.5 rounded bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {getTypeIcon(event.type, "h-2 w-2")}
                          <span className="truncate font-medium">{event.title}</span>
                        </div>
                        {isExpanded && (
                          <div className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-2 w-2" />
                            <span>{event.time}</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {events.length > maxEvents && (
                      <div className="text-xs text-muted-foreground text-center py-1 font-medium">
                        +{events.length - maxEvents}개 더보기
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 확장/축소 토글 */}
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded((v) => !v)}
              className="flex items-center gap-2"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  주간 보기로 축소
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  월간 보기로 확장
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 선택한 날짜의 일정 상세 */}
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
                      <span>{event.time}</span>
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
                  이 날짜에는 일정이 없습니다.
                </p>
                <Button size="sm" variant="outline">
                  <Plus className="h-3 w-3 mr-2" />
                  일정 추가
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
