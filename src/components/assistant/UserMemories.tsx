import { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@ui/button';
import { Textarea } from '@ui/textarea';

export interface UserMemory {
  id: string;
  memory_key: string;
  memory_value: string;
  created_at: string;
  updated_at: string;
}

interface UserMemoriesProps {
  memories: UserMemory[];
  onAddMemory: (text: string) => Promise<void>;
  onUpdateMemory: (id: string, text: string) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
  interests?: string[];
  loading?: boolean;
}

export function UserMemories({
  memories,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
  interests = [],
  loading = false
}: UserMemoriesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMemories, setShowMemories] = useState(false);

  const handleAdd = async () => {
    if (!newText.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddMemory(newText.trim());
      setNewText('');
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding memory:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editText.trim()) return;

    setIsSubmitting(true);
    try {
      await onUpdateMemory(id, editText.trim());
      setEditingId(null);
      setEditText('');
    } catch (error) {
      console.error('Error updating memory:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (memory: UserMemory) => {
    setEditingId(memory.id);
    setEditText(memory.memory_value);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setNewText('');
  };

  const handleToggleMemories = () => {
    setShowMemories((prev) => {
      const nextValue = !prev;
      if (!nextValue) {
        cancelAdding();
        cancelEditing();
      }
      return nextValue;
    });
  };

  const hasMemories = interests.length > 0 || memories.length > 0;
  const interestSummary = interests.join(', ');

  return (
    <div className="px-3 py-3 border-b border-slate-200 bg-slate-50/80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Glidey's Memory
        </h3>
        <div className="flex items-center gap-1">
          <Button
            onClick={handleToggleMemories}
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100"
          >
            {showMemories ? (
              <>
                <EyeOff className="w-3 h-3 mr-1" />
                Hide
              </>
            ) : (
              <>
                <Eye className="w-3 h-3 mr-1" />
                View
              </>
            )}
          </Button>
          {!isAdding && showMemories && (
            <Button
              onClick={() => setIsAdding(true)}
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-sky-600 hover:text-sky-700 hover:bg-sky-50"
            >
              <Plus className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {showMemories && (
        <>
          {/* Add Memory Form */}
          {isAdding && (
            <div className="mb-3 p-3 bg-white border border-slate-200 rounded-lg space-y-2">
              <Textarea
                placeholder="e.g., My name is John, I work as a software engineer"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                maxLength={2000}
                rows={3}
                className="text-sm resize-none"
                disabled={isSubmitting}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleAdd}
                  size="sm"
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white"
                  disabled={!newText.trim() || isSubmitting}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Save
                </Button>
                <Button
                  onClick={cancelAdding}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Memories List */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-4 text-slate-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
              </div>
            ) : !hasMemories ? (
              <div className="text-center py-4">
                <p className="text-xs text-slate-500">No memories yet</p>
                <p className="text-xs text-slate-400 mt-1">Add what you'd like me to remember</p>
              </div>
            ) : (
              <>
                {interests.length > 0 && (
                  <div className="p-2 bg-white border border-slate-200 rounded-lg">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                      Saved Interests
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed break-words">
                      {interestSummary}
                    </p>
                  </div>
                )}
                {memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="group p-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                  >
                    {editingId === memory.id ? (
                      // Edit Mode
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          maxLength={2000}
                          rows={3}
                          className="text-sm resize-none"
                          disabled={isSubmitting}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEdit(memory.id)}
                            size="sm"
                            className="flex-1 bg-sky-600 hover:bg-sky-700 text-white"
                            disabled={!editText.trim() || isSubmitting}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            onClick={cancelEditing}
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            disabled={isSubmitting}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Display Mode
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700 break-words leading-relaxed">
                              {memory.memory_value}
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditing(memory)}
                              className="p-1 hover:bg-slate-100 rounded"
                              aria-label="Edit memory"
                            >
                              <Edit2 className="w-3 h-3 text-slate-600" />
                            </button>
                            <button
                              onClick={() => onDeleteMemory(memory.id)}
                              className="p-1 hover:bg-red-100 rounded"
                              aria-label="Delete memory"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          <p className="text-[11px] text-slate-600 mt-2">
            I'll remember this across all conversations
          </p>
        </>
      )}
    </div>
  );
}
