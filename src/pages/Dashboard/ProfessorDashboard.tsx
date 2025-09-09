import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarWidget } from '@/components/Dashboard/CalendarWidget';
import { 
  Users, 
  FileText, 
  Star, 
  MessageSquare,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { listProjects } from '@/api/projects';
import { listTeams } from '@/api/teams';
import type { ProjectListDto, TeamListDto } from '@/types/domain';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

// Text constants for localization/encoding issue prevention
const TEXTS = {
  loading: '로딩중...',
  headerTitle: '교수 대시보드',
  headerDescription: '담당 강좌 및 프로젝트 현황을 확인하세요.',
  teams: '진행 팀',
  pendingReviews: '검토 대기',
  students: '수강 학생',
  avgProgress: '평균 진도',
  pendingItemsTitle: '검토 대기 항목',
  pendingItemsDescription: '평가가 필요한 제출물들 (API 필요)',
  pendingItemsAction: '일괄 검토',
  pendingItemsPlaceholder: '검토 대기 목록을 표시하려면 백엔드 API가 필요합니다.',
  recentSubmissionsTitle: '최근 제출물',
  recentSubmissionsDescription: '최근 3일간의 제출 현황 (API 필요)',
  recentSubmissionsPlaceholder: '최근 제출물 목록을 표시하려면 백엔드 API가 필요합니다.',
  topTeamsTitle: '상위 성과 팀',
  topTeamsDescription: '현재 높은 성과를 보이는 팀들 (API 필요)',
  topTeamsAction: '피드백 전송',
  topTeamsPlaceholder: '상위 성과 팀 목록을 표시하려면 백엔드 API가 필요합니다.',
  priorityHigh: '긴급',
  priorityMedium: '보통',
  priorityLow: '낮음',
  statusPending: '검토 대기',
  statusReviewed: '검토 완료',
  statusGraded: '채점 완료',
  reviewButton: '검토',
  viewButton: '보기',
  newSchedule: '새 일정'
};

interface ProfessorDashboardProps {
  professorId?: number; 
  projectId?: number;
}

export function ProfessorDashboard({ professorId, projectId }: ProfessorDashboardProps) {
  const [projects, setProjects] = useState<ProjectListDto[]>([]);
  const [teams, setTeams] = useState<TeamListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [needProjectOpen, setNeedProjectOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projectData, teamData] = await Promise.all([
          listProjects(),
          listTeams(), // ← /teams/my 사용
        ]);
        setProjects(projectData);
        setTeams(teamData);
      } catch (error) {
        console.error("Failed to fetch professor dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [professorId]);

  const courseStats = {
    totalTeams: teams.length,
    totalStudents: 'N/A',
    pendingReviews: 'N/A',
    avgProgress: 'N/A'
  };

  if (loading) return <div>{TEXTS.loading}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{TEXTS.headerTitle}</h2>
          <p className="text-muted-foreground">{TEXTS.headerDescription}</p>
        </div>
        {/* 새 일정 버튼: 담당 프로젝트가 없는 경우에도 항상 노출, 미소속이면 안내 다이얼로그 */}
        <Button size="sm" onClick={() => (projectId ? /* 실제 에디터는 교수 권한 기획 후 연결 */ null : setNeedProjectOpen(true))}>
          <Plus className="h-4 w-4 mr-2" />
          {TEXTS.newSchedule}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg"><Users className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-semibold">{courseStats.totalTeams}</p>
                <p className="text-sm text-muted-foreground">{TEXTS.teams}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-2/10 rounded-lg"><FileText className="h-5 w-5 text-chart-2" /></div>
              <div>
                <p className="text-2xl font-semibold">{courseStats.pendingReviews}</p>
                <p className="text-sm text-muted-foreground">{TEXTS.pendingReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-3/10 rounded-lg"><Star className="h-5 w-5 text-chart-3" /></div>
              <div>
                <p className="text-2xl font-semibold">{courseStats.totalStudents}</p>
                <p className="text-sm text-muted-foreground">{TEXTS.students}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-chart-4/10 rounded-lg"><TrendingUp className="h-5 w-5 text-chart-4" /></div>
              <div>
                <p className="text-2xl font-semibold">{courseStats.avgProgress}%</p>
                <p className="text-sm text-muted-foreground">{TEXTS.avgProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{TEXTS.pendingItemsTitle}</CardTitle>
                <CardDescription>{TEXTS.pendingItemsDescription}</CardDescription>
              </div>
              <Button variant="outline" size="sm"><ClipboardCheck className="h-4 w-4 mr-2" />{TEXTS.pendingItemsAction}</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>{TEXTS.pendingItemsPlaceholder}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{TEXTS.recentSubmissionsTitle}</CardTitle>
            <CardDescription>{TEXTS.recentSubmissionsDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p>{TEXTS.recentSubmissionsPlaceholder}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <CalendarWidget projectId={projectId} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{TEXTS.topTeamsTitle}</CardTitle>
              <CardDescription>{TEXTS.topTeamsDescription}</CardDescription>
            </div>
            <Button variant="outline" size="sm"><MessageSquare className="h-4 w-4 mr-2" />{TEXTS.topTeamsAction}</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-8 w-8 mx-auto mb-2" />
            <p>{TEXTS.topTeamsPlaceholder}</p>
          </div>
        </CardContent>
      </Card>

      {/* 안내 다이얼로그: 담당/참여 프로젝트가 없을 때 */}
      {!projectId && (
        <Dialog open={needProjectOpen} onOpenChange={setNeedProjectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>프로젝트 연결 필요</DialogTitle>
              <DialogDescription>
                새 일정을 추가하려면 먼저 담당하거나 참여 중인 프로젝트가 필요합니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNeedProjectOpen(false)}>확인</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
