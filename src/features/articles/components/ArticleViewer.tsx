import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { Textarea } from '@ui/textarea'
import { Input } from '@ui/input'
import { useToast } from '@shared/hooks/use-toast'
import {
  SavedArticle,
  updateArticleNotes,
  updateArticleTags,
} from '../services/savedArticlesService'
import { CheckCircle, TrendingUp, Globe, ExternalLink, FileText, Tag, Save, X } from 'lucide-react'
import { ThoughtProvokingQuestions } from './ThoughtProvokingQuestions'

// Component to render text with footnotes as hyperlinks to sources
const TextWithFootnotes: React.FC<{ text: string; sources: any[] }> = ({ text, sources }) => {
  // Split text by footnote pattern and create React elements
  const parts = text.split(/(\[\^\d+\])/g)

  // Debug: Log to see if we're getting sources
  console.log('TextWithFootnotes - sources:', sources, 'text sample:', text.substring(0, 100))

  return (
    <>
      {parts.map((part, index) => {
        // Check if this part is a footnote
        const footnoteMatch = part.match(/\[\^(\d+)\]/)
        if (footnoteMatch) {
          const footnoteNum = parseInt(footnoteMatch[1]) - 1 // Convert to 0-based index
          const source = sources[footnoteNum]

          if (source?.url) {
            // Render as a hyperlink to the source
            return (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:text-teal-800 underline decoration-dotted underline-offset-2 text-xs align-super"
                title={`Source: ${source.outlet}`}
              >
                [{footnoteMatch[1]}]
              </a>
            )
          } else {
            // No URL available, render as plain superscript
            return (
              <sup key={index} className="text-gray-500">
                [{footnoteMatch[1]}]
              </sup>
            )
          }
        }
        // Render as regular text
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

interface ArticleViewerProps {
  article: SavedArticle
  onUpdateNotes?: (notes: string) => void
  onUpdateTags?: (tags: string[]) => void
  showEditableFields?: boolean
}

export const ArticleViewer: React.FC<ArticleViewerProps> = ({
  article,
  onUpdateNotes,
  onUpdateTags,
  showEditableFields = true,
}) => {
  const { toast } = useToast()
  const [selectedReadingLevel, setSelectedReadingLevel] = useState<'base' | 'eli5' | 'phd'>('base')
  const [notes, setNotes] = useState(article.notes || '')
  const [tags, setTags] = useState<string[]>(article.tags || [])
  const [newTag, setNewTag] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [editingTags, setEditingTags] = useState(false)

  const newsData = article.article_data

  const handleSaveNotes = async () => {
    const success = await updateArticleNotes(article.id, notes)
    if (success) {
      onUpdateNotes?.(notes)
      setEditingNotes(false)
      toast({
        title: 'Notes Updated',
        description: 'Your notes have been saved successfully.',
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update notes. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()]
      setTags(updatedTags)
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove)
    setTags(updatedTags)
  }

  const handleSaveTags = async () => {
    const success = await updateArticleTags(article.id, tags)
    if (success) {
      onUpdateTags?.(tags)
      setEditingTags(false)
      toast({
        title: 'Tags Updated',
        description: 'Your tags have been saved successfully.',
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update tags. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      {/* Main Content Column (70%) */}
      <div className="flex-1 space-y-6">
        {/* Always show headline */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl">
              {newsData.headline}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Metadata section - Only show if metadata exists (for backward compatibility with old articles) */}
        {(newsData.confidenceLevel || newsData.topicHottness || newsData.summaryPoints) && (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          {(newsData.confidenceLevel || newsData.topicHottness) && (
            <CardHeader className="pb-4">
              <div className="flex gap-2">
                {newsData.confidenceLevel && (
                  <Badge variant={newsData.confidenceLevel === 'High' ? 'default' : 'secondary'}>
                    {newsData.confidenceLevel} Confidence
                  </Badge>
                )}
                {newsData.topicHottness && (
                  <Badge
                    variant={newsData.topicHottness === 'High' ? 'destructive' : 'outline'}
                    className="flex items-center gap-1"
                  >
                    <TrendingUp className="h-3 w-3" />
                    {newsData.topicHottness} Interest
                  </Badge>
                )}
              </div>
            </CardHeader>
          )}
          {newsData.summaryPoints && (
            <CardContent>
              <div className="space-y-2">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Key Points
                </h3>
                <ul className="space-y-2">
                  {newsData.summaryPoints.map((point, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Article Content */}
      <Tabs
        value={selectedReadingLevel}
        onValueChange={(value) => setSelectedReadingLevel(value as 'base' | 'eli5' | 'phd')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 bg-white/60 backdrop-blur-sm">
          <TabsTrigger value="base">📰 Essentials</TabsTrigger>
          <TabsTrigger value="eli5" className="flex items-center gap-2">
            <img src="/images/child-eli5.svg" alt="Child" className="h-4 w-4" />
            ELI5
          </TabsTrigger>
          <TabsTrigger
            value="phd"
            disabled={!newsData.article.phd}
            className={!newsData.article.phd ? 'opacity-50 cursor-not-allowed' : ''}
          >
            🔬 PhD {!newsData.article.phd && '(Not available)'}
          </TabsTrigger>
        </TabsList>
        {Object.entries(newsData.article).map(
          ([level, content]) =>
            content && (
              <TabsContent key={level} value={level} className="mt-4">
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardContent className="pt-6 max-w-4xl mx-auto">
                    <div className="prose prose-lg max-w-none">
                      {content.split('\n\n').map((paragraph: string, idx: number) => (
                        <p key={idx} className="mb-4 leading-relaxed text-gray-800">
                          <TextWithFootnotes text={paragraph} sources={newsData.sources} />
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )
        )}
      </Tabs>

      {/* Notes Section */}
      {showEditableFields && (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Your Notes
              </span>
              {!editingNotes && (
                <Button variant="outline" size="sm" onClick={() => setEditingNotes(true)}>
                  Edit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingNotes ? (
              <div className="space-y-3">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your notes about this article..."
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveNotes} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Notes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingNotes(false)
                      setNotes(article.notes || '')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-gray-600">
                {notes || (
                  <span className="italic text-gray-400">
                    No notes added yet. Click Edit to add your thoughts.
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tags Section */}
      {showEditableFields && (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags
              </span>
              {!editingTags && (
                <Button variant="outline" size="sm" onClick={() => setEditingTags(true)}>
                  Edit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingTags ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button onClick={handleAddTag} size="sm">
                    Add
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveTags} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Tags
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTags(false)
                      setTags(article.tags || [])
                      setNewTag('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.length > 0 ? (
                  tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="italic text-gray-400">
                    No tags added yet. Click Edit to organize this article.
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sources Section */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Sources ({newsData.sources.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {newsData.sources.map((source) => (
              <div key={source.id} className="border rounded-lg p-4 bg-white/50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-teal-700">{source.outlet}</h4>
                  <Badge variant="outline">{source.type}</Badge>
                </div>
                <p className="text-sm font-medium mb-1">{source.headline}</p>
                <p className="text-xs text-gray-600 mb-2">{source.analysisNote}</p>
                <p className="text-xs text-gray-500 mb-2">
                  Published: {new Date(source.publishedAt).toLocaleString()}
                </p>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal-600 hover:text-teal-800 underline flex items-center gap-1"
                  >
                    Read original article <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Questions Sidebar Column (30%) */}
      {newsData.keyQuestions && newsData.keyQuestions.length > 0 && (
        <div className="lg:w-[380px] lg:flex-shrink-0">
          <ThoughtProvokingQuestions questions={newsData.keyQuestions} />
        </div>
      )}
    </div>
  )
}
