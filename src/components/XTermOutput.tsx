import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import type { OutputType } from '../types/notebook';

interface XTermOutputProps {
  content: string;
  outputType: OutputType;
}

export const XTermOutput: React.FC<XTermOutputProps> = ({ content, outputType }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // 创建终端实例
    const terminal = new Terminal({
      rows: Math.min(Math.max(content.split('\n').length, 1), 20), // 根据内容行数动态调整，最小1行，最大20行
      cols: 80,
      theme: {
        //   background: 'transparent', // 使用透明背景，让外层容器控制背景色
        foreground: outputType === 'error' ? '#ef4444' : '#ffffff', // 错误用红色，正常用白色
        //   black: '#000000',
        //   red: '#ef4444',
        //   green: '#10b981',
        //   yellow: '#f59e0b',
        //   blue: '#3b82f6',
        //   magenta: '#8b5cf6',
        //   cyan: '#06b6d4',
        //   white: '#f3f4f6',
      },
      disableStdin: true, // 禁用输入
      cursorBlink: false,
      cursorStyle: undefined,
      cursorInactiveStyle: "none",
      allowProposedApi: true,
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    });

    // 创建fit插件
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    // 挂载到DOM
    terminal.open(terminalRef.current);

    // 适配大小
    fitAddon.fit();

    // 写入内容
    terminal.write(content.replace(/\n/g, '\r\n'));

    // 保存引用
    terminalInstanceRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // 监听窗口大小变化
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose();
        terminalInstanceRef.current = null;
      }
      fitAddonRef.current = null;
    };
  }, [content, outputType]);

  return (
    <div
      className={'bg-black border-t border-gray-200'}
    >
      <div
        ref={terminalRef}
        style={{
          minHeight: '64px',
          overflow: 'hidden'
        }}
        className="xterm-container px-4 pt-2"
      />
    </div>
  );
};

export default XTermOutput;