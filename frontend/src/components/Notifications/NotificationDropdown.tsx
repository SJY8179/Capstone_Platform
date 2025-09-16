import React, { useState, useEffect } from 'react';
import { Bell, GitCommit, MessageSquare, Calendar, Users, FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel } from '../ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Notification } from '@/types/domain';
import { notificationApi } from '@/api/notifications';

interface NotificationDropdownProps {
  onNotificationClick?: () => void;
}

export function NotificationDropdown({
  onNotificationClick
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // 알림 데이터 로딩
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [notificationsResponse, countResponse] = await Promise.all([
        notificationApi.getNotifications({ page: 0, size: 5, sort: 'createdAt,desc' }),
        notificationApi.getUnreadCount()
      ]);

      setNotifications(notificationsResponse.content);
      setUnreadCount(countResponse.unreadCount);
    } catch (error) {
      console.error('알림 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 30초마다 폴링
  useEffect(() => {
    loadNotifications();

    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const recentNotifications = notifications.slice(0, 5); // 최근 5개만 표시

  const markAsRead = async (id: number) => {
    try {
      await notificationApi.markRead(id, true);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('읽음 처리 실패:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('전체 읽음 처리 실패:', error);
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

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'PROJECT_CREATED': return <GitCommit className="h-3 w-3" />;
      case 'PROJECT_ASSIGNED': return <Users className="h-3 w-3" />;
      case 'COMMENT_ADDED': return <MessageSquare className="h-3 w-3" />;
      case 'SYSTEM': return <AlertCircle className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive rounded-full text-xs flex items-center justify-center text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4">
          <DropdownMenuLabel className="p-0">알림</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-6 px-2">
              모두 읽음
            </Button>
          )}
        </div>
        <Separator />
        
        {recentNotifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>새로운 알림이 없습니다</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-1 p-2">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-md cursor-pointer transition-colors hover:bg-accent ${
                    !notification.isRead ? 'bg-muted/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-sm ${
                      !notification.isRead ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className={`text-sm leading-tight ${
                          !notification.isRead ? 'font-medium' : ''
                        }`}>
                          {notification.title}
                        </h5>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: ko
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {notifications.length > 5 && (
          <>
            <Separator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-center text-xs"
                onClick={onNotificationClick}
              >
                모든 알림 보기 ({notifications.length})
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}  