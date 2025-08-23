import { type FC, useEffect, useState } from 'react';

interface FooterProps {
  className?: string;
}

const Footer: FC<FooterProps> = ({ className = '' }) => {
  const [lastCommitTime, setLastCommitTime] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLastCommit = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/oboard/moonbit-notebook/commits?per_page=1');
        if (response.ok) {
          const commits = await response.json();
          if (commits.length > 0) {
            const commitDate = new Date(commits[0].commit.committer.date);
            setLastCommitTime(commitDate.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch commit info:', error);
        setLastCommitTime('获取失败');
      } finally {
        setLoading(false);
      }
    };

    fetchLastCommit();
  }, []);

  const GitHubIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="inline-block"
      aria-label="GitHub"
    >
      <title>GitHub</title>
      <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.30 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );

  return (
    <footer className={`bg-base-200 border-t border-base-300 py-4 px-6 ${className}`}>
      <div className="flex items-center justify-between text-sm text-base-content/70">
        <div className="flex items-center gap-4">
          <span>© {new Date().getFullYear()} oboard</span>
          <a
            href="https://github.com/oboard/moonbit-notebook"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-primary transition-colors"
          >
            <GitHubIcon />
            <span>moonbit-notebook</span>
          </a>
        </div>
        <div className="text-xs">
          {loading ? (
            <span>Loading...</span>
          ) : (
            <span>  Last commit: {lastCommitTime}</span>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;