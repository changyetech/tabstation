// 轻量 toast：V1 仅有的两个反馈件之一（另一个是关闭窗口 confirm，spec §4.3）
export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}
