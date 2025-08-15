import { useEffect, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button } from '@radix-ui/themes';
import {
  Play,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Trash2
} from 'lucide-react';
import type { NotebookCell as CellType, CellOutput } from '../types/notebook';
import clsx from 'clsx';
import { registerMoonbitLanguage, getMonacoLanguage, applyMoonbitTheme } from '../utils/moonbitLanguage';

// Monaco Editor 语言映射
// MoonBit 语言注册（仅注册一次）
let moonbitRegistered = false;
const ensureMoonbitLanguage = () => {
  if (!moonbitRegistered) {
    registerMoonbitLanguage();
    moonbitRegistered = true;
  }
};

// 安全的 Markdown 渲染组件
const MarkdownRenderer: React.FC<{ content: string; onClick: () => void }> = ({ content, onClick }) => {
  const renderContent = (): React.ReactNode[] => {
    return content
      .split('\n')
      .map((line, index) => {
        const key = `line-${index}-${line.substring(0, 20)}`; // 使用内容片段作为 key
        
        if (line.startsWith('### ')) {
          return <h3 key={key} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={key} className="text-xl font-semibold mt-4 mb-2">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={key} className="text-2xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
        }

        // 处理内联格式
        const processInlineFormatting = (text: string): React.ReactNode => {
          const parts: React.ReactNode[] = [];

          // 简单的粗体和斜体处理
          const boldRegex = /\*\*(.*?)\*\*/g;

          let match: RegExpExecArray | null;
          let lastIndex = 0;

          // 处理粗体
          match = boldRegex.exec(text);
          while (match !== null) {
            if (match.index > lastIndex) {
              parts.push(text.slice(lastIndex, match.index));
            }
            parts.push(<strong key={`bold-${match.index}`}>{match[1]}</strong>);
            lastIndex = match.index + match[0].length;
            match = boldRegex.exec(text);
          }

          if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
          }

          return parts.length > 0 ? parts : text;
        };

        return (
          <p key={key} className="mb-2">
            {processInlineFormatting(line)}
          </p>
        );
      });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full p-4 min-h-[60px] cursor-text prose max-w-none focus:outline-none focus:ring-2 focus:ring-blue-300 text-left bg-transparent border-none"
    >
      {renderContent()}
    </button>
  );
};

interface CellProps {
  cell: CellType;
  isActive: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onUpdate: (updates: Partial<CellType>) => void;
  onExecute: () => void;
  onClick: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddCellAfter: (cellType: 'code' | 'markdown') => void;
  onDelete: () => void;
}

export const Cell: React.FC<CellProps> = ({
  cell,
  isActive,
  canMoveUp,
  canMoveDown,
  onUpdate,
  onExecute,
  onClick,
  onMoveUp,
  onMoveDown,
  onAddCellAfter,
  onDelete
}) => {
  const [isMarkdownEditing, setIsMarkdownEditing] = useState(false);
  const [editorValue, setEditorValue] = useState(() => {
    return Array.isArray(cell.source) ? cell.source.join('\n') : cell.source || '';
  });

  // 计算编辑器高度
  const calculateEditorHeight = useCallback(() => {
    const lines = editorValue.split('\n').length;
    const minHeight = 60; // 最小高度
    const lineHeight = 20; // 每行高度
    const padding = 20; // 上下内边距
    const maxHeight = 400; // 最大高度
    
    const calculatedHeight = Math.max(minHeight, Math.min(maxHeight, lines * lineHeight + padding));
    return calculatedHeight;
  }, [editorValue]);

  const isCodeCell = cell.cell_type === 'code';
  const isMarkdownCell = cell.cell_type === 'markdown';
  // 获取 Monaco 主题
  const getMonacoTheme = useCallback(() => {
    // 这里可以根据 currentTheme 返回对应的 Monaco 主题
    return 'vs-dark'; // 默认使用暗色主题，后续可以根据实际主题切换
  }, []);

  // 处理编辑器值变化
  const handleEditorChange = useCallback((value: string | undefined) => {
    const newValue = value || '';
    setEditorValue(newValue);
    onUpdate({ source: newValue.split('\n') });
  }, [onUpdate]);

  // 处理编辑器键盘事件
  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (isCodeCell) {
        onExecute();
      } else if (isMarkdownCell) {
        stopMarkdownEditing();
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (isMarkdownCell) {
        stopMarkdownEditing();
      }
    }
  }, [isCodeCell, isMarkdownCell, onExecute]);

  // 开始 Markdown 编辑
  const startMarkdownEditing = useCallback(() => {
    setIsMarkdownEditing(true);
    onClick();
  }, [onClick]);

  // 停止 Markdown 编辑
  const stopMarkdownEditing = useCallback(() => {
    setIsMarkdownEditing(false);
  }, []);

  // 处理点击
  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  // 处理执行
  const handleExecute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onExecute();
  }, [onExecute]);

  // 渲染输出
  const renderOutput = useCallback((output: CellOutput): string => {
    switch (output.output_type) {
      case 'execute_result':
      case 'display_data':
        return (output.data?.['text/plain'] as string) || '';
      case 'stream':
        return output.text?.join('') || '';
      case 'error':
        return `${output.ename}: ${output.evalue}\n${output.traceback?.join('\n') || ''}`;
      default:
        return JSON.stringify(output, null, 2);
    }
  }, []);

  // 处理 Markdown 输入
  const handleMarkdownInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ source: [e.target.value] });
  }, [onUpdate]);

  // 处理 Markdown 键盘事件
  const handleMarkdownKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      stopMarkdownEditing();
    }
  }, [stopMarkdownEditing]);

  // 同步编辑器值与 cell.source
  useEffect(() => {
    const sourceText = Array.isArray(cell.source) ? cell.source.join('\n') : cell.source || '';
    if (sourceText !== editorValue) {
      setEditorValue(sourceText);
    }
  }, [cell.source, editorValue]);

  return (
    <div
      className={clsx(
        'cell-container border flex flex-col rounded-lg overflow-hidden bg-base-300 shadow-sm transition-all duration-200 mb-4 group',
        {
          'border-blue-400 shadow-md': isActive,
          'border-gray-200 hover:border-gray-300': !isActive
        }
      )}
      onClick={handleClick}
      onKeyDown={handleClick}
    >
      {/* Cell 头部 */}
      <div className="cell-header flex items-center justify-between px-3 py-2 border-b border-gray-200 rounded-t-lg">
        {/* 左侧信息 */}
        <div className="flex items-center space-x-2">
          <span className={"text-xs px-2 py-1 rounded font-mono bg-base-100 text-primary"}>
            {isCodeCell ? 'Code' : 'Markdown'}
          </span>
          {isCodeCell && cell.execution_count && (
            <span className="text-xs text-gray-500 font-mono">
              [{cell.execution_count}]
            </span>
          )}
        </div>

        {/* 右侧操作按钮 */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* 执行按钮 */}
          {isCodeCell && (
            <Button
              onClick={handleExecute}
              size="1"
              variant="ghost"
              color="green"
              title="执行 (Ctrl/Cmd + Enter)"
            >
              <Play className="w-4 h-4" />
            </Button>
          )}

          {/* 移动按钮 */}
          <Button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={!canMoveUp}
            size="1"
            variant="ghost"
            color="gray"
            title="上移"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>

          <Button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={!canMoveDown}
            size="1"
            variant="ghost"
            color="gray"
            title="下移"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>

          {/* 更多操作下拉菜单 */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                size="1"
                variant="ghost"
                color="gray"
                title="更多操作"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[160px] bg-base-100 rounded-md shadow-lg border border-gray-200 p-1 z-50"
                sideOffset={5}
              >
                <DropdownMenu.Item
                  onClick={() => onAddCellAfter('code')}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-secondary hover:bg-bg-purple hover:text-text-purple rounded cursor-pointer focus:outline-none focus:bg-bg-purple"
                >
                  <Plus className="w-4 h-4" />
                  添加代码 Cell
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  onClick={() => onAddCellAfter('markdown')}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-secondary hover:bg-bg-orange hover:text-text-orange rounded cursor-pointer focus:outline-none focus:bg-bg-orange"
                >
                  <Plus className="w-4 h-4" />
                  添加文档 Cell
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="h-px bg-border-secondary my-1" />

                <DropdownMenu.Item
                  onClick={onDelete}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-text-error hover:bg-bg-error rounded cursor-pointer focus:outline-none focus:bg-bg-error"
                >
                  <Trash2 className="w-4 h-4" />
                  删除 Cell
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Cell 内容 */}
      <div className="cell-content flex-1">
        {/* 代码单元格 - 始终显示 Monaco 编辑器 */}
        {isCodeCell && (
          <div className="w-full" style={{ height: `${calculateEditorHeight()}px` }}>
            <Editor
              height="100%"
              language={getMonacoLanguage(cell.cell_type)}
              value={editorValue}
              defaultLanguage='moonbit'
              onChange={handleEditorChange}
              theme={getMonacoTheme()}
              onMount={(editor, monaco) => {
                // 确保 MoonBit 语言已注册
                ensureMoonbitLanguage();
                
                // 应用 MoonBit 主题
                applyMoonbitTheme();
                
                // 强制设置语言
                if (cell.cell_type === 'code') {
                  const model = editor.getModel();
                  if (model) {
                    monaco.editor.setModelLanguage(model, 'moonbit');
                    console.log('✅ 编辑器语言已设置为 moonbit');
                  }
                }
              }}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                // 关闭语法检查和错误提示
                'semanticHighlighting.enabled': false,
                quickSuggestions: false,
                parameterHints: { enabled: false },
                suggestOnTriggerCharacters: false,
                acceptSuggestionOnEnter: 'off',
                tabCompletion: 'off',
                wordBasedSuggestions: 'off',
                // 关闭所有语言服务
                hover: { enabled: false },
                links: false,
                colorDecorators: false
              }}
            />
          </div>
        )}

        {/* Markdown 单元格 - 编辑模式 */}
        {isMarkdownCell && isMarkdownEditing && (
          <div className="w-full" style={{ height: `${calculateEditorHeight()}px` }}>
            <Editor
              height="100%"
              language={getMonacoLanguage(cell.cell_type)}
              value={editorValue}
              onChange={handleEditorChange}
              theme={getMonacoTheme()}
              onMount={(editor, monaco) => {
                ensureMoonbitLanguage();
                // 强制刷新语法高亮
                if (cell.cell_type === 'markdown') {
                  const model = editor.getModel();
                  if (model) {
                    monaco.editor.setModelLanguage(model, 'markdown');
                  }
                }
              }}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true
              }}
            />
          </div>
        )}

        {/* Markdown 单元格 - 渲染视图 */}
        {isMarkdownCell && !isMarkdownEditing && (
          cell.source && (Array.isArray(cell.source) ? cell.source.join('') : cell.source) ? (
            <MarkdownRenderer
              content={Array.isArray(cell.source) ? cell.source.join('\n') : cell.source}
              onClick={startMarkdownEditing}
            />
          ) : (
            <button
              type="button"
              onClick={startMarkdownEditing}
              className="w-full p-4 min-h-[60px] cursor-text prose max-w-none focus:outline-none focus:ring-2 focus:ring-blue-300 text-left bg-transparent border-none"
            >
              <em className="text-gray-400">点击编辑 Markdown...</em>
            </button>
          )
        )}
      </div>

      {/* Cell 输出 */}
      {isCodeCell && cell.outputs && cell.outputs.length > 0 && (
        <div className="cell-outputs border-t border-gray-200">
          {cell.outputs.map((output: CellOutput, index: number) => {
            const outputId = `${cell.id}-output-${output.output_type}-${index}`;
            return (
              <div
                key={outputId}
                className={`
                  p-4 font-mono text-sm whitespace-pre-wrap
                  ${output.output_type === 'error' ? 'bg-bg-error text-text-error' : 'bg-base-200 text-primary'}
                `}
              >
                {renderOutput(output)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Cell;