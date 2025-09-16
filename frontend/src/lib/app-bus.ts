type Listener = (...args: any[]) => void;

class AppBus {
  private map = new Map<string, Set<Listener>>();

  on(topic: string, fn: Listener) {
    if (!this.map.has(topic)) this.map.set(topic, new Set());
    this.map.get(topic)!.add(fn);
    return () => this.off(topic, fn);
  }

  off(topic: string, fn: Listener) {
    this.map.get(topic)?.delete(fn);
  }

  emit(topic: string, ...args: any[]) {
    this.map.get(topic)?.forEach((fn) => fn(...args));
  }

  // 일관된 이벤트 키: "auth-changed"
  onAuthChanged(fn: Listener) {
    return this.on("auth-changed", fn);
  }
  offAuthChanged(fn: Listener) {
    this.off("auth-changed", fn);
  }
  emitAuthChanged() {
    this.emit("auth-changed");
  }

  // 🔔 알림 변경 브로드캐스트
  onNotificationsChanged(fn: Listener) {
    return this.on("notifications-changed", fn);
  }
  offNotificationsChanged(fn: Listener) {
    this.off("notifications-changed", fn);
  }
  emitNotificationsChanged() {
    this.emit("notifications-changed");
  }
}

export const appBus = new AppBus();

// 외부(window) 이벤트와 연결(리프레시 토큰 만료 등 외부 트리거 수신 전용)
window.addEventListener("app:auth-changed", () => appBus.emitAuthChanged());
// 선택: 외부에서 강제 새로고침하고 싶을 때
window.addEventListener("app:notifications-changed", () => appBus.emitNotificationsChanged());