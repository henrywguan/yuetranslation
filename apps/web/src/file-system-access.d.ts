/** File System Access API — not fully in our DOM lib yet (Chromium folder picker). */
interface Window {
  showDirectoryPicker?: (options?: {
    id?: string
    mode?: 'read' | 'readwrite'
    startIn?: FileSystemHandle | string
  }) => Promise<FileSystemDirectoryHandle>
}
