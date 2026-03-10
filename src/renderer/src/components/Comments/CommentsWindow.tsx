import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import type { Comment } from '../../../../../shared/types'

function linkify(text: string): string {
  // Convert [label](url) markdown links
  let result = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" class="text-[var(--color-accent)] underline hover:opacity-80">$1</a>'
  )
  // Auto-detect raw URLs
  result = result.replace(
    /(?<!\"|href=")(?<!\])\b(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener" class="text-[var(--color-accent)] underline hover:opacity-80">$1</a>'
  )
  return result
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function CommentNode({
  comment,
  replies,
  onReply,
  onEdit,
  onDelete,
  depth = 0
}: {
  comment: Comment
  replies: Comment[]
  onReply: (parentId: string) => void
  onEdit: (comment: Comment) => void
  onDelete: (id: string) => void
  depth?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className={depth > 0 ? 'ml-4' : ''}
    >
      <div
        className="group py-2 px-2 rounded-[var(--radius-sm)] transition-default hover:bg-[var(--hover-highlight)]"
      >
        {/* Timestamp */}
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] text-[var(--color-text-ghost)]">
            {formatTime(comment.createdAt)}
            {comment.updatedAt !== comment.createdAt && (
              <span className="ml-1 opacity-60">(edited)</span>
            )}
          </span>
          {/* Hover actions — opacity reveal */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-default">
            {depth === 0 && (
              <button
                className="text-[10px] text-[var(--color-text-ghost)] hover:text-[var(--color-text)] px-2 py-0.5 rounded-[var(--radius-xs)] hover:bg-[var(--hover-highlight)] transition-default"
                onClick={() => onReply(comment.id)}
              >
                Reply
              </button>
            )}
            <button
              className="text-[10px] text-[var(--color-text-ghost)] hover:text-[var(--color-text)] px-2 py-0.5 rounded-[var(--radius-xs)] hover:bg-[var(--hover-highlight)] transition-default"
              onClick={() => onEdit(comment)}
            >
              Edit
            </button>
            <button
              className="text-[10px] text-[var(--color-text-ghost)] hover:text-[var(--color-red)] px-2 py-0.5 rounded-[var(--radius-xs)] hover:bg-[var(--hover-highlight)] transition-default"
              onClick={() => onDelete(comment.id)}
            >
              Delete
            </button>
          </div>
        </div>
        {/* Comment text */}
        <div
          className="text-sm text-[var(--color-text)] leading-relaxed break-words"
          dangerouslySetInnerHTML={{ __html: linkify(comment.text) }}
        />
      </div>

      {/* Render replies */}
      {replies.length > 0 && (
        <div className="border-l border-[var(--color-border)] ml-4">
          {replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              replies={[]}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={1}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

export function CommentsWindow({ itemId }: { itemId: string }) {
  const { items, comments, addComment, editComment, removeComment } = useStore()
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [editing, setEditing] = useState<Comment | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const item = items.find((i) => i.id === itemId)

  // Organize comments into threads
  const { topLevel, repliesByParent } = useMemo(() => {
    const itemComments = comments.filter((c) => c.itemId === itemId)
    const topLevel = itemComments
      .filter((c) => !c.parentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    const repliesByParent: Record<string, Comment[]> = {}
    itemComments
      .filter((c) => c.parentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach((c) => {
        if (c.parentId) {
          if (!repliesByParent[c.parentId]) repliesByParent[c.parentId] = []
          repliesByParent[c.parentId].push(c)
        }
      })
    return { topLevel, repliesByParent }
  }, [comments, itemId])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (editing) {
      setText(editing.text)
      inputRef.current?.focus()
    }
  }, [editing])

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed) return

    if (editing) {
      await editComment(editing.id, trimmed)
      setEditing(null)
    } else {
      await addComment(itemId, trimmed, replyTo)
      setReplyTo(null)
    }
    setText('')
    inputRef.current?.focus()
  }

  const handleReply = (parentId: string) => {
    setReplyTo(parentId)
    setEditing(null)
    setText('')
    inputRef.current?.focus()
  }

  const handleEdit = (comment: Comment) => {
    setEditing(comment)
    setReplyTo(null)
  }

  const handleDelete = async (id: string) => {
    await removeComment(id)
  }

  const handleCancel = () => {
    setReplyTo(null)
    setEditing(null)
    setText('')
  }

  return (
    <div className="flex flex-col h-full glass-surface p-2">
      {/* Title bar */}
      <div className="drag-region flex items-center justify-between px-1 py-2 border-b border-[var(--color-border)]">
        <span className="text-xs text-[var(--color-text-muted)] truncate flex-1">
          Comments on: <span className="text-[var(--color-text)]">{item?.text || 'Unknown item'}</span>
        </span>
        <button
          className="no-drag w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--hover-highlight)] transition-default"
          onClick={() => window.api.closeWindow()}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Comment thread */}
      <div className="flex-1 overflow-y-auto px-1 py-2">
        <AnimatePresence mode="popLayout">
          {topLevel.map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              replies={repliesByParent[comment.id] || []}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </AnimatePresence>
        {topLevel.length === 0 && (
          <div className="flex items-center justify-center h-16 text-[var(--color-text-ghost)] text-xs">
            No comments yet
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-[var(--color-border)] px-1 py-2">
        {(replyTo || editing) && (
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-[var(--color-accent)]">
              {editing ? 'Editing comment' : 'Replying to comment'}
            </span>
            <button
              className="text-[10px] text-[var(--color-text-ghost)] hover:text-[var(--color-text)]"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        )}
        <textarea
          ref={inputRef}
          className="w-full bg-[var(--color-surface)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-ghost)] px-3 py-2 rounded-[var(--radius-md)] outline-none border border-[var(--color-border)] focus:border-[var(--color-accent)] transition-default resize-none"
          placeholder={replyTo ? 'Write a reply...' : 'Add a comment...'}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleSubmit()
            }
            if (e.key === 'Escape') {
              if (replyTo || editing) {
                handleCancel()
              } else {
                window.api.closeWindow()
              }
            }
          }}
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-[var(--color-text-ghost)]">⌘Enter to send</span>
          <span className="text-[10px] text-[var(--color-text-ghost)]">Supports [text](url) links</span>
        </div>
      </div>
    </div>
  )
}
