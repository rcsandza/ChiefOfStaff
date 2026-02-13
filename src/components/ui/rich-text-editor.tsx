import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Input } from './input';
import { Label } from './label';
import { Bold, Italic, List, ListOrdered, Code, Link as LinkIcon } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  showToolbar?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  className = '',
  minHeight = '150px',
  showToolbar = true,
}: RichTextEditorProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const lastContentRef = useRef(content);
  const isInternalUpdateRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      isInternalUpdateRef.current = true;
      const markdown = editor.storage.markdown.getMarkdown();
      lastContentRef.current = markdown;
      onChange(markdown);
      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 0);
    },
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-sm max-w-none focus:outline-none',
      },
    },
  });

  // Sync content from parent (only for external changes)
  useEffect(() => {
    if (editor && !isInternalUpdateRef.current && content !== lastContentRef.current) {
      lastContentRef.current = content;
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const handleOpenLinkDialog = () => {
    if (!editor) return;

    // Get selected text if any
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    if (selectedText) {
      setLinkText(selectedText);
    } else {
      setLinkText('');
    }

    // Check if cursor is on an existing link
    const attrs = editor.getAttributes('link');
    if (attrs.href) {
      setLinkUrl(attrs.href);
    } else {
      setLinkUrl('');
    }

    setShowLinkDialog(true);
  };

  const handleInsertLink = () => {
    if (!editor || !linkText.trim() || !linkUrl.trim()) return;

    // Normalize URL
    let normalizedUrl = linkUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // If there's selected text, update it with the link
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    if (selectedText) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: normalizedUrl })
        .run();
    } else {
      // Insert new link text
      editor
        .chain()
        .focus()
        .insertContent(`[${linkText}](${normalizedUrl})`)
        .run();
    }

    setLinkText('');
    setLinkUrl('');
    setShowLinkDialog(false);
  };

  if (!editor) {
    return null;
  }

  return (
    <>
      <div className={`border border-input bg-input-background rounded-[var(--radius-input)] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${className}`}>
        {showToolbar && (
          <div className="flex items-center gap-1 p-2 border-b border-border bg-muted">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`h-auto p-1 ${editor.isActive('bold') ? 'bg-accent' : ''}`}
              title="Bold (Cmd+B)"
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`h-auto p-1 ${editor.isActive('italic') ? 'bg-accent' : ''}`}
              title="Italic (Cmd+I)"
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenLinkDialog}
              className={`h-auto p-1 ${editor.isActive('link') ? 'bg-accent' : ''}`}
              title="Insert Link"
            >
              <LinkIcon className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`h-auto p-1 ${editor.isActive('bulletList') ? 'bg-accent' : ''}`}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`h-auto p-1 ${editor.isActive('orderedList') ? 'bg-accent' : ''}`}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`h-auto p-1 ${editor.isActive('code') ? 'bg-accent' : ''}`}
              title="Code (Cmd+E)"
            >
              <Code className="w-4 h-4" />
            </Button>
          </div>
        )}
        <div
          style={{ minHeight, '--editor-min-height': minHeight, cursor: 'text', display: 'flex', flexDirection: 'column' } as React.CSSProperties}
          onClick={(e) => {
            const target = e.target as Node;
            if (target.nodeType === Node.TEXT_NODE) return;
            const el = target as HTMLElement;
            const isContentClick = el.closest('.ProseMirror') && !el.classList.contains('ProseMirror');
            if (!isContentClick) {
              editor.commands.focus('end');
            }
          }}
        >
          <EditorContent editor={editor} className="flex-1 flex flex-col" />
        </div>
      </div>

      {/* Link Dialog */}
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
             
            >
              Cancel
            </Button>
            <Button
              onClick={handleInsertLink}
              disabled={!linkText.trim() || !linkUrl.trim()}
             
            >
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
