import type React from 'react';
import { Button } from '@radix-ui/themes';
import { PlusIcon, FileTextIcon, CodeIcon } from 'lucide-react';
import type { Notebook as NotebookType, NotebookCell } from '../types/notebook';
import Cell from './Cell';

interface NotebookProps {
  notebook: NotebookType;
  activeCellId: string | null;
  onUpdateCell: (cellId: string, updates: Partial<NotebookCell>) => void;
  onExecuteCell: (cellId: string) => void;
  onDeleteCell: (cellId: string) => void;
  onMoveCell: (cellId: string, direction: 'up' | 'down') => void;
  onAddCell: (type: 'code' | 'markdown', index?: number) => void;
  onSetActiveCell: (cellId: string) => void;
}

export const Notebook: React.FC<NotebookProps> = ({
  notebook,
  activeCellId,
  onUpdateCell,
  onExecuteCell,
  onDeleteCell,
  onMoveCell,
  onAddCell,
  onSetActiveCell
}) => {
  const handleCellClick = (cellId: string) => {
    onSetActiveCell(cellId);
  };

  const handleAddCellAfter = (index: number, type: 'code' | 'markdown' = 'code') => {
    onAddCell(type, index + 1);
  };

  const getCellIndex = (cellId: string) => {
    return notebook.cells.findIndex(cell => cell.id === cellId);
  };

  const canMoveUp = (cellId: string) => {
    const index = getCellIndex(cellId);
    return index > 0;
  };

  const canMoveDown = (cellId: string) => {
    const index = getCellIndex(cellId);
    return index < notebook.cells.length - 1;
  };

  if (notebook.cells.length === 0) {
    return (
      <div className="notebook-container h-full">
        <div className="max-w-5xl mx-auto py-8 px-6">
          {/* 空状态 */}
          <div className="text-center py-16">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center">
                <FileTextIcon className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">开始创建你的 Notebook</h3>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">添加代码或文档 Cell 来开始编写你的交互式笔记本</p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => onAddCell('code')}
                size="3"
                variant="solid"
                color="violet"
              >
                <CodeIcon className="w-4 h-4" />
                添加代码 Cell
              </Button>
              <Button
                onClick={() => onAddCell('markdown')}
                size="3"
                variant="outline"
                color="gray"
              >
                <FileTextIcon className="w-4 h-4" />
                添加文档 Cell
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notebook-container h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto py-8 px-6">
        {/* Cells 列表 */}
        <div className="space-y-6">
          {notebook.cells.map((cell, index) => (
            <div
              key={cell.id}
              className="relative group"
            >
              {/* Cell 组件 */}
              <Cell
                cell={cell}
                isActive={cell.id === activeCellId}
                canMoveUp={canMoveUp(cell.id)}
                canMoveDown={canMoveDown(cell.id)}
                onClick={() => handleCellClick(cell.id)}
                onUpdate={(updates) => onUpdateCell(cell.id, updates)}
                onExecute={() => onExecuteCell(cell.id)}
                onDelete={() => onDeleteCell(cell.id)}
                onMoveUp={() => onMoveCell(cell.id, 'up')}
                onMoveDown={() => onMoveCell(cell.id, 'down')}
                onAddCellAfter={(type) => handleAddCellAfter(index, type)}
              />

              {/* Cell 间的添加按钮 */}
              {index < notebook.cells.length - 1 && (
                <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                  <div className="flex gap-2 bg-base-100 rounded-lg shadow-lg border p-1">
                    <Button
                      onClick={() => handleAddCellAfter(index, 'code')}
                      size="1"
                      variant="ghost"
                      color="violet"
                      title="添加代码 Cell"
                    >
                      <CodeIcon className="w-3 h-3" />
                      代码
                    </Button>
                    <Button
                      onClick={() => handleAddCellAfter(index, 'markdown')}
                      size="1"
                      variant="ghost"
                      color="blue"
                      title="添加 Markdown Cell"
                    >
                      <FileTextIcon className="w-3 h-3" />
                      文档
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 最后添加 Cell 的按钮 */}
          <div className="text-center py-8">
            <div className="bg-base-100 rounded-xl border border-gray-200 p-6 shadow-sm">
              <h4 className="text-sm font-medium text-secondary mb-4">添加新的 Cell</h4>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => onAddCell('code')}
                  size="2"
                  variant="solid"
                  color="violet"
                >
                  <PlusIcon className="w-4 h-4" />
                  <CodeIcon className="w-4 h-4" />
                  代码 Cell
                </Button>
                <Button
                  onClick={() => onAddCell('markdown')}
                  size="2"
                  variant="outline"
                  color="blue"
                >
                  <PlusIcon className="w-4 h-4" />
                  <FileTextIcon className="w-4 h-4" />
                  文档 Cell
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notebook;