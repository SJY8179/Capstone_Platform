import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, FileText, Download, Plus, MessageSquare, Eye } from 'lucide-react';
import { UserRole } from '@/App';
import { listProjectFeedback } from '@/api/feedback';
import type { FeedbackDto } from '@/types/domain';

const TEXTS = {
  loading: '로딩중...',
  student: {
    title: '평가 현황',
    description: '프로젝트에 대한 피드백을 확인하세요',
    feedbackFrom: '피드백 from',
    anonymous: '익명',
    createdAt: '작성일',
    noFeedback: '아직 받은 피드백이 없습니다.',
    viewDetails: '상세보기',
  },
  professor: {
    title: '피드백 관리',
    description: '학생 프로젝트에 피드백을 제공하세요',
    adminDescription: '시스템의 피드백을 관리하세요',
    export: '피드백 내보내기',
    feedbackList: '피드백 목록',
    newFeedback: '새 피드백 작성',
    feedbackFrom: '님의 피드백',
    noFeedback: '작성된 피드백이 없습니다.',
    newFeedbackTitle: '새 피드백 작성',
    newFeedbackDescription: '프로젝트에 대한 새로운 피드백을 작성합니다. (저장 API 필요)',
    contentTitle: '피드백 내용',
    contentPlaceholder: '학생들에게 전달할 피드백을 작성하세요...',
    ratingTitle: '평점 (1-5)',
    submitButton: '피드백 제출 (API 필요)',
  }
};

interface EvaluationSystemProps {
  userRole: UserRole;
  projectId: number;
}

export function EvaluationSystem({ userRole, projectId }: EvaluationSystemProps) {
  const [feedbackList, setFeedbackList] = useState<FeedbackDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFeedbackText, setNewFeedbackText] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await listProjectFeedback(projectId);
        setFeedbackList(data);
      } catch (error) {
        console.error("Failed to fetch project feedback:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  if (loading) {
    return <div>{TEXTS.loading}</div>;
  }

  if (userRole === 'student') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{TEXTS.student.title}</h1>
          <p className="text-muted-foreground">{TEXTS.student.description}</p>
        </div>
        <div className="grid gap-6">
          {feedbackList.length > 0 ? (
            feedbackList.map((feedback) => (
              <Card key={feedback.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-3">
                        {TEXTS.student.feedbackFrom} {feedback.author ?? TEXTS.student.anonymous}
                      </CardTitle>
                      <CardDescription>
                        {TEXTS.student.createdAt}: {feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString() : 'N/A'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-xl font-bold">{feedback.rating ?? 'N/A'}</p>
                      <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">{feedback.content}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                {TEXTS.student.noFeedback}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{TEXTS.professor.title}</h1>
          <p className="text-muted-foreground">
            {userRole === 'professor' ? TEXTS.professor.description : TEXTS.professor.adminDescription}
          </p>
        </div>
        <Button variant="outline"><Download className="h-4 w-4 mr-2" />{TEXTS.professor.export}</Button>
      </div>
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">{TEXTS.professor.feedbackList}</TabsTrigger>
          <TabsTrigger value="new">{TEXTS.professor.newFeedback}</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-6">
          <div className="grid gap-6">
            {feedbackList.length > 0 ? (
              feedbackList.map((feedback) => (
                <Card key={feedback.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {feedback.author ?? TEXTS.student.anonymous}{TEXTS.professor.feedbackFrom}
                        </CardTitle>
                        <CardDescription>
                          {TEXTS.student.createdAt}: {feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString() : 'N/A'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <p className="text-xl font-bold">{feedback.rating ?? 'N/A'}</p>
                        <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm p-4 border rounded-lg">{feedback.content}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  {TEXTS.professor.noFeedback}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        <TabsContent value="new" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{TEXTS.professor.newFeedbackTitle}</CardTitle>
              <CardDescription>{TEXTS.professor.newFeedbackDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">{TEXTS.professor.contentTitle}</h3>
                <Textarea
                  placeholder={TEXTS.professor.contentPlaceholder}
                  value={newFeedbackText}
                  onChange={(e) => setNewFeedbackText(e.target.value)}
                  rows={6}
                />
              </div>
              <div>
                <h3 className="font-medium mb-2">{TEXTS.professor.ratingTitle}</h3>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(v => <Star key={v} className="h-6 w-6 text-gray-300 cursor-pointer" />)}
                </div>
              </div>
              <Button disabled><MessageSquare className="h-4 w-4 mr-2" />{TEXTS.professor.submitButton}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}