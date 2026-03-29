interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink/30" onClick={onCancel} />
      <div className="relative bg-bg border border-border p-6 w-full max-w-sm">
        <p className="text-sm font-light text-ink mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn text-xs">取消</button>
          <button onClick={onConfirm} className="btn-primary text-xs">確認</button>
        </div>
      </div>
    </div>
  );
}
