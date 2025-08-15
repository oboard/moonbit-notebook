// 文件操作服务 - Chrome File Access API
// "Theory and practice sometimes clash. Theory loses." - Linus

import type { Notebook } from '../types/notebook';

// 检查浏览器支持
const isFileAccessSupported = () => {
  return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
};

// 文件类型定义
const NOTEBOOK_FILE_TYPES = [
  {
    description: 'Jupyter Notebook files',
    accept: {
      'application/json': ['.ipynb']
    }
  }
];

const MOONBIT_FILE_TYPES = [
  {
    description: 'MoonBit files',
    accept: {
      'text/plain': ['.mbt']
    }
  }
];

// 文件服务类
export class FileService {
  private currentFileHandle: FileSystemFileHandle | null = null;
  
  // 打开notebook文件
  async openNotebook(): Promise<{ notebook: Notebook; filePath: string } | null> {
    if (!isFileAccessSupported()) {
      throw new Error('File Access API not supported in this browser');
    }
    
    try {
      const [fileHandle] = await (window as unknown as {
        showOpenFilePicker: (options: {
          types: { description: string; accept: Record<string, string[]> }[];
          multiple: boolean;
        }) => Promise<FileSystemFileHandle[]>
      }).showOpenFilePicker({
        types: NOTEBOOK_FILE_TYPES,
        multiple: false
      });
      
      this.currentFileHandle = fileHandle;
      const file = await fileHandle.getFile();
      const content = await file.text();
      
      const notebook = JSON.parse(content) as Notebook;
      
      // 验证notebook格式
      if (!this.isValidNotebook(notebook)) {
        throw new Error('Invalid notebook format');
      }
      
      return {
        notebook,
        filePath: fileHandle.name
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null; // 用户取消
      }
      throw error;
    }
  }
  
  // 保存notebook文件
  async saveNotebook(notebook: Notebook, saveAs = false): Promise<string | null> {
    if (!isFileAccessSupported()) {
      throw new Error('File Access API not supported in this browser');
    }
    
    try {
      let fileHandle = this.currentFileHandle;
      
      if (!fileHandle || saveAs) {
        fileHandle = await (window as unknown as {
          showSaveFilePicker: (options: {
            types: { description: string; accept: Record<string, string[]> }[];
            suggestedName: string;
          }) => Promise<FileSystemFileHandle>
        }).showSaveFilePicker({
          types: NOTEBOOK_FILE_TYPES,
          suggestedName: 'untitled.ipynb'
        });
        this.currentFileHandle = fileHandle;
      }
      
      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        const content = JSON.stringify(notebook, null, 2);
        await writable.write(content);
        await writable.close();
        
        return fileHandle.name;
      }
      return null;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null; // 用户取消
      }
      throw error;
    }
  }
  
  // 打开MoonBit源文件
  async openMoonBitFile(): Promise<{ content: string; filePath: string } | null> {
    if (!isFileAccessSupported()) {
      throw new Error('File Access API not supported in this browser');
    }
    
    try {
      const [fileHandle] = await (window as unknown as {
        showOpenFilePicker: (options: {
          types: { description: string; accept: Record<string, string[]> }[];
          multiple: boolean;
        }) => Promise<FileSystemFileHandle[]>
      }).showOpenFilePicker({
        types: MOONBIT_FILE_TYPES,
        multiple: false
      });
      
      const file = await fileHandle.getFile();
      const content = await file.text();
      
      return {
        content,
        filePath: fileHandle.name
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }
  
  // 验证notebook格式
  private isValidNotebook(data: unknown): data is Notebook {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    
    const obj = data as Record<string, unknown>;
    return (
      typeof obj.nbformat === 'number' &&
      typeof obj.nbformat_minor === 'number' &&
      Array.isArray(obj.cells) &&
      typeof obj.metadata === 'object' &&
      obj.metadata !== null
    );
  }
  
  // 获取当前文件名
  getCurrentFileName(): string | null {
    return this.currentFileHandle?.name || null;
  }
  
  // 清除当前文件引用（新建文件时）
  clearCurrentFile(): void {
    this.currentFileHandle = null;
  }
  
  // 检查是否有当前文件
  hasCurrentFile(): boolean {
    return this.currentFileHandle !== null;
  }
}

// 导出单例
export const fileService = new FileService();
export default FileService;

// 导出工具函数
export { isFileAccessSupported };

// 错误类型
export class FileAccessError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'FileAccessError';
  }
}

// 包装错误处理
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw error; // 重新抛出用户取消错误
    }
    throw new FileAccessError(
      `${errorMessage}: ${(error as Error).message}`,
      'OPERATION_FAILED'
    );
  }
};