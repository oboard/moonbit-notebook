import { useRef, useEffect, useCallback } from 'react';
import { create, eval as eval_mb, add_extern_fn, expr_to_string } from './interpreter/moonbit-eval';
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
    newNotebook,
    activeCellData
  } = useNotebook();

  // MoonBit 解释器
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const moonbitEvalRef = useRef<{ interpreter: any } | null>(null);
  const activeCellDataRef = useRef(activeCellData);
  const addCellOutputRef = useRef(addCellOutput);

  // 保持引用最新
  useEffect(() => {
    activeCellDataRef.current = activeCellData;
    addCellOutputRef.current = addCellOutput;
  }, [activeCellData, addCellOutput]);

  // 初始化 MoonBit 解释器
  const initMoonBit = useCallback(async () => {
    // 防止重复初始化
    if (moonbitEvalRef.current) {
      return;
    }

    try {
      moonbitEvalRef.current = await create(false);
      if (moonbitEvalRef.current) {
        add_extern_fn(moonbitEvalRef.current.interpreter, "println", (content: { _0: { _0: { _0: string } } }) => {
          // 提取实际的字符串内容
          const message = content._0._0._0;

          // 使用 ref 获取最新的 activeCellData，避免闭包陷阱
          const currentActiveCellData = activeCellDataRef.current;
          if (currentActiveCellData && currentActiveCellData.cell_type === 'code') {
            // 添加print输出到当前cell
            addCellOutputRef.current(currentActiveCellData.id, {
              output_type: 'stream',
              name: 'stdout',
              text: [`${message}\n`]
            });
          } else {
            // 如果没有活动cell，输出到控制台
            console.log(message);
          }
        })
      }
    } catch (error: unknown) {
      console.error('MoonBit 解释器初始化失败:', error);
    }
  }, []); // 空依赖数组，确保只初始化一次

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
      const result = eval_mb(moonbitEvalRef.current, code, false, false);
      console.log(result);
      if (result._0.value) {
        // 添加输出
        addCellOutput(cellId, {
          output_type: 'execute_result',
          execution_count: 1,
          data: {
            'text/plain': expr_to_string(result._0.value)
          },
          metadata: {}
        });
      }
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

  // const handleAddCellAtIndex = (type: 'code' | 'markdown', index?: number) => {
  //   addCell(type, index);
  // };

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