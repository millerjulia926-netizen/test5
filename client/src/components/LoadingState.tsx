export type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <p className="page-state page-state--loading" data-testid="loading-state" role="status">
      {message}
    </p>
  );
}
