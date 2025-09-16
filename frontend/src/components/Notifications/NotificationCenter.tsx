// === path : src/components/Notifications/NotificationCenter.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
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
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { UserRole } from '@/types/user';
import { Notification, NotificationPageResponse } from '@/types/domain';
import { notificationApi } from '@/api/notifications';


interface NotificationCenterProps {
  userRole: UserRole; // ✅ 앱 전역 UserRole 사용 (ta 포함)
}


export function NotificationCenter({ userRole }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // 알림 데이터 로딩
  const loadNotifications = async (pageNum = 0, reset = false) => {
    try {
      setLoading(true);
      const response = await notificationApi.getNotifications({
        page: pageNum,
        size: 10,
        unreadOnly: filter === 'unread' ? true : filter === 'read' ? false : undefined,
        sort: 'createdAt,desc'
      });

      if (reset) {
        setNotifications(response.content);
      } else {
        setNotifications(prev => [...prev, ...response.content]);
      }

      setHasMore(!response.last);
      setPage(pageNum);
    } catch (error) {
      console.error('알림 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 30초마다 폴링
  useEffect(() => {
    loadNotifications(0, true);

    const interval = setInterval(() => {
      loadNotifications(0, true);
    }, 30000);

    return () => clearInterval(interval);
  }, [filter]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'PROJECT_CREATED': return <GitCommit className="h-4 w-4" />;
      case 'PROJECT_ASSIGNED': return <Users className="h-4 w-4" />;
      case 'COMMENT_ADDED': return <MessageSquare className="h-4 w-4" />;
      case 'SYSTEM': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'PROJECT_CREATED': return '프로젝트 생성';
      case 'PROJECT_ASSIGNED': return '프로젝트 배정';
      case 'COMMENT_ADDED': return '댓글';
      case 'SYSTEM': return '시스템';
      default: return type;
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await notificationApi.markRead(id, true);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('읽음 처리 실패:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('전체 읽음 처리 실패:', error);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.linkUrl) {
      // 브라우저 네이티브 네비게이션 사용
      window.location.href = notification.linkUrl;
    }
  };

  const filtered = notifications.filter(n =>
    filter === 'unread' ? !n.isRead : filter === 'read' ? n.isRead : true
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>알림 센터</h1>
          <p className="text-muted-foreground">프로젝트 관련 알림과 공지사항을 확인하세요</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
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
              {filtered.length === 0 ? (
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
                    className={`transition-all hover:shadow-md cursor-pointer ${!n.isRead ? 'border-l-4 border-l-primary bg-muted/20' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-md ${!n.isRead ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {getNotificationIcon(n.type)}
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className={!n.isRead ? 'font-semibold' : ''}>{n.title}</h4>
                                <Badge variant="default" className="text-xs">
                                  {getTypeLabel(n.type)}
                                </Badge>
                                {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                              </div>
                              <p className="text-sm text-muted-foreground">{n.message}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ko })}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {!n.isRead && (
                                <Button variant="ghost" size="sm" onClick={() => markAsRead(n.id)}>
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotification(n.id)}
                                className="text-muted-foreground hover:text-destructive"
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
