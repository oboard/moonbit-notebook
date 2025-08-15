import * as Toolbar from '@radix-ui/react-toolbar';
import { Button } from '@radix-ui/themes';
import { FileIcon, FolderOpenIcon, SaveIcon, CopyIcon, PlusIcon } from 'lucide-react';

interface ToolbarProps {
  canSave: boolean;
  currentFilePath: string | null;
  onNewNotebook: () => void;
  onOpenNotebook: () => void;
  onSaveNotebook: () => void;
  onSaveAsNotebook: () => void;
  onAddCell: (type: 'code' | 'markdown') => void;
}

export function NotebookToolbar({
  canSave,
  currentFilePath,
  onNewNotebook,
  onOpenNotebook,
  onSaveNotebook,
  onSaveAsNotebook,
  onAddCell
}: ToolbarProps) {
  return (
    <Toolbar.Root className="bg-base-100 border-b px-6 py-3 flex items-center justify-between shadow-sm">
      {/* 左侧文件操作 */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onNewNotebook}
          variant="ghost"
          size="2"
          title="新建 Notebook"
        >
          <FileIcon className="w-4 h-4" />
          新建
        </Button>

        <Toolbar.Separator className="w-px h-6 bg-border-primary" />

        <Button
          onClick={onOpenNotebook}
          variant="ghost"
          size="2"
          title="打开文件"
        >
          <FolderOpenIcon className="w-4 h-4" />
          打开
        </Button>

        <Button
          onClick={onSaveNotebook}
          variant="ghost"
          size="2"
          disabled={!canSave}
          title="保存"
        >
          <SaveIcon className="w-4 h-4" />
          保存
        </Button>

        <Button
          onClick={onSaveAsNotebook}
          variant="ghost"
          size="2"
          title="另存为"
        >
          <CopyIcon className="w-4 h-4" />
          另存为
        </Button>
      </div>

      {/* 中间文件名显示 */}
      <div className="flex-1 text-center">
        <span className="text-sm font-medium text-secondary bg-base-100 px-3 py-1 rounded-md border">
          {currentFilePath || 'Untitled.ipynb'}
        </span>
      </div>
    </Toolbar.Root>
  );
}