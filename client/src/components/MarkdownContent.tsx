import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

export type MarkdownContentProps = {
  content: string;
  className?: string;
  emptyFallback?: string;
};

export function MarkdownContent({
  content,
  className = "markdown-content",
  emptyFallback = "No content yet.",
}: MarkdownContentProps) {
  const trimmed = content.trim();

  if (!trimmed) {
    return <div className={className}>{emptyFallback}</div>;
  }

  return (
    <div className={className} data-testid="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
