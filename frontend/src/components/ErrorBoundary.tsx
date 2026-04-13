import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<Props & { onReset: () => void }, State> {
  constructor(props: Props & { onReset: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <h2 className="text-2xl font-semibold text-foreground">页面出错了</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {this.state.error?.message ?? "发生了未知错误"}
          </p>
          <Button variant="outline" onClick={this.handleReset}>
            返回首页
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  // 用 pathname 作为 key，路由切换时强制重新挂载 ErrorBoundaryInner，
  // 防止上一个路由的错误状态泄漏到新路由。
  return (
    <ErrorBoundaryInner key={location.pathname} onReset={() => navigate("/", { replace: true })}>
      {children}
    </ErrorBoundaryInner>
  );
}

/** Standalone error page for React Router's errorElement */
export function RouteErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-2xl font-semibold">页面出错了</h2>
      <p className="text-sm text-muted-foreground">当前页面发生了意外错误，请尝试刷新或返回首页。</p>
      <a href="/" className="text-sm text-primary underline underline-offset-4 hover:text-primary/80">
        返回首页
      </a>
    </div>
  );
}
