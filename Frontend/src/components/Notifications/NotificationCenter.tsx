import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  GitCommit,
  MessageSquare,
  Calendar,
  Users,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Megaphone
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { UserRole } from '@/types/user';
import type { AppNotification as Notification } from '@/types/domain';
import {
  fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead,
  countUnread, respondToInvitation
} from '@/api/notifications';
import { appBus } from '@/lib/app-bus';
import { toast } from 'sonner';

interface NotificationCenterProps {
  userRole: UserRole; // ✅ 앱 전역 UserRole 사용
}

export function NotificationCenter({ userRole }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const reload = async () => {
    try {
      setLoading(true);
      const list = await fetchNotifications();
      setNotifications(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    const off = appBus.onNotificationsChanged(() => reload());
    return () => { try { off?.(); } catch { } };
  }, []);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'commit': return <GitCommit className="h-4 w-4" />;
      case 'feedback': return <MessageSquare className="h-4 w-4" />;
      case 'schedule': return <Calendar className="h-4 w-4" />;
      case 'team':
      case 'TEAM_INVITATION':
      case 'INVITATION_ACCEPTED':
      case 'INVITATION_REJECTED':
        return <Users className="h-4 w-4" />;
      case 'TEAM_ANNOUNCEMENT':
        return <Megaphone className="h-4 w-4" />;
      case 'assignment': return <FileText className="h-4 w-4" />;
      case 'system': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'commit': return '커밋';
      case 'feedback': return '피드백';
      case 'schedule': return '일정';
      case 'team': return '팀';
      case 'assignment': return '과제';
      case 'system': return '시스템';
      default: return type;
    }
  };

  const onMarkAsRead = (id: string) => {
    markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const onMarkAllAsRead = () => {
    markAllNotificationsAsRead(notifications.map(n => n.id));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const onDeleteLocal = (id: string) => {
    // 서버 일괄 알림 없음 → 로컬에서만 제거
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // 팀원 초대 요청 응답
  const handleInvitationResponse = async (invitationId: number, accept: boolean) => {
    try {
      await respondToInvitation(invitationId, accept);
      toast.success(accept ? "초대를 수락했습니다." : "초대를 거절했습니다.");

      appBus.emitNotificationsChanged();
      //setNotifications(prev => prev.filter(n => Number(n.relatedId) !== invitationId));
    } catch (e) {
      toast.error("응답 처리에 실패했습니다.");
    }
  };

  const filtered = useMemo(
    () => notifications.filter(n => filter === 'unread' ? !n.read : filter === 'read' ? n.read : true),
    [notifications, filter]
  );

  const unreadCount = useMemo(() => countUnread(notifications), [notifications]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>알림 센터</h1>
          <p className="text-muted-foreground">프로젝트 관련 알림과 공지사항을 확인하세요</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={onMarkAllAsRead}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              모두 읽음 처리
            </Button>
          )}
          <Badge variant="secondary">{unreadCount}개의 읽지 않은 알림</Badge>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">전체 ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">읽지 않음 ({unreadCount})</TabsTrigger>
          <TabsTrigger value="read">읽음 ({notifications.length - unreadCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {loading ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>불러오는 중…</p>
                  </CardContent>
                </Card>
              ) : filtered.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>알림이 없습니다.</p>
                  </CardContent>
                </Card>
              ) : (
                filtered.map((n) => (
                  <Card
                    key={n.id}
                    className={`transition-all hover:shadow-md ${!n.read ? 'border-l-4 border-l-primary bg-muted/20' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-md ${!n.read ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {getNotificationIcon(n.type)}
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className={!n.read ? 'font-semibold' : ''}>{n.title}</h4>
                                <Badge variant={getPriorityColor(n.priority)} className="text-xs">
                                  {getTypeLabel(n.type)}
                                </Badge>
                                {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                              </div>
                              <p className="text-sm text-muted-foreground">{n.message}</p>
                              {n.type === 'TEAM_INVITATION' && n.relatedId && !n.read && (
                                <div className="mt-3 flex items-center gap-2">
                                  <Button size="sm" onClick={() => handleInvitationResponse(Number(n.relatedId!), true)}>
                                    수락
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleInvitationResponse(Number(n.relatedId!), false)}>
                                    거절
                                  </Button>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: ko })}</span>
                                {n.author?.name && (<><span>•</span><span>{n.author.name}</span></>)}
                                {n.projectName && (<><span>•</span><span>{n.projectName}</span></>)}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {!n.read && (
                                <Button variant="ghost" size="sm" onClick={() => onMarkAsRead(n.id)} aria-label="읽음 처리">
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteLocal(n.id)}
                                className="text-muted-foreground hover:text-destructive"
                                aria-label="이 알림 숨기기"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}