import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  GitCommit, MessageSquare, Calendar, Users, FileText, AlertCircle,
  CheckCircle2, Clock, Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { UserRole } from '@/types/user';
import type { AppNotification as Notification } from '@/types/domain';
import { fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead, countUnread, sortNotifications } from '@/api/notifications';
import { acceptInvitation, declineInvitation } from '@/api/invitations';
import { appBus } from '@/lib/app-bus';
import { toast } from 'sonner';

interface NotificationCenterProps {
  userRole: UserRole;
}

/** 문자열 등 다양한 포맷을 안전 파싱해서 ms로 변환 (UI용) */
function toMs(ts: string) {
  if (!ts) return 0;
  const norm = ts.includes(' ') && !ts.includes('T') ? ts.replace(' ', 'T') : ts;
  let ms = Date.parse(norm);
  if (Number.isFinite(ms)) return ms;
  if (/^\d{4}-\d{2}-\d{2}$/.test(norm)) {
    ms = Date.parse(`${norm}T00:00:00`);
    if (Number.isFinite(ms)) return ms;
  }
  return 0;
}

export function NotificationCenter({ userRole }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const reload = async () => {
    try {
      setLoading(true);
      const list = await fetchNotifications();
      setNotifications(list); // 이미 sortNotifications 적용됨
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    const off = appBus.onNotificationsChanged(() => reload());
    return () => { try { off?.(); } catch {} };
  }, []);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'commit': return <GitCommit className="h-4 w-4" />;
      case 'feedback': return <MessageSquare className="h-4 w-4" />;
      case 'schedule': return <Calendar className="h-4 w-4" />;
      case 'team': return <Users className="h-4 w-4" />;
      case 'assignment': return <FileText className="h-4 w-4" />;
      case 'team_invitation': return <Users className="h-4 w-4" />;
      case 'invitation_accepted': return <CheckCircle2 className="h-4 w-4" />;
      case 'invitation_declined': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };
  const getPriorityColor = (p: Notification['priority']) => (p === 'high' ? 'destructive' : p === 'low' ? 'secondary' : 'default');
  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'commit': return '커밋';
      case 'feedback': return '피드백';
      case 'schedule': return '일정';
      case 'team': return '팀';
      case 'assignment': return '과제';
      case 'team_invitation': return '팀원 초대 요청';
      case 'invitation_accepted': return '초대 수락';
      case 'invitation_declined': return '초대 거절';
      case 'system': default: return '시스템';
    }
  };

  const onMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => sortNotifications(prev.map(n => n.id === id ? { ...n, read: true } : n)));
  };
  const onMarkAllAsRead = async () => {
    await markAllNotificationsAsRead(notifications.map(n => n.id));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };
  const onDeleteLocal = (id: string) =>
    setNotifications(prev => prev.filter(n => n.id !== id));

  const filtered = useMemo(
    () => notifications.filter(n => filter === 'unread' ? !n.read : filter === 'read' ? n.read : true),
    [notifications, filter]
  );
  const unreadCount = useMemo(() => countUnread(notifications), [notifications]);

  async function handleInvitationAction(n: Notification, action: 'accept' | 'decline') {
    const invId = n.payload?.invitationId ?? n.relatedId;
    if (!invId) return toast.error("초대 정보가 없습니다.");
    try {
      if (action === 'accept') await acceptInvitation(Number(invId));
      else await declineInvitation(Number(invId));

      const nowIso = new Date().toISOString();
      setNotifications(prev =>
        sortNotifications(prev.map(item => {
          if (item.id !== n.id) return item;
          const accepted = action === 'accept';
          return {
            ...item,
            type: accepted ? 'invitation_accepted' : 'invitation_declined',
            title: accepted ? '팀원 초대 수락' : '팀원 초대 거절',
            message: accepted ? '초대를 수락했습니다.' : '초대를 거절했습니다.',
            read: true,
            timestamp: nowIso,
          };
        }))
      );

      await onMarkAsRead(n.id);
      toast.success(action === 'accept' ? "초대를 수락했습니다." : "초대를 거절했습니다.");
      appBus.emitNotificationsChanged();
    } catch (e: any) {
      toast.error(e?.message || "처리에 실패했습니다.");
    }
  }

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
                <Card><CardContent className="p-8 text-center text-muted-foreground"><AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>불러오는 중…</p></CardContent></Card>
              ) : filtered.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground"><AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>알림이 없습니다.</p></CardContent></Card>
              ) : (
                filtered.map((n) => (
                  <Card key={n.id} className={`transition-all hover:shadow-md ${!n.read ? 'border-l-4 border-l-primary bg-muted/20' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`${!n.read ? 'bg-primary text-primary-foreground' : 'bg-muted'} p-2 rounded-md`}>
                          {getNotificationIcon(n.type)}
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className={!n.read ? 'font-semibold' : ''}>{n.title}</h4>
                                <Badge variant={getPriorityColor(n.priority)} className="text-xs">{getTypeLabel(n.type)}</Badge>
                                {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                              </div>
                              <p className="text-sm text-muted-foreground">{n.message}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: ko })}</span>
                                {n.projectName && (<><span>•</span><span>{n.projectName}</span></>)}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {!n.read && (
                                <Button variant="ghost" size="sm" onClick={() => onMarkAsRead(n.id)} aria-label="읽음 처리">
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => onDeleteLocal(n.id)} className="text-muted-foreground hover:text-destructive" aria-label="이 알림 숨기기">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* 초대 전용 액션 */}
                          {n.type === 'team_invitation' && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleInvitationAction(n, 'accept')}>수락</Button>
                              <Button size="sm" variant="outline" onClick={() => handleInvitationAction(n, 'decline')}>거절</Button>
                            </div>
                          )}
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
