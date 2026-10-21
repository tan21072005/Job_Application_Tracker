import { Component, type ReactNode } from 'react';
import { Button, Empty } from './ui';

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="runtime-fallback"><Empty title="Giao diện gặp sự cố" action={<Button onClick={() => location.reload()}>Tải lại trang</Button>}>Thử tải lại trang để tiếp tục. Dữ liệu đã lưu vẫn được giữ lại.</Empty></div>;
    return this.props.children;
  }
}
