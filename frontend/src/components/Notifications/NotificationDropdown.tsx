import React, { useEffect, useState } from 'react';
import {
  Bell, GitCommit, MessageSquare, Calendar, Users, FileText, AlertCircle, Clock, CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { AppNotification as Notification } from '@/types/domain';
import {
  fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead, countUnread, sortNotifications,
} from '@/api/notifications';
import { appBus } from '@/lib/app-bus';

interface NotificationDropdownProps {
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onNotificationClick?: () => void;
}

export function NotificationDropdown({
  notifications: external,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
}: NotificationDropdownProps) {
  const [internal, setInternal] = useState<Notification[]>([]);
  const notifications = external ?? internal;

  const reload = async () => {
    const list = await fetchNotifications();
    setInternal(list);
  };

  useEffect(() => {
    if (!external) {
      reload();
      const off = appBus.onNotificationsChanged(() => reload());
      return () => { try { off?.(); } catch {} };
    }
  }, [external]);

  const unreadCount = countUnread(notifications);
  // ✅ 공통 정렬 적용 후 상위 5개
  const recentNotifications = sortNotifications([...notifications]).slice(0, 5);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'commit': return <GitCommit className="h-3 w-3" />;
      case 'feedback': return <MessageSquare className="h-3 w-3" />;
      case 'schedule': return <Calendar className="h-3 w-3" />;
      case 'team': return <Users className="h-3 w-3" />;
      case 'assignment': return <FileText className="h-3 w-3" />;
      case 'team_invitation': return <Users className="h-3 w-3" />;
      case 'invitation_accepted': return <CheckCircle2 className="h-3 w-3" />;
      case 'invitation_declined': return <AlertCircle className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  const handleMarkAsRead = (id: string) => {
    if (external) {
      onMarkAsRead?.(id);
    } else {
      markNotificationAsRead(id);
      setInternal((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }
  };

  const handleMarkAll = () => {
    if (external) onMarkAllAsRead?.();
    else {
      markAllNotificationsAsRead(internal.map((n) => n.id));
      setInternal((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="알림 열기">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive rounded-full text-xs flex items-center justify-center text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0">알림</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAll} className="text-xs h-6 px-2">
              모두 읽음
            </Button>
          )}
        </div>
        <Separator />

        <div className="max-h-96 overflow-y-auto px-2 py-2">
          {recentNotifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>새로운 알림이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-md cursor-pointer transition-colors hover:bg-accent ${!notification.read ? 'bg-muted/50' : ''}`}
                  onClick={() => {
                    if (!notification.read) handleMarkAsRead(notification.id);
                    onNotificationClick?.();
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-sm ${!notification.read ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className={`text-sm leading-tight ${!notification.read ? 'font-medium' : ''}`}>{notification.title}</h5>
                        {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true, locale: ko })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 5 && (
          <>
            <Separator />
            <div className="p-2">
              <Button variant="ghost" size="sm" className="w-full justify-center text-xs" onClick={onNotificationClick}>
                모든 알림 보기 ({notifications.length})
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
