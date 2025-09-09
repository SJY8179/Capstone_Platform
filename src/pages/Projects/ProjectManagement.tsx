<<<<<<< HEAD
﻿import React, { useEffect, useMemo, useState } from "react";
=======
﻿import React, { useState, useEffect } from "react";
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Plus,
  FileText,
<<<<<<< HEAD
  CalendarDays,
  Users,
  GitBranch,
=======
  Calendar,
  Users,
  GitBranch,
  Download,
  Upload,
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
  Eye,
  Edit,
  MessageSquare,
} from "lucide-react";
import { UserRole } from "@/App";
import { listProjects } from "@/api/projects";
<<<<<<< HEAD
import type { ProjectListDto, ProjectStatus } from "@/types/domain";

/** 상태 → 라벨 매핑 (예시 화면 텍스트) */
const STATUS_LABEL: Record<ProjectStatus, string> = {
  "in-progress": "진행중",
  review: "검토중",
  completed: "완료",
  planning: "기획",
};

function formatK(date?: string | null) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
=======
import { listTeams } from "@/api/teams";
import type { ProjectListDto, TeamListDto } from "@/types/domain";
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938

interface ProjectManagementProps {
  userRole: UserRole;
}

export function ProjectManagement({ userRole }: ProjectManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
<<<<<<< HEAD
  const [tab, setTab] = useState<ProjectStatus | "all">("all");
  const [projects, setProjects] = useState<ProjectListDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listProjects();
        setProjects(data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** 검색/탭 필터 + 최근 업데이트 순 정렬 */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const byTab = (p: ProjectListDto) => (tab === "all" ? true : p.status === tab);
    const bySearch = (p: ProjectListDto) =>
      p.name.toLowerCase().includes(q) ||
      p.team.toLowerCase().includes(q) ||
      p.members.some((m) => m.name.toLowerCase().includes(q));

    const sorted = [...projects].sort((a, b) => {
      const ta = a.lastUpdate ?? "";
      const tb = b.lastUpdate ?? "";
      return tb.localeCompare(ta); // 최신 업데이트 우선
    });

    return sorted.filter(byTab).filter(bySearch);
  }, [projects, searchQuery, tab]);

  const renderActions = (p: ProjectListDto) => {
=======
  const [selectedTab, setSelectedTab] = useState("all");
  const [projects, setProjects] = useState<ProjectListDto[]>([]);
  const [teams, setTeams] = useState<TeamListDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projectData, teamData] = await Promise.all([
          listProjects(),
          listTeams(),
        ]);
        setProjects(projectData);
        setTeams(teamData);
      } catch (error) {
        console.error("Failed to fetch project data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getTeamName = (teamId?: number) => {
    return teams.find((t) => t.id === teamId)?.name ?? "팀 정보 없음";
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="secondary">진행중</Badge>;
      case "COMPLETED":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            완료
          </Badge>
        );
      case "INACTIVE":
        return <Badge variant="outline">비활성</Badge>;
      default:
        return <Badge variant="outline">{status ?? "상태 없음"}</Badge>;
    }
  };

  const filteredProjects = projects.filter((project) => {
    const teamName = getTeamName(project.teamId).toLowerCase();
    const projectName = project.name?.toLowerCase() ?? "";
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      projectName.includes(query) || teamName.includes(query);

    if (selectedTab === "all") return matchesSearch;
    // NOTE: API의 상태 값과 UI 탭의 매핑이 다를 수 있습니다.
    if (selectedTab === "in-progress")
      return matchesSearch && project.status === "ACTIVE";
    if (selectedTab === "completed")
      return matchesSearch && project.status === "COMPLETED";
    if (selectedTab === "review") return matchesSearch; // 별도 상태 필요 시 조정
    return matchesSearch;
  });

  const renderProjectActions = (project: ProjectListDto) => {
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
    if (userRole === "student") {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
<<<<<<< HEAD
            <FileText className="h-4 w-4 mr-1" />
            보고서 작성
          </Button>
          <Button size="sm" variant="outline">
            <GitBranch className="h-4 w-4 mr-1" />
=======
            <FileText className="h-4 w-4 mr-2" />
            보고서 작성
          </Button>
          <Button size="sm" variant="outline">
            <GitBranch className="h-4 w-4 mr-2" />
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
            GitHub
          </Button>
        </div>
      );
<<<<<<< HEAD
    }
    if (userRole === "professor") {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4 mr-1" />
            열람
          </Button>
          <Button size="sm" variant="outline">
            <MessageSquare className="h-4 w-4 mr-1" />
=======
    } else if (userRole === "professor") {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            열람
          </Button>
          <Button size="sm" variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
            피드백
          </Button>
        </div>
      );
<<<<<<< HEAD
    }
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="outline">
          <Edit className="h-4 w-4 mr-1" />
          편집
        </Button>
      </div>
    );
  };

  if (loading) return <div>Loading...</div>;
=======
    } else {
      // admin
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            편집
          </Button>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
        </div>
      );
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">프로젝트 관리</h1>
<<<<<<< HEAD
          <p className="text-muted-foreground">참여 중인 프로젝트를 관리하세요.</p>
=======
          <p className="text-muted-foreground">
            {userRole === "student"
              ? "참여 중인 프로젝트를 관리하세요"
              : userRole === "professor"
              ? "담당 프로젝트들을 관리하고 검토하세요"
              : "전체 프로젝트 현황을 확인하고 관리하세요"}
          </p>
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
        </div>
        {userRole === "student" && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            새 프로젝트
          </Button>
        )}
      </div>

<<<<<<< HEAD
      {/* 검색 */}
      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="프로젝트명 또는 팀명으로 검색…"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="프로젝트 검색"
          />
        </div>
      </div>

      {/* 탭 */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="in-progress">진행중</TabsTrigger>
          <TabsTrigger value="review">검토중</TabsTrigger>
          <TabsTrigger value="completed">완료</TabsTrigger>
          {/* 필요하면 <TabsTrigger value="planning">기획</TabsTrigger> 추가 */}
        </TabsList>

        <TabsContent value={tab} className="mt-6">
          <div className="space-y-4">
            {filtered.map((p) => {
              const progress = Math.max(0, Math.min(100, p.progress ?? 0));
              return (
                <Card key={p.id}>
                  {/* 상단: 제목 / 상태 / 설명 / 소속팀·업데이트 / 우측 액션 */}
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {p.name}
                        <Badge className="rounded-full px-2 py-0.5 text-xs" variant="outline">
                          {STATUS_LABEL[p.status]}
                        </Badge>
                      </CardTitle>

                      {/* (예시처럼) 한 줄 설명이 있으면 바로 아래에 노출 */}
                      {p.description && (
                        <CardDescription className="text-sm">
                          {p.description}
                        </CardDescription>
                      )}

                      {/* 소속 팀 · 최근 업데이트 (아이콘과 함께) */}
                      <CardDescription className="text-sm">
                        <span className="inline-flex items-center gap-1 mr-3">
                          <Users className="h-4 w-4" />
                          {p.team}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" />
                          최근 업데이트: {formatK(p.lastUpdate)}
                        </span>
                      </CardDescription>
                    </div>

                    {renderActions(p)}
                  </CardHeader>

                  {/* 진행률 구간 (좌측 라벨/우측 % · 긴 바) */}
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">프로젝트 진행률</span>
                      <span className="text-sm text-muted-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />

                    {/* 하단 정보 라인: 마일스톤 pill · 다음 마감 · 팀원 */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <Badge
                        variant="secondary"
                        className="rounded-full px-2 py-0.5 text-xs"
                      >
                        마일스톤 {p.milestones.completed}/{p.milestones.total}
                      </Badge>

                      {p.nextDeadline ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <CalendarDays className="h-4 w-4" />
                          다음 마감: {p.nextDeadline.task} · {formatK(p.nextDeadline.date)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">다음 마감 없음</span>
                      )}

                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        팀원: {p.members.map((m) => m.name).join(", ") || "-"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {!loading && filtered.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                표시할 프로젝트가 없습니다.
              </div>
            )}
          </div>
=======
      {/* 검색 & 가져오기 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="프로젝트명 또는 팀명으로 검색…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          가져오기
        </Button>
      </div>

      {/* 탭 & 프로젝트 목록 */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="in-progress">진행중</TabsTrigger>
          <TabsTrigger value="review">검토 중 (API 필요)</TabsTrigger>
          <TabsTrigger value="completed">완료</TabsTrigger>
        </TabsList>

        {/* 하나의 콘텐츠에서 탭 상태에 따라 필터만 변경 */}
        <TabsContent value={selectedTab} className="mt-6">
          <div className="grid gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">
                          {project.name ?? "이름 없음"}
                        </CardTitle>
                        {getStatusBadge(project.status)}
                      </div>
                      <CardDescription className="text-base">
                        상세 메타 정보(API 필요)
                      </CardDescription>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{getTeamName(project.teamId)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            최종 업데이트:{" "}
                            {project.updatedAt
                              ? new Date(
                                  project.updatedAt
                                ).toLocaleDateString("ko-KR")
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {renderProjectActions(project)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          프로젝트 진행률 (API 필요)
                        </span>
                        <span className="text-sm text-muted-foreground">
                          --%
                        </span>
                      </div>
                      <Progress value={0} className="h-2" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      추가 정보(팀원/완료 현황 등)를 보려면 별도 API가 필요합니다.
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                검색 조건에 맞는 프로젝트가 없습니다.
              </p>
            </div>
          )}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
        </TabsContent>
      </Tabs>
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
