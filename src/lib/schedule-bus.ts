// 전역 이벤트 버스 (일정 변경 알림 전용)
type Listener = () => void;

class ScheduleBus {
  private listeners = new Set<Listener>();
  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emitChanged() {
    for (const fn of this.listeners) fn();
  }
}

export const scheduleBus = new ScheduleBus();