import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownContentProps {
  content: string;
  className?: string;
  mentionColor?: 'blue' | 'purple';
}

export function MarkdownContent({ content, className = "", mentionColor = 'blue' }: MarkdownContentProps) {
  const hashtagClass = mentionColor === 'blue' ? 'text-neon-blue' : 'text-neon-purple';

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={atomDark}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Custom handler for text to highlight hashtags
          text({ children }: any) {
             if (typeof children === 'string') {
               const parts = children.split(/(#[a-zA-Z0-9_żółćęśąźńŻÓŁĆĘŚĄŹŃ]+)/g);
               return (
                 <>
                   {parts.map((part, i) => {
                     if (part.startsWith('#')) {
                       return <span key={i} className={`${hashtagClass} cursor-pointer hover:underline font-bold`}>{part}</span>;
                     }
                     return part;
                   })}
                 </>
               );
             }
             return children;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
