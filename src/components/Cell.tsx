import { useRef, useEffect, useState, useCallback } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { useTheme } from '../contexts/ThemeContext';
import { keymap } from '@codemirror/view';
import { defaultKeymap, historyKeymap } from '@codemirror/commands';
import { foldKeymap } from '@codemirror/language';
import { history } from '@codemirror/commands';
import { lineNumbers, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars } from '@codemirror/view';
import { foldGutter } from '@codemirror/language';
import { search, highlightSelectionMatches } from '@codemirror/search';
import { EditorState as ES } from '@codemirror/state';
import { indentOnInput, bracketMatching } from '@codemirror/language';
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

// 临时的 moonbit 语言支持（需要后续实现）
const moonbit = () => [];

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
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [isMarkdownEditing, setIsMarkdownEditing] = useState(false);

  const isCodeCell = cell.cell_type === 'code';
  const isMarkdownCell = cell.cell_type === 'markdown';

  // 使用全局主题
  const { currentTheme } = useTheme();

  // 初始化编辑器
  const initEditor = useCallback(async () => {
    if (!editorRef.current || editorViewRef.current) return;

    const sourceText = Array.isArray(cell.source) ? cell.source.join('\n') : cell.source || '';

    const state = EditorState.create({
      doc: sourceText,
      extensions: [
        basicSetup,
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        ES.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        rectangularSelection(),
        crosshairCursor(),
        search(),
        highlightSelectionMatches(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap
        ]),
        moonbit(),
        currentTheme,

        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const sourceText = update.state.doc.toString();
            onUpdate({ source: sourceText.split('\n') });
          }
        }),
        EditorView.domEventHandlers({
          keydown: (event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              onExecute();
              return true;
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              if (isMarkdownCell) {
                stopMarkdownEditing();
              }
              return true;
            }
            return false;
          }
        })
      ]
    });

    editorViewRef.current = new EditorView({
      state,
      parent: editorRef.current
    });

    // 聚焦编辑器
    editorViewRef.current.focus();
  }, [cell.source, onUpdate, onExecute, isMarkdownCell, currentTheme]);

  // 销毁编辑器
  const destroyEditor = useCallback(() => {
    if (editorViewRef.current) {
      editorViewRef.current.destroy();
      editorViewRef.current = null;
    }
  }, []);

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
    if (isMarkdownCell && !isMarkdownEditing) {
      startMarkdownEditing();
    }
  }, [onClick, isMarkdownCell, isMarkdownEditing, startMarkdownEditing]);

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

  // 初始化代码编辑器
  useEffect(() => {
    if (isCodeCell && isActive) {
      // 使用 setTimeout 确保 DOM 更新完成
      setTimeout(() => {
        initEditor();
      }, 0);
    }
  }, [isCodeCell, isActive, initEditor]);

  // 清理编辑器
  useEffect(() => {
    return () => {
      destroyEditor();
    };
  }, [destroyEditor]);

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
          <span className={`
            text-xs px-2 py-1 rounded font-mono
            ${isCodeCell ? 'bg-bg-purple text-text-purple' : 'bg-bg-orange text-text-orange'}
          `}>
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
      <div className="cell-content flex-1 min-h-[300px]">
        {/* 代码编辑器 */}
        {isCodeCell && (
          <div
            ref={editorRef}
            className="w-full font-mono text-sm"
          />
        )}

        {/* Markdown 编辑器 */}
        {isMarkdownCell && (
          <div>
            {isMarkdownEditing ? (
              <textarea
                value={Array.isArray(cell.source) ? cell.source.join('\n') : cell.source}
                onChange={handleMarkdownInput}
                onBlur={stopMarkdownEditing}
                onKeyDown={handleMarkdownKeyDown}
                className="w-full p-4 border-none outline-none resize-none min-h-[100px] font-sans"
                placeholder="输入 Markdown 内容..."
              />
            ) : (
              <Button
                onClick={startMarkdownEditing}
                variant="ghost"
                className="w-full p-4 min-h-[60px] cursor-text prose max-w-none text-left h-auto"
              >
                {cell.source && (Array.isArray(cell.source) ? cell.source.join('') : cell.source) ? (
                  <div>
                    {Array.isArray(cell.source) ? cell.source.join('\n') : cell.source}
                  </div>
                ) : (
                  <em className="text-gray-400">点击编辑 Markdown...</em>
                )}
              </Button>
            )}
          </div>
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