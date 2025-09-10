import React, { useEffect, useState } from "react";
import { HorizontalCalendar } from "./HorizontalCalendar";
import { scheduleBus } from "@/lib/schedule-bus";
import { invalidateSchedulesCache } from "@/api/schedules";

interface CalendarWidgetProps {
  className?: string;
  projectId?: number; // optional
}

/**
 * 일정 저장/수정 후 캘린더가 즉시 반영되도록 하는 래퍼.
 * - scheduleBus의 변경 이벤트를 구독
 * - 해당 projectId의 스케줄 캐시 무효화
 * - key 변경으로 HorizontalCalendar를 리마운트 → 재패치
 */
export function CalendarWidget({ className, projectId }: CalendarWidgetProps) {
  // 리프레시 트리거용 버전 스테이트
  const [version, setVersion] = useState(0);

  // projectId 변경 시에도 캘린더 초기화/재패치
  useEffect(() => {
    setVersion((v) => v + 1);
  }, [projectId]);

  useEffect(() => {
    const handler = () => {
      if (projectId) {
        // 동일 프로젝트의 기존 목록 캐시 제거
        try {
          invalidateSchedulesCache(projectId);
        } catch {
          // 캐시 레이어가 없을 수도 있으니 조용히 무시
        }
      }
      // 리마운트 유도 → 내부 useEffect들이 다시 실행되며 재조회
      setVersion((v) => v + 1);
    };

    // 다양한 버스 구현을 안전하게 지원
    let off: (() => void) | undefined;

    try {
      // 1) onChanged(handler) 형태 지원
      // @ts-ignore - 런타임 안전호출
      off = scheduleBus.onChanged?.(handler);
    } catch {
      /* noop */
    }

    try {
      // 2) on("changed", handler)/off("changed", handler) 형태 지원
      if (!off) {
        // @ts-ignore
        if (typeof scheduleBus.on === "function") {
          // @ts-ignore
          scheduleBus.on("changed", handler);
          off = () => {
            try {
              // @ts-ignore
              scheduleBus.off?.("changed", handler);
            } catch {
              /* noop */
            }
          };
        }
      }
    } catch {
      /* noop */
    }

    return () => {
      try {
        off?.();
      } catch {
        /* noop */
      }
    };
  }, [projectId]);

  return (
    <HorizontalCalendar
      key={`${projectId ?? "none"}:${version}`}
      className={className}
      projectId={projectId}
    />
  );
}

export default CalendarWidget;
