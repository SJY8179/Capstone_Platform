import React, { useState } from 'react';
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

export interface Notification {
    id: string;
    type: 'commit' | 'feedback' | 'schedule' | 'team' | 'assignment' | 'system';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    priority: 'low' | 'medium' | 'high';
    relatedId?: string;
    author?: {
        name: string;
        avatar?: string;
    };
}

interface NotificationCenterProps {
    userRole: 'student' | 'professor' | 'admin';
}

// 데모 알림 데이터
const demoNotifications: Notification[] = [
    {
        id: '1',
        type: 'commit',
        title: '새로운 커밋이 푸시되었습니다',
        message: '김철수님이 "프론트엔드 로그인 기능 구현"을 커밋했습니다.',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30분 전
        read: false,
        priority: 'medium',
        author: { name: '김철수' }
    },
    {
        id: '2',
        type: 'feedback',
        title: '새로운 피드백이 도착했습니다',
        message: '박교수님이 중간 발표 자료에 피드백을 남겼습니다: "전체적으로 좋으나 기술적 세부사항이 부족합니다."',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2시간 전
        read: false,
        priority: 'high',
        author: { name: '박교수' }
    },
    {
        id: '3',
        type: 'schedule',
        title: '오늘 일정 알림',
        message: '오후 2시: 팀 미팅, 오후 4시: 멘토링 세션이 예정되어 있습니다.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3시간 전
        read: true,
        priority: 'medium'
    },
    {
        id: '4',
        type: 'team',
        title: '팀원 초대 요청',
        message: '이영희님이 "AI 웹앱 개발팀"에 합류 요청을 보냈습니다.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5시간 전
        read: true,
        priority: 'medium',
        author: { name: '이영희' }
    },
    {
        id: '5',
        type: 'assignment',
        title: '과제 제출 마감 임박',
        message: '중간보고서 제출 마감이 2일 남았습니다.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8시간 전
        read: true,
        priority: 'high'
    },
    {
        id: '6',
        type: 'system',
        title: '시스템 업데이트',
        message: '새로운 기능이 추가되었습니다: 실시간 협업 도구',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1일 전
        read: true,
        priority: 'low'
    }
];

export function NotificationCenter({ userRole }: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<Notification[]>(demoNotifications);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'commit': return <GitCommit className="h-4 w-4" />;
            case 'feedback': return <MessageSquare className="h-4 w-4" />;
            case 'schedule': return <Calendar className="h-4 w-4" />;
            case 'team': return <Users className="h-4 w-4" />;
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

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(notif =>
                notif.id === id ? { ...notif, read: true } : notif
            )
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev =>
            prev.map(notif => ({ ...notif, read: true }))
        );
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
    };

    const filteredNotifications = notifications.filter(notif => {
        if (filter === 'unread') return !notif.read;
        if (filter === 'read') return notif.read;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1>알림 센터</h1>
                    <p className="text-muted-foreground">
                        프로젝트 관련 알림과 공지사항을 확인하세요
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <Button variant="outline" size="sm" onClick={markAllAsRead}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            모두 읽음 처리
                        </Button>
                    )}
                    <Badge variant="secondary">
                        {unreadCount}개의 읽지 않은 알림
                    </Badge>
                </div>
            </div>

            <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
                <TabsList>
                    <TabsTrigger value="all">전체 ({notifications.length})</TabsTrigger>
                    <TabsTrigger value="unread">읽지 않음 ({unreadCount})</TabsTrigger>
                    <TabsTrigger value="read">읽음 ({notifications.length - unreadCount})</TabsTrigger>
                </TabsList>

                <TabsContent value={filter} className="mt-6">
                    <ScrollArea className="h-[600px]">
                        <div className="space-y-4">
                            {filteredNotifications.length === 0 ? (
                                <Card>
                                    <CardContent className="p-8 text-center text-muted-foreground">
                                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>알림이 없습니다.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                filteredNotifications.map((notification) => (
                                    <Card
                                        key={notification.id}
                                        className={`transition-all hover:shadow-md ${!notification.read ? 'border-l-4 border-l-primary bg-muted/20' : ''
                                            }`}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2 rounded-md ${!notification.read ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                                    }`}>
                                                    {getNotificationIcon(notification.type)}
                                                </div>

                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className={!notification.read ? 'font-semibold' : ''}>{notification.title}</h4>
                                                                <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
                                                                    {getTypeLabel(notification.type)}
                                                                </Badge>
                                                                {!notification.read && (
                                                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                {notification.message}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Clock className="h-3 w-3" />
                                                                <span>
                                                                    {formatDistanceToNow(notification.timestamp, {
                                                                        addSuffix: true,
                                                                        locale: ko
                                                                    })}
                                                                </span>
                                                                {notification.author && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>{notification.author.name}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            {!notification.read && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => markAsRead(notification.id)}
                                                                >
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => deleteNotification(notification.id)}
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