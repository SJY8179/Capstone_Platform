import { Notification, NotificationPageResponse } from '@/types/domain';

const API_BASE = '/api';

export const notificationApi = {
  // 알림 목록 조회
  getNotifications: async (params: {
    page?: number;
    size?: number;
    unreadOnly?: boolean;
    sort?: string;
  } = {}): Promise<NotificationPageResponse> => {
    const searchParams = new URLSearchParams();

    if (params.page !== undefined) searchParams.set('page', params.page.toString());
    if (params.size !== undefined) searchParams.set('size', params.size.toString());
    if (params.unreadOnly !== undefined) searchParams.set('unreadOnly', params.unreadOnly.toString());
    if (params.sort) searchParams.set('sort', params.sort);

    const response = await fetch(`${API_BASE}/notifications?${searchParams}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('알림 목록을 가져오는데 실패했습니다.');
    }

    return response.json();
  },

  // 읽지 않은 알림 개수 조회
  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    const response = await fetch(`${API_BASE}/notifications/count`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('읽지 않은 알림 개수를 가져오는데 실패했습니다.');
    }

    return response.json();
  },

  // 알림 읽음 상태 변경
  markRead: async (id: number, isRead: boolean): Promise<void> => {
    const response = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ isRead }),
    });

    if (!response.ok) {
      throw new Error('알림 상태 변경에 실패했습니다.');
    }
  },

  // 모든 알림을 읽음으로 표시
  markAllRead: async (): Promise<{ updatedCount: number }> => {
    const response = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: 'PATCH',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('전체 읽음 처리에 실패했습니다.');
    }

    return response.json();
  },

  // 알림 삭제
  deleteNotification: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE}/notifications/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('알림 삭제에 실패했습니다.');
    }
  },
};