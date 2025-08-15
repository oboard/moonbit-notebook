// Notebook状态管理 - React + Zustand版本
// "如果你需要超过3层缩进，你就已经完蛋了" - Linus

import { create } from 'zustand';
import type { 
  Notebook, 
  NotebookState, 
  NotebookCell, 
  CellOperation,
  CellOutput
} from '../types/notebook';
import { createEmptyNotebook, createCell } from '../types/notebook';

// 核心reducer - 无特殊情况，纯函数
const reducer = (currentState: NotebookState, operation: CellOperation): NotebookState => {
  const newState = { ...currentState };
  const cells = [...newState.notebook.cells];
  
  switch (operation.type) {
    case 'ADD_CELL': {
      const newCell = createCell(operation.cellType);
      const index = operation.index ?? cells.length;
      cells.splice(index, 0, newCell);
      newState.notebook = { ...newState.notebook, cells };
      newState.activeCell = newCell.id;
      newState.isDirty = true;
      break;
    }
    
    case 'DELETE_CELL': {
      const index = cells.findIndex(cell => cell.id === operation.cellId);
      if (index !== -1) {
        cells.splice(index, 1);
        newState.notebook = { ...newState.notebook, cells };
        newState.activeCell = cells[Math.min(index, cells.length - 1)]?.id || null;
        newState.isDirty = true;
      }
      break;
    }
    
    case 'MOVE_CELL': {
      const fromIndex = cells.findIndex(cell => cell.id === operation.cellId);
      if (fromIndex !== -1) {
        const [cell] = cells.splice(fromIndex, 1);
        cells.splice(operation.newIndex, 0, cell);
        newState.notebook = { ...newState.notebook, cells };
        newState.isDirty = true;
      }
      break;
    }
    
    case 'UPDATE_CELL': {
      const index = cells.findIndex(cell => cell.id === operation.cellId);
      if (index !== -1) {
        cells[index] = { ...cells[index], source: operation.source };
        newState.notebook = { ...newState.notebook, cells };
        newState.isDirty = true;
      }
      break;
    }
    
    case 'UPDATE_CELL_METADATA': {
      const index = cells.findIndex(cell => cell.id === operation.cellId);
      if (index !== -1) {
        cells[index] = { ...cells[index], metadata: { ...cells[index].metadata, ...operation.metadata } };
        newState.notebook = { ...newState.notebook, cells };
        newState.isDirty = true;
      }
      break;
    }
    
    case 'EXECUTE_CELL': {
      const index = cells.findIndex(cell => cell.id === operation.cellId);
      if (index !== -1 && cells[index].cell_type === 'code') {
        newState.executionCount++;
        cells[index] = { 
          ...cells[index], 
          execution_count: newState.executionCount 
        };
        newState.notebook = { ...newState.notebook, cells };
      }
      break;
    }
    
    case 'START_CELL_EXECUTION': {
      newState.executingCells = new Set(newState.executingCells);
      newState.executingCells.add(operation.cellId);
      break;
    }
    
    case 'STOP_CELL_EXECUTION': {
      newState.executingCells = new Set(newState.executingCells);
      newState.executingCells.delete(operation.cellId);
      break;
    }
    
    case 'SET_ACTIVE_CELL': {
      newState.activeCell = operation.cellId;
      break;
    }
  }
  
  return newState;
};

interface NotebookStore extends NotebookState {
  // 基础操作
  dispatch: (operation: CellOperation) => void;
  
  // Cell操作
  addCell: (type: 'code' | 'markdown', index?: number) => void;
  deleteCell: (cellId: string) => void;
  moveCell: (cellId: string, newIndex: number) => void;
  updateCell: (cellId: string, source: string[]) => void;
  updateCellMetadata: (cellId: string, metadata: Record<string, unknown>) => void;
  executeCell: (cellId: string) => void;
  setActiveCell: (cellId: string | null) => void;
  
  // 执行状态管理
  startCellExecution: (cellId: string) => void;
  stopCellExecution: (cellId: string) => void;
  isCellExecuting: (cellId: string) => boolean;
  
  // Cell输出操作
  addCellOutput: (cellId: string, output: CellOutput) => void;
  clearCellOutput: (cellId: string) => void;
  
  // Notebook操作
  loadNotebook: (notebook: Notebook, filePath?: string) => void;
  newNotebook: () => void;
  
  // 计算属性
  getActiveCellData: () => NotebookCell | undefined;
}

export const useNotebookStore = create<NotebookStore>((set, get) => {
  const initialNotebook = createEmptyNotebook();
  return {
    // 初始状态
    notebook: initialNotebook,
    activeCell: initialNotebook.cells[0]?.id || null,
    executionCount: 0,
    isDirty: false,
    filePath: null,
    executingCells: new Set<string>(),
    
    // 基础操作
    dispatch: (operation: CellOperation) => {
      set((state) => reducer(state, operation));
    },
    
    // Cell操作
    addCell: (type: 'code' | 'markdown', index?: number) => {
      get().dispatch({ type: 'ADD_CELL', cellType: type, index });
    },
    
    deleteCell: (cellId: string) => {
      get().dispatch({ type: 'DELETE_CELL', cellId });
    },
    
    moveCell: (cellId: string, newIndex: number) => {
      get().dispatch({ type: 'MOVE_CELL', cellId, newIndex });
    },
    
    updateCell: (cellId: string, source: string[]) => {
      get().dispatch({ type: 'UPDATE_CELL', cellId, source });
    },
    
    updateCellMetadata: (cellId: string, metadata: Record<string, unknown>) => {
      get().dispatch({ type: 'UPDATE_CELL_METADATA', cellId, metadata });
    },
    
    executeCell: (cellId: string) => {
      get().dispatch({ type: 'EXECUTE_CELL', cellId });
    },
    
    setActiveCell: (cellId: string | null) => {
      get().dispatch({ type: 'SET_ACTIVE_CELL', cellId });
    },
    
    // 执行状态管理
    startCellExecution: (cellId: string) => {
      get().dispatch({ type: 'START_CELL_EXECUTION', cellId });
    },
    
    stopCellExecution: (cellId: string) => {
      get().dispatch({ type: 'STOP_CELL_EXECUTION', cellId });
    },
    
    isCellExecuting: (cellId: string) => {
      return get().executingCells.has(cellId);
    },
    
    // Cell输出操作
    addCellOutput: (cellId: string, output: CellOutput) => {
      set((state) => {
        const cells = [...state.notebook.cells];
        const index = cells.findIndex(cell => cell.id === cellId);
        if (index !== -1 && cells[index].cell_type === 'code') {
          const cell = { ...cells[index] };
          cell.outputs = [...(cell.outputs || []), output];
          cells[index] = cell;
          return {
            ...state,
            notebook: { ...state.notebook, cells }
          };
        }
        return state;
      });
    },
    
    clearCellOutput: (cellId: string) => {
      set((state) => {
        const cells = [...state.notebook.cells];
        const index = cells.findIndex(cell => cell.id === cellId);
        if (index !== -1 && cells[index].cell_type === 'code') {
          cells[index] = { ...cells[index], outputs: [] };
          return {
            ...state,
            notebook: { ...state.notebook, cells }
          };
        }
        return state;
      });
    },
    
    // Notebook操作
    loadNotebook: (notebook: Notebook, filePath?: string) => {
      set({
        notebook,
        activeCell: notebook.cells[0]?.id || null,
        executionCount: 0,
        isDirty: false,
        filePath: filePath || null,
        executingCells: new Set<string>()
      });
    },
    
    newNotebook: () => {
      get().loadNotebook(createEmptyNotebook());
    },
    
    // 计算属性
    getActiveCellData: () => {
      const state = get();
      return state.notebook.cells.find(cell => cell.id === state.activeCell);
    }
  };
});

// 兼容性导出 - 保持与Vue版本相同的API
export const useNotebook = () => {
  const store = useNotebookStore();
  
  return {
    // 状态
    notebook: store.notebook,
    cells: store.notebook.cells,
    activeCell: store.activeCell,
    activeCellData: store.getActiveCellData(),
    isDirty: store.isDirty,
    filePath: store.filePath,
    
    // 操作
    addCell: store.addCell,
    deleteCell: store.deleteCell,
    moveCell: store.moveCell,
    updateCell: store.updateCell,
    updateCellMetadata: store.updateCellMetadata,
    executeCell: store.executeCell,
    setActiveCell: store.setActiveCell,
    addCellOutput: store.addCellOutput,
    clearCellOutput: store.clearCellOutput,
    loadNotebook: store.loadNotebook,
    newNotebook: store.newNotebook,
    
    // 执行状态管理
    startCellExecution: store.startCellExecution,
    stopCellExecution: store.stopCellExecution,
    isCellExecuting: store.isCellExecuting
  };
};