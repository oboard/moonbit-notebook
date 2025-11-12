import { useRef, useEffect, useCallback } from 'react';
import type { NotebookCell } from './types/notebook';
import { useNotebook } from './stores/notebook';
import { fileService } from './services/fileService';
import Notebook from './components/Notebook';
import { NotebookToolbar } from './components/Toolbar';
import Footer from './components/Footer';
import type { WorkerMessage, WorkerResponse } from './workers/moonbitWorker';

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
    updateCellMetadata,
    setActiveCell,
    addCellOutput,
    clearCellOutput,
    loadNotebook,
    newNotebook,
    activeCellData,
    startCellExecution,
    stopCellExecution,
    isCellExecuting,
  } = useNotebook();

  // WebWorker
  const workerRef = useRef<Worker | null>(null);
  const activeCellDataRef = useRef(activeCellData);
  const addCellOutputRef = useRef(addCellOutput);
  const pendingExecutions = useRef<Map<string, boolean>>(new Map());

  // 保持引用最新
  useEffect(() => {
    activeCellDataRef.current = activeCellData;
    addCellOutputRef.current = addCellOutput;
  }, [activeCellData, addCellOutput]);

  // 初始化 WebWorker
  const initWorker = useCallback(() => {
    // 防止重复初始化
    if (workerRef.current) {
      return;
    }

    try {
      // 创建WebWorker
      workerRef.current = new Worker(
        new URL('./workers/moonbitWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // 监听Worker消息
      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, id, data, error } = event.data;

        console.log(data)
        switch (type) {
          case 'output':
            if (data) {
              // 添加输出
              addCellOutput(id, {
                output_type: 'stream',
                name: 'stdout',
                text: [data.stringValue]
              });
            }
            break;
          case 'ast':
            if (data) {
              addCellOutput(id, {
                output_type: 'ast',
                execution_count: 1,
                data: {
                  'application/json': data.jsonValue,
                  'text/plain': data.stringValue
                },
                metadata: {}
              });
            }
            break;
          case 'result':
            if (data) {
              // 更新cell的metadata中的ExecuteTime
              updateCellMetadata(id, {
                ExecuteTime: {
                  start_time: data.startTime,
                  end_time: data.endTime
                }
              });

              if (data.hasValue && data.jsonValue && data.stringValue) {
                // 添加执行结果输出
                addCellOutput(id, {
                  output_type: 'execute_result',
                  execution_count: 1,
                  data: {
                    'application/json': data.jsonValue,
                    'text/plain': data.stringValue
                  },
                  metadata: {}
                });
              }
            }
            stopCellExecution(id);
            pendingExecutions.current.delete(id);
            break;

          case 'error':
            // 添加错误输出
            addCellOutput(id, {
              output_type: 'error',
              ename: 'Error',
              evalue: error || 'Unknown error',
              traceback: []
            });
            stopCellExecution(id);
            pendingExecutions.current.delete(id);
            break;

          case 'aborted':
            stopCellExecution(id);
            pendingExecutions.current.delete(id);
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('WebWorker error:', error);
      };

    } catch (error: unknown) {
      console.error('WebWorker 初始化失败:', error);
    }
  }, [updateCellMetadata, addCellOutput, stopCellExecution]);

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
      alert(`Failed to open file: ${error}`);
    }
  };

  const handleSaveNotebook = async () => {
    try {
      const success = await fileService.saveNotebook(notebook);
      if (success) {
        // 保存成功后标记为未修改
        console.log('File saved successfully');
      }
    } catch (error) {
      console.error('保存文件失败:', error);
      alert(`Failed to save file: ${error}`);
    }
  };

  const handleSaveAsNotebook = async () => {
    try {
      // fileService 没有 saveNotebookAs 方法，使用 saveNotebook
      const success = await fileService.saveNotebook(notebook);
      if (success) {
        console.log('Save as successful');
      }
    } catch (error) {
      console.error('另存为失败:', error);
      alert(`Save as failed: ${error}`);
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
    if (!cell || cell.cell_type !== 'code' || !workerRef.current) return;

    // 如果正在执行，则停止执行
    if (isCellExecuting(cellId)) {
      stopCellExecution(cellId);
      return;
    }

    // 开始执行状态
    startCellExecution(cellId);
    pendingExecutions.current.set(cellId, true);

    // 清除之前的输出
    clearCellOutput(cellId);

    // 发送执行消息到WebWorker
    const code = Array.isArray(cell.source) ? cell.source.join('\n') : cell.source;
    const message: WorkerMessage = {
      type: 'execute',
      id: cellId,
      code
    };

    workerRef.current.postMessage(message);
  };

  const handleStopCell = (cellId: string) => {
    if (workerRef.current && pendingExecutions.current.has(cellId)) {
      // 先尝试发送中断消息
      const message: WorkerMessage = {
        type: 'abort',
        id: cellId
      };
      workerRef.current.postMessage(message);
    }
    stopCellExecution(cellId);
    pendingExecutions.current.delete(cellId);
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

  const handleRunAll = async () => {
    const codeCells = notebook.cells.filter(cell => cell.cell_type === 'code');
    for (const cell of codeCells) {
      await handleExecuteCell(cell.id);
    }
  };

  // 初始化
  useEffect(() => {
    initWorker();

    // 清理函数
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [initWorker]);

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
        onRunAll={handleRunAll}
      />

      {/* Notebook 内容区域 */}
      <div className="flex-1 overflow-auto">
        <Notebook
          notebook={notebook}
          activeCellId={activeCell}
          onUpdateCell={handleUpdateCell}
          onExecuteCell={handleExecuteCell}
          onStopCell={handleStopCell}
          onDeleteCell={handleDeleteCell}
          onMoveCell={handleMoveCell}
          onAddCell={handleAddCell}
          onSetActiveCell={handleSetActiveCell}
          isCellExecuting={isCellExecuting}
        />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;