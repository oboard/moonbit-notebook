// Notebook数据结构定义 - 兼容ipynb格式
// "Good programmers worry about data structures" - Linus

// ExecuteTime metadata interface for Jupyter compatibility
export interface ExecuteTime {
  start_time: string; // ISO8601 format
  end_time: string;   // ISO8601 format
}

export interface NotebookCell {
  id: string;
  cell_type: 'code' | 'markdown';
  source: string[];
  metadata: {
    ExecuteTime?: ExecuteTime;
    [key: string]: unknown;
  };
  execution_count: number | null;
  outputs?: CellOutput[];
}

export interface CellOutput {
  output_type: 'execute_result' | 'display_data' | 'stream' | 'error';
  data?: Record<string, unknown>;
  text?: string[];
  execution_count?: number;
  metadata?: Record<string, unknown>;
  name?: string; // for stream output
  ename?: string; // for error output
  evalue?: string; // for error output
  traceback?: string[]; // for error output
}

export interface NotebookMetadata {
  kernelspec: {
    display_name: string;
    language: string;
    name: string;
  };
  language_info: {
    name: string;
    version: string;
    mimetype: string;
    file_extension: string;
  };
}

export interface Notebook {
  nbformat: number;
  nbformat_minor: number;
  metadata: NotebookMetadata;
  cells: NotebookCell[];
}

// 简化的内部状态管理
export interface NotebookState {
  notebook: Notebook;
  activeCell: string | null;
  executionCount: number;
  isDirty: boolean;
  filePath: string | null;
  executingCells: Set<string>; // 正在执行的cell ID集合
}

// Cell操作类型
export type CellOperation = 
  | { type: 'ADD_CELL'; cellType: 'code' | 'markdown'; index?: number }
  | { type: 'DELETE_CELL'; cellId: string }
  | { type: 'MOVE_CELL'; cellId: string; newIndex: number }
  | { type: 'UPDATE_CELL'; cellId: string; source: string[] }
  | { type: 'UPDATE_CELL_METADATA'; cellId: string; metadata: Record<string, unknown> }
  | { type: 'EXECUTE_CELL'; cellId: string }
  | { type: 'START_CELL_EXECUTION'; cellId: string }
  | { type: 'STOP_CELL_EXECUTION'; cellId: string }
  | { type: 'SET_ACTIVE_CELL'; cellId: string | null };

// 默认的notebook模板
export const createEmptyNotebook = (): Notebook => ({
  nbformat: 4,
  nbformat_minor: 4,
  metadata: {
    kernelspec: {
      display_name: 'MoonBit',
      language: 'moonbit',
      name: 'moonbit'
    },
    language_info: {
      name: 'moonbit',
      version: '0.1.0',
      mimetype: 'text/x-moonbit',
      file_extension: '.mbt'
    }
  },
  cells: [{
    id: crypto.randomUUID(),
    cell_type: 'code',
    source: [''],
    metadata: {},
    execution_count: null,
    outputs: []
  }]
});

// 生成新cell
export const createCell = (type: 'code' | 'markdown'): NotebookCell => ({
  id: crypto.randomUUID(),
  cell_type: type,
  source: [''],
  metadata: {},
  execution_count: type === 'code' ? null : null,
  outputs: type === 'code' ? [] : undefined
});