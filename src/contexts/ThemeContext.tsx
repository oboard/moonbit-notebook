import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';

interface ThemeContextType {
  isDark: boolean;
  currentTheme: typeof githubLight | typeof githubDark;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 检测暗色模式偏好
  const [isDark, setIsDark] = useState(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  // 监听暗色模式变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 计算当前应该使用的主题
  const currentTheme = isDark ? githubDark : githubLight;

  // 手动切换主题（可选功能）
  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  // 应用全局CSS类
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const value = {
    isDark,
    currentTheme,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};