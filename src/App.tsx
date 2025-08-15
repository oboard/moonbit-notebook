import { useRef, useEffect, useCallback } from 'react';
import { create } from './interpreter/moonbit-eval';
import type { NotebookCell } from './types/notebook';
import { useNotebook } from './stores/notebook';
import { fileService } from './services/fileService';
import Notebook from './components/Notebook';
import { NotebookToolbar } from './components/Toolbar';

function App() {
  // 使用 Notebook store
  const {
    notebook,
    activeCell,
    isDirty,
    filePath,
    addCell,
    deleteCell,
    moveCell,
    updateCell,
    setActiveCell,
    addCellOutput,
    clearCellOutput,
    loadNotebook,
    newNotebook
  } = useNotebook();

  // MoonBit 解释器
  const moonbitEvalRef = useRef<{ eval: (code: string) => string } | null>(null);

  // 初始化 MoonBit 解释器
  const initMoonBit = useCallback(async () => {
    try {
      moonbitEvalRef.current = await create(false);
      console.log('MoonBit 解释器初始化成功');
    } catch (error) {
      console.error('MoonBit 解释器初始化失败:', error);
    }
  }, []);

  // 文件操作
  const handleNewNotebook = () => {
    newNotebook();
  };

  const handleOpenNotebook = async () => {
    try {
      const notebookData = await fileService.openNotebook();
      if (notebookData) {
        loadNotebook(notebookData.notebook, notebookData.filePath || 'opened-file.ipynb');
      }
    } catch (error) {
      console.error('打开文件失败:', error);
      alert(`打开文件失败: ${error}`);
    }
  };

  const handleSaveNotebook = async () => {
    try {
      const success = await fileService.saveNotebook(notebook);
      if (success) {
        // 保存成功后标记为未修改
        console.log('文件保存成功');
      }
    } catch (error) {
      console.error('保存文件失败:', error);
      alert(`保存文件失败: ${error}`);
    }
  };

  const handleSaveAsNotebook = async () => {
    try {
      // fileService 没有 saveNotebookAs 方法，使用 saveNotebook
      const success = await fileService.saveNotebook(notebook);
      if (success) {
        console.log('另存为成功');
      }
    } catch (error) {
      console.error('另存为失败:', error);
      alert(`另存为失败: ${error}`);
    }
  };

  // Cell 操作
  const handleAddCell = (type: 'code' | 'markdown') => {
    addCell(type);
  };

  const handleUpdateCell = (cellId: string, updates: Partial<NotebookCell>) => {
    if (updates.source) {
      const source = Array.isArray(updates.source) ? updates.source : [updates.source];
      updateCell(cellId, source);
    }
  };

  const handleExecuteCell = async (cellId: string) => {
    const cell = notebook.cells.find((c: NotebookCell) => c.id === cellId);
    if (!cell || cell.cell_type !== 'code' || !moonbitEvalRef.current) return;

    try {
      // 清除之前的输出
      clearCellOutput(cellId);

      // 执行代码
      const code = Array.isArray(cell.source) ? cell.source.join('\n') : cell.source;
      const result = moonbitEvalRef.current.eval(code);

      // 添加输出
      addCellOutput(cellId, {
        output_type: 'execute_result',
        execution_count: 1,
        data: {
          'text/plain': result
        },
        metadata: {}
      });
    } catch (error) {
      // 添加错误输出
      addCellOutput(cellId, {
        output_type: 'error',
        ename: 'Error',
        evalue: String(error),
        traceback: [String(error)]
      });
    }
  };

  const handleDeleteCell = (cellId: string) => {
    deleteCell(cellId);
  };

  const handleMoveCell = (cellId: string, direction: 'up' | 'down') => {
    const cells = notebook.cells;
    const currentIndex = cells.findIndex((c: NotebookCell) => c.id === cellId);
    if (currentIndex === -1) return;

    let newIndex = currentIndex;
    if (direction === 'up' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < cells.length - 1) {
      newIndex = currentIndex + 1;
    }

    if (newIndex !== currentIndex) {
      moveCell(cellId, newIndex);
    }
  };

  const handleAddCellAtIndex = (type: 'code' | 'markdown', index?: number) => {
    addCell(type, index);
  };

  const handleSetActiveCell = (cellId: string) => {
    setActiveCell(cellId);
  };

  // 初始化
  useEffect(() => {
    initMoonBit();
  }, [initMoonBit]);

  return (
    <div id="app" className="h-screen flex flex-col bg-base-100">
      {/* 工具栏 */}
      <NotebookToolbar
        currentFilePath={filePath}
        canSave={isDirty}
        onNewNotebook={handleNewNotebook}
        onOpenNotebook={handleOpenNotebook}
        onSaveNotebook={handleSaveNotebook}
        onSaveAsNotebook={handleSaveAsNotebook}
        onAddCell={handleAddCell}
      />

      {/* Notebook 内容区域 */}
      <div className="flex-1 overflow-auto">
        <Notebook
          notebook={notebook}
          activeCellId={activeCell}
          onUpdateCell={handleUpdateCell}
          onExecuteCell={handleExecuteCell}
          onDeleteCell={handleDeleteCell}
          onMoveCell={handleMoveCell}
          onAddCell={handleAddCell}
          onSetActiveCell={handleSetActiveCell}
        />
      </div>
    </div>
  );
}

export default App;