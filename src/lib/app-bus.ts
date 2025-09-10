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
  emitAuthChanged() {
    this.emit("changed:auth");
  }
}

export const appBus = new AppBus();

// window 이벤트와 연결(리프레시 토큰 만료 등)
window.addEventListener("app:auth-changed", () => appBus.emitAuthChanged());