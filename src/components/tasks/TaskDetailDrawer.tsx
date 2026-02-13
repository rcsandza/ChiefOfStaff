import React, { useState, useEffect, useRef } from 'react';
import { Task, Project, Attachment } from '@/utils/types';
import { fetchAttachments, updateTask, uploadAttachment, deleteAttachment } from '@/utils/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Paperclip, Trash2, Upload, Download, Save, Bold, Italic, List, ListOrdered, Code, Link as LinkIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';

interface TaskDetailDrawerProps {
  task: Task | null;
  projects: Project[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

export function TaskDetailDrawer({ task, projects, isOpen, onClose, onUpdate, onDelete }: TaskDetailDrawerProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [originalTask, setOriginalTask] = useState<Task | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (task) {
      setEditedTask({ ...task });
      setOriginalTask({ ...task });
      loadAttachments();
    }
  }, [task]);
  
  const loadAttachments = async () => {
    if (!task) return;
    try {
      const atts = await fetchAttachments(task.id);
      setAttachments(atts);
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };
  
  const hasUnsavedChanges = (): boolean => {
    if (!editedTask || !originalTask) return false;
    
    // Compare relevant fields
    return (
      editedTask.title !== originalTask.title ||
      editedTask.description !== originalTask.description ||
      editedTask.group !== originalTask.group ||
      editedTask.project_id !== originalTask.project_id ||
      editedTask.priority !== originalTask.priority ||
      editedTask.status !== originalTask.status ||
      editedTask.due_date !== originalTask.due_date
    );
  };
  
  const handleUpdate = (field: keyof Task, value: any) => {
    if (!editedTask) return;
    const updated = { ...editedTask, [field]: value };
    setEditedTask(updated);
  };
  
  const insertMarkdown = (syntax: string, placeholder: string = '') => {
    if (!textareaRef.current || !editedTask) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editedTask.description.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    let newText = '';
    let cursorOffset = 0;
    
    switch (syntax) {
      case 'bold':
        newText = editedTask.description.substring(0, start) + `**${textToInsert}**` + editedTask.description.substring(end);
        cursorOffset = start + 2 + textToInsert.length;
        break;
      case 'italic':
        newText = editedTask.description.substring(0, start) + `*${textToInsert}*` + editedTask.description.substring(end);
        cursorOffset = start + 1 + textToInsert.length;
        break;
      case 'list':
        const listText = textToInsert || 'List item';
        newText = editedTask.description.substring(0, start) + `\n- ${listText}` + editedTask.description.substring(end);
        cursorOffset = start + 3 + listText.length;
        break;
      case 'numbered':
        const numberedText = textToInsert || 'List item';
        newText = editedTask.description.substring(0, start) + `\n1. ${numberedText}` + editedTask.description.substring(end);
        cursorOffset = start + 4 + numberedText.length;
        break;
      case 'code':
        newText = editedTask.description.substring(0, start) + `\`${textToInsert}\`` + editedTask.description.substring(end);
        cursorOffset = start + 1 + textToInsert.length;
        break;
    }
    
    handleUpdate('description', newText);
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorOffset, cursorOffset);
    }, 0);
  };
  
  const handleOpenLinkDialog = () => {
    if (!textareaRef.current || !editedTask) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editedTask.description.substring(start, end);
    
    // Pre-fill with selected text if any
    setLinkText(selectedText || '');
    setLinkUrl('');
    setShowLinkDialog(true);
  };
  
  const handleInsertLink = () => {
    if (!textareaRef.current || !editedTask || !linkText.trim() || !linkUrl.trim()) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Ensure URL has protocol
    let formattedUrl = linkUrl.trim();
    if (!formattedUrl.match(/^https?:\/\//i)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    
    // Format: [Link Text](URL)
    const linkMarkdown = `[${linkText.trim()}](${formattedUrl})`;
    const newText = editedTask.description.substring(0, start) + linkMarkdown + editedTask.description.substring(end);
    
    handleUpdate('description', newText);
    
    // Reset dialog
    setLinkText('');
    setLinkUrl('');
    setShowLinkDialog(false);
    
    // Restore focus and set cursor after the inserted link
    setTimeout(() => {
      textarea.focus();
      const cursorPosition = start + linkMarkdown.length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  };
  
  const handleSave = async () => {
    if (!editedTask || !originalTask) return;
    
    setIsSaving(true);
    try {
      // Build the updates object with only changed fields
      const updates: Partial<Task> = {};
      
      if (editedTask.title !== originalTask.title) updates.title = editedTask.title;
      if (editedTask.description !== originalTask.description) updates.description = editedTask.description;
      if (editedTask.group !== originalTask.group) updates.group = editedTask.group;
      if (editedTask.project_id !== originalTask.project_id) updates.project_id = editedTask.project_id;
      if (editedTask.priority !== originalTask.priority) updates.priority = editedTask.priority;
      if (editedTask.status !== originalTask.status) updates.status = editedTask.status;
      if (editedTask.due_date !== originalTask.due_date) updates.due_date = editedTask.due_date;
      
      // Save to server
      await onUpdate(editedTask.id, updates);
      
      // Update original task to reflect saved state
      setOriginalTask({ ...editedTask });
      
      console.log('✅ Task saved successfully');
      
      // Close the drawer after successful save
      onClose();
    } catch (error) {
      console.error('❌ Error saving task:', error);
      alert('Failed to save task. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task || !e.target.files?.[0]) return;
    
    setIsUploading(true);
    try {
      const file = e.target.files[0];
      const newAttachment = await uploadAttachment(task.id, file);
      setAttachments([...attachments, newAttachment]);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleDeleteAttachment = async (id: string) => {
    try {
      await deleteAttachment(id);
      setAttachments(attachments.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };
  
  const handleDelete = () => {
    if (task && confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
      onClose();
    }
  };
  
  const handleCloseAttempt = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedWarning(true);
      setPendingClose(true);
    } else {
      onClose();
    }
  };
  
  const handleDiscardChanges = () => {
    setShowUnsavedWarning(false);
    setPendingClose(false);
    onClose();
  };
  
  const handleCancelClose = () => {
    setShowUnsavedWarning(false);
    setPendingClose(false);
  };
  
  if (!editedTask) return null;
  
  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseAttempt();
        }
      }}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col">
          <SheetHeader className="px-4 flex-shrink-0">
            <SheetTitle>Task Details</SheetTitle>
            <SheetDescription className="sr-only">
              Edit task information and settings
            </SheetDescription>
          </SheetHeader>
          
          <div className={`flex-1 overflow-y-auto space-y-6 mt-4 px-4 ${hasUnsavedChanges() ? 'pb-20' : 'pb-0'}`}>
            {/* Title */}
            <div>
              <Label>Title</Label>
              <Input
                value={editedTask.title}
                onChange={(e) => handleUpdate('title', e.target.value)}
                className="mt-2"
                style={{ borderRadius: 'var(--radius-input)' }}
              />
            </div>
            
            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Description / Notes</Label>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="h-auto px-2 py-1 caption"
                  >
                    {showPreview ? 'Edit' : 'Preview'}
                  </Button>
                </div>
              </div>
              
              {!showPreview ? (
                <>
                  {/* Markdown toolbar */}
                  <div className="flex items-center gap-1 mb-2 p-2 bg-muted border border-border" style={{ borderRadius: 'var(--radius)' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertMarkdown('bold', 'bold text')}
                      className="h-auto p-1"
                      title="Bold"
                    >
                      <Bold className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertMarkdown('italic', 'italic text')}
                      className="h-auto p-1"
                      title="Italic"
                    >
                      <Italic className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleOpenLinkDialog}
                      className="h-auto p-1"
                      title="Insert Link"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertMarkdown('list', 'list item')}
                      className="h-auto p-1"
                      title="Bulleted List"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertMarkdown('numbered', 'list item')}
                      className="h-auto p-1"
                      title="Numbered List"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => insertMarkdown('code', 'code')}
                      className="h-auto p-1"
                      title="Code"
                    >
                      <Code className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Textarea
                    ref={textareaRef}
                    value={editedTask.description}
                    onChange={(e) => handleUpdate('description', e.target.value)}
                    className="font-mono"
                    rows={8}
                    placeholder="Use markdown formatting: **bold**, *italic*, - lists, etc."
                    style={{ borderRadius: 'var(--radius-input)', fontSize: 'var(--text-sm)' }}
                  />
                </>
              ) : (
                <div 
                  className="p-3 border border-border bg-muted prose prose-sm max-w-none min-h-[200px]"
                  style={{ borderRadius: 'var(--radius-input)' }}
                >
                  {editedTask.description ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkBreaks]}
                      components={{
                        a: ({ node, ...props }) => (
                          <a
                            {...props}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        ),
                      }}
                    >
                      {editedTask.description}
                    </ReactMarkdown>
                  ) : (
                    <span className="text-muted-foreground caption">No description</span>
                  )}
                </div>
              )}
            </div>
            
            {/* Group */}
            <div>
              <Label>Group</Label>
              <Select
                value={editedTask.group}
                onValueChange={(value) => handleUpdate('group', value)}
              >
                <SelectTrigger className="mt-2" style={{ borderRadius: 'var(--radius-input)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Project */}
            <div>
              <Label>Project / Theme</Label>
              <Select
                value={editedTask.project_id || 'none'}
                onValueChange={(value) => handleUpdate('project_id', value === 'none' ? null : value)}
              >
                <SelectTrigger className="mt-2" style={{ borderRadius: 'var(--radius-input)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Priority */}
            <div>
              <Label>Priority</Label>
              <Select
                value={editedTask.priority?.toString() || 'none'}
                onValueChange={(value) => handleUpdate('priority', value === 'none' ? null : parseInt(value))}
              >
                <SelectTrigger className="mt-2" style={{ borderRadius: 'var(--radius-input)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="1">1 - Highest</SelectItem>
                  <SelectItem value="2">2 - High</SelectItem>
                  <SelectItem value="3">3 - Medium</SelectItem>
                  <SelectItem value="4">4 - Low</SelectItem>
                  <SelectItem value="5">5 - Lowest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Status */}
            <div>
              <Label>Status</Label>
              <Select
                value={editedTask.status}
                onValueChange={(value) => handleUpdate('status', value)}
              >
                <SelectTrigger className="mt-2" style={{ borderRadius: 'var(--radius-input)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Due Date */}
            <div>
              <Label>Due Date</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  type="date"
                  value={editedTask.due_date || ''}
                  onChange={(e) => handleUpdate('due_date', e.target.value || null)}
                  className="flex-1"
                  style={{ borderRadius: 'var(--radius-input)' }}
                />
                {editedTask.due_date && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdate('due_date', null)}
                    style={{ borderRadius: 'var(--radius-button)' }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            
            {/* Attachments */}
            <div>
              <Label>Attachments</Label>
              <div className="mt-2 space-y-2">
                {attachments.map(attachment => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-muted border border-border"
                    style={{ borderRadius: 'var(--radius)' }}
                  >
                    {attachment.signed_url ? (
                      <a
                        href={attachment.signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-70 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate caption text-primary">{attachment.file_name}</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate caption">{attachment.file_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {attachment.signed_url && (
                        <a
                          href={attachment.signed_url}
                          download={attachment.file_name}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAttachment(attachment.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <label>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isUploading}
                    onClick={(e) => {
                      e.preventDefault();
                      (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                    }}
                    style={{ borderRadius: 'var(--radius-button)' }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload File'}
                  </Button>
                </label>
              </div>
            </div>
            
            {/* Timestamps */}
            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex justify-between caption text-muted-foreground">
                <span>Created:</span>
                <span>{new Date(editedTask.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between caption text-muted-foreground">
                <span>Updated:</span>
                <span>{new Date(editedTask.updated_at).toLocaleString()}</span>
              </div>
            </div>
            
            {/* Delete Button */}
            <Button
              variant="destructive"
              className="w-full mb-8"
              onClick={handleDelete}
              style={{ borderRadius: 'var(--radius-button)' }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Task
            </Button>
          </div>
          
          {/* Save Button - Fixed to bottom */}
          {hasUnsavedChanges() && (
            <div className="flex-shrink-0 bg-card border-t border-border px-4 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full"
                style={{ borderRadius: 'var(--radius-button)' }}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
      
      {/* Unsaved Changes Warning */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardChanges}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Link Insertion Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>
              Add a hyperlink with descriptive text and URL
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="link-text">Link Text</Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Click here"
                className="mt-2"
                style={{ borderRadius: 'var(--radius-input)' }}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="example.com or https://example.com"
                className="mt-2"
                style={{ borderRadius: 'var(--radius-input)' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && linkText.trim() && linkUrl.trim()) {
                    handleInsertLink();
                  }
                }}
              />
              <p className="caption text-muted-foreground mt-1">
                Tip: Paste a URL and it will automatically format with https://
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLinkText('');
                setLinkUrl('');
                setShowLinkDialog(false);
              }}
              style={{ borderRadius: 'var(--radius-button)' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInsertLink}
              disabled={!linkText.trim() || !linkUrl.trim()}
              style={{ borderRadius: 'var(--radius-button)' }}
            >
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
