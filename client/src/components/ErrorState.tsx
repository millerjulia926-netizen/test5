import { Link } from "react-router-dom";

export type ErrorStateProps = {
  message: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
};

export function ErrorState({ message, actionLabel, actionTo, onAction }: ErrorStateProps) {
  return (
    <section className="page-state page-state--error" data-testid="error-state">
      <p className="page-error">{message}</p>
      {actionLabel && actionTo ? (
        <Link to={actionTo} className="page-state__action">
          {actionLabel}
        </Link>
      ) : null}
      {actionLabel && onAction ? (
        <button type="button" className="page-state__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
