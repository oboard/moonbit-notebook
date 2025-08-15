import * as Toolbar from '@radix-ui/react-toolbar';
import { Button } from '@radix-ui/themes';
import { FileIcon, FolderOpenIcon, SaveIcon, CopyIcon, PlusIcon } from 'lucide-react';

interface NotebookToolbarProps {
  currentFilePath: string | null;
  canSave: boolean;
  onNewNotebook: () => void;
  onOpenNotebook: () => void;
  onSaveNotebook: () => void;
  onSaveAsNotebook: () => void;
  onAddCell: (type: 'code' | 'markdown') => void;
  onRunAll: () => void;
}

export function NotebookToolbar({
  canSave,
  currentFilePath,
  onNewNotebook,
  onOpenNotebook,
  onSaveNotebook,
  onSaveAsNotebook,
  onAddCell,
  onRunAll
}: NotebookToolbarProps) {
  return (
    <Toolbar.Root className="bg-base-100 border-b px-6 py-3 flex items-center justify-between shadow-sm">
      {/* Left file operations */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onNewNotebook}
          variant="ghost"
          size="2"
          title="New Notebook"
        >
          <FileIcon className="w-4 h-4" />
          New
        </Button>

        <Toolbar.Separator className="w-px h-6 bg-border-primary" />

        <Button
          onClick={onOpenNotebook}
          variant="ghost"
          size="2"
          title="Open File"
        >
          <FolderOpenIcon className="w-4 h-4" />
          Open
        </Button>

        <Button
          onClick={onSaveNotebook}
          variant="ghost"
          size="2"
          disabled={!canSave}
          title="Save"
        >
          <SaveIcon className="w-4 h-4" />
          Save
        </Button>

        <Button
          onClick={onSaveAsNotebook}
          variant="ghost"
          size="2"
          title="Save As"
        >
          <CopyIcon className="w-4 h-4" />
          Save As
        </Button>
      </div>

      {/* Center filename display */}
      <div className="flex-1 text-center">
        <span className="text-sm font-medium text-secondary bg-base-100 px-3 py-1 rounded-md border">
          {currentFilePath || 'Untitled.ipynb'}
        </span>
      </div>

      {/* Right execution controls */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onRunAll}
          variant="ghost"
          size="2"
          title="Run All Cells"
        >
          Run All
        </Button>
      </div>
    </Toolbar.Root>
  );
}