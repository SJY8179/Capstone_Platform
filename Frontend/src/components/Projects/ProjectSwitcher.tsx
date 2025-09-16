import React, { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { listProjects } from "@/api/projects";
import type { ProjectListDto } from "@/types/domain";
import { Skeleton } from "@/components/ui/skeleton";

export interface ProjectSwitcherProps {
  /** 현재 선택된 프로젝트 id */
  value?: number | null;
  /** 선택 변경 콜백 */
  onChange?: (projectId: number) => void;
  /** 관리자면 전체 프로젝트, 아니면 내 프로젝트 */
  isAdmin?: boolean;
  /** placeholder 문구 */
  placeholder?: string;
  /** 너비 */
  className?: string;
}

/** 컨트롤드 모드에서 '선택 없음'을 나타내는 내부 값 */
const EMPTY_VALUE = "__EMPTY__";

export function ProjectSwitcher({
  value,
  onChange,
  isAdmin,
  placeholder = "프로젝트 선택",
  className,
}: ProjectSwitcherProps) {
  const [items, setItems] = useState<ProjectListDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const rows = await listProjects({ isAdmin });
        if (mounted) setItems(rows);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const current = useMemo(
    () => items.find((p) => String(p.id) === String(value ?? "")),
    [items, value]
  );

  // 항상 컨트롤드: 선택 없음일 때도 EMPTY_VALUE를 value로 전달
  const selectValue = current ? String(current.id) : EMPTY_VALUE;
  const disabled = loading || items.length === 0;

  if (loading) {
    return <Skeleton className={`h-9 w-56 ${className ?? ""}`} />;
  }

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => {
        if (v === EMPTY_VALUE) return; // placeholder 선택은 무시
        onChange?.(Number(v));
      }}
      disabled={disabled}
    >
      <SelectTrigger className={`w-56 ${className ?? ""}`} aria-label="프로젝트 선택">
        <SelectValue placeholder={placeholder}>
          {current ? `${current.name} (#${current.id})` : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {/* 컨트롤드 보장용 placeholder 아이템(보이지 않게 hidden 처리) */}
        <SelectItem value={EMPTY_VALUE} disabled className="hidden" aria-hidden="true">
          {placeholder}
        </SelectItem>

        {items.map((p) => (
          <SelectItem key={p.id} value={String(p.id)}>
            {p.name} <span className="text-muted-foreground">#{p.id}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default ProjectSwitcher;