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
}

export const appBus = new AppBus();

// 외부(window) 이벤트와 연결(리프레시 토큰 만료 등 외부 트리거 수신 전용)
window.addEventListener("app:auth-changed", () => appBus.emitAuthChanged());
