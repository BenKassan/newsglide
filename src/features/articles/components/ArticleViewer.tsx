import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
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
import { CheckCircle, TrendingUp, Globe, ExternalLink, FileText, Tag, Save, X, Sparkles, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { ThoughtProvokingQuestions } from './ThoughtProvokingQuestions'
import { SourcePerspectives } from './SourcePerspectives'
import { supabase } from '@/integrations/supabase/client'

// Component to render text with citations as professional superscript hyperlinks to sources
const TextWithFootnotes: React.FC<{ text: string; sources: any[] }> = ({ text, sources }) => {
  // Split text by citation pattern [N] and create React elements
  const parts = text.split(/(\[\d+\])/g)

  return (
    <>
      {parts.map((part, index) => {
        // Check if this part is a citation [1], [2], etc.
        const citationMatch = part.match(/\[(\d+)\]/)
        if (citationMatch) {
          const citationNum = parseInt(citationMatch[1]) - 1 // Convert to 0-based index
          const source = sources[citationNum]

          // Validate source index is within bounds
          if (source?.url) {
            // Render as professional superscript hyperlink to the source
            return (
              <sup key={index}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:text-teal-700 hover:underline transition-all duration-200 font-medium no-underline"
                  style={{ fontSize: '0.7em' }}
                  title={`Source: ${source.outlet}`}
                  aria-label={`Citation ${citationMatch[1]}: ${source.outlet}`}
                >
                  {citationMatch[1]}
                </a>
              </sup>
            )
          } else {
            // No URL available or invalid index, render as plain superscript
            return (
              <sup key={index} className="text-gray-400" style={{ fontSize: '0.7em' }}>
                {citationMatch[1]}
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

// Utility function to transform article paragraphs into bullet points
const transformToBulletPoints = (text: string): string[] => {
  const bullets: string[] = []

  // Split text into paragraphs
  const paragraphs = text.split('\n\n').filter(p => p.trim())

  // Conclusion phrases to filter out
  const conclusionPhrases = [
    'in conclusion',
    'to conclude',
    'in summary',
    'to summarize',
    'overall',
    'in closing',
    'finally',
    'to wrap up',
    'all in all',
    'ultimately'
  ]

  for (const paragraph of paragraphs) {
    // Split paragraph into sentences while preserving citations
    // Match sentence endings (. ! ?) followed by space or citation [N] or [^N] then space
    const sentences = paragraph.match(/[^.!?]+(?:\[\^?\d+\])?[.!?]+(?=\s|$)/g) || [paragraph]

    for (let sentence of sentences) {
      sentence = sentence.trim()

      // Skip empty sentences
      if (!sentence) continue

      // Check if sentence starts with a conclusion phrase
      const lowerSentence = sentence.toLowerCase()
      const isConclusion = conclusionPhrases.some(phrase =>
        lowerSentence.startsWith(phrase) ||
        lowerSentence.includes(`, ${phrase},`) ||
        lowerSentence.includes(`. ${phrase}`)
      )

      // Skip conclusion sentences
      if (isConclusion) continue

      // Add sentence as bullet point
      bullets.push(sentence)
    }
  }

  return bullets
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
  const [notes, setNotes] = useState(article.notes || '')
  const [tags, setTags] = useState<string[]>(article.tags || [])
  const [newTag, setNewTag] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [editingTags, setEditingTags] = useState(false)

  // Expansion state
  const [expandedParts, setExpandedParts] = useState<{
    [key in 'base' | 'eli5' | 'phd']?: Array<{ title: string; content: string }>
  }>({})
  const [expanding, setExpanding] = useState<{
    [key in 'base' | 'eli5' | 'phd']?: boolean
  }>({})
  const [expansionError, setExpansionError] = useState<{
    [key in 'base' | 'eli5' | 'phd']?: string
  }>({})

  // Streaming state for progressive text display
  const [streamingContent, setStreamingContent] = useState<{
    [key in 'base' | 'eli5' | 'phd']?: string
  }>({})

  // Article collapse state
  const [isArticleCollapsed, setIsArticleCollapsed] = useState(false)

  // Progressive question rendering state
  const [visibleQuestions, setVisibleQuestions] = useState<any[]>([])
  const [allQuestions, setAllQuestions] = useState<any[]>([])

  const newsData = article.article_data

  // Progressive question rendering effect
  React.useEffect(() => {
    const questions = newsData.keyQuestions || []

    // If questions changed, reset and start progressive rendering
    if (JSON.stringify(questions) !== JSON.stringify(allQuestions)) {
      setAllQuestions(questions)
      setVisibleQuestions([])

      // Show questions one by one with delay
      if (questions.length > 0) {
        questions.forEach((question, index) => {
          setTimeout(() => {
            setVisibleQuestions(prev => [...prev, question])
          }, index * 300) // 300ms delay between each question
        })
      }
    }
  }, [newsData.keyQuestions])

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

  const handleExpandArticle = async (readingLevel: 'base' | 'eli5' | 'phd') => {
    // Clear any previous error and streaming content
    setExpansionError(prev => ({ ...prev, [readingLevel]: undefined }))
    setStreamingContent(prev => ({ ...prev, [readingLevel]: '' }))
    setExpanding(prev => ({ ...prev, [readingLevel]: true }))

    try {
      const currentParts = expandedParts[readingLevel] || []
      const partNumber = currentParts.length + 2 // +2 because original is part 1

      // Build all previous content for context
      const allPreviousContent = [
        newsData.article[readingLevel],
        ...currentParts.map(part => part.content)
      ]

      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('You must be logged in to expand articles')
      }

      // Call expand-article edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/expand-article`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            topic: newsData.topic,
            headline: newsData.headline,
            originalContent: allPreviousContent[allPreviousContent.length - 1],
            allPreviousContent,
            readingLevel,
            sources: newsData.sources.map(s => ({
              id: s.id,
              outlet: s.outlet,
              headline: s.headline,
              url: s.url
            })),
            partNumber
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || errorData.message || 'Failed to expand article')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader available')

      let accumulatedContent = ''
      let finalResult: any = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'chunk') {
                // Accumulate text and update display
                accumulatedContent += data.text
                setStreamingContent(prev => ({
                  ...prev,
                  [readingLevel]: accumulatedContent
                }))
              } else if (data.type === 'done') {
                // Store final result with parsed title and content
                finalResult = data
              } else if (data.type === 'error') {
                throw new Error(data.error || data.message || 'Streaming error')
              }
            } catch (e) {
              // Skip invalid JSON
              console.warn('Failed to parse streaming chunk:', e)
            }
          }
        }
      }

      if (!finalResult) {
        throw new Error('No completion data received')
      }

      // Add expanded content to state with title and content
      setExpandedParts(prev => ({
        ...prev,
        [readingLevel]: [
          ...(prev[readingLevel] || []),
          { title: finalResult.partTitle, content: finalResult.expandedContent }
        ]
      }))

      // Clear streaming content
      setStreamingContent(prev => ({ ...prev, [readingLevel]: '' }))

      toast({
        title: 'Article Expanded!',
        description: `Part ${partNumber}: ${finalResult.partTitle} (${finalResult.wordCount} words)`,
      })

    } catch (error: any) {
      console.error('Expansion error:', error)
      setStreamingContent(prev => ({ ...prev, [readingLevel]: '' }))
      setExpansionError(prev => ({
        ...prev,
        [readingLevel]: error.message || 'Failed to expand article'
      }))
      toast({
        title: 'Expansion Failed',
        description: error.message || 'Failed to expand article. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setExpanding(prev => ({ ...prev, [readingLevel]: false }))
    }
  }

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      {/* Main Content Column (70%) */}
      <div className="flex-1 space-y-6">
        {/* Always show headline */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {newsData.headline}
              <div className="text-sm text-gray-600 font-normal mt-2">
                {(() => {
                  const date = new Date(newsData.generatedAtUTC);
                  const timeStr = date.toLocaleString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    timeZoneName: 'short'
                  });
                  // Replace EDT with EST, PDT with PST, CDT with CST, MDT with MST (use standard time year-round)
                  return timeStr.replace(/EDT/g, 'EST')
                    .replace(/PDT/g, 'PST')
                    .replace(/CDT/g, 'CST')
                    .replace(/MDT/g, 'MST');
                })()}
              </div>
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
      {!isArticleCollapsed && newsData.article.base && (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm relative">
          {/* Collapse button in top right corner */}
          <button
            onClick={() => setIsArticleCollapsed(true)}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
            aria-label="Collapse article"
          >
            <ChevronUp className="h-5 w-5 text-gray-600" />
          </button>
          <CardContent className="pt-6">
            {/* Original Article Content */}
            <div className="prose prose-lg max-w-none text-left">
              <ul className="space-y-3 list-none">
                {transformToBulletPoints(newsData.article.base).map((bullet: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 leading-relaxed text-gray-800">
                    <span className="text-teal-600 mt-1.5 flex-shrink-0">•</span>
                    <span>
                      <TextWithFootnotes text={bullet} sources={newsData.sources} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Expanded Parts */}
            {expandedParts.base?.map((part, partIndex) => (
              <div key={`part-${partIndex}`} className="mt-8">
                <div className="border-t-2 border-gray-200 pt-6 mb-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Part {partIndex + 2}: {part.title}
                  </h3>
                </div>
                <div className="prose prose-lg max-w-none text-left">
                  <ul className="space-y-3 list-none">
                    {transformToBulletPoints(part.content).map((bullet: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 leading-relaxed text-gray-800">
                        <span className="text-teal-600 mt-1.5 flex-shrink-0">•</span>
                        <span>
                          <TextWithFootnotes text={bullet} sources={newsData.sources} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}

            {/* Streaming Content - Show progressively as it arrives */}
            {streamingContent.base && (
              <div className="mt-8">
                <div className="border-t-2 border-gray-200 pt-6 mb-4">
                  <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
                    Generating Part {(expandedParts.base?.length || 0) + 2}...
                  </h3>
                </div>
                <div className="prose prose-lg max-w-none text-left">
                  <p className="mb-4 leading-relaxed text-gray-800 animate-fadeIn">
                    {streamingContent.base}
                    <span className="inline-flex ml-1 animate-pulse">▋</span>
                  </p>
                </div>
              </div>
            )}

            {/* Write More Button */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              {expanding.base ? (
                <Button disabled className="w-full sm:w-auto">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Part {(expandedParts.base?.length || 0) + 2}...
                </Button>
              ) : (
                <Button
                  onClick={() => handleExpandArticle('base')}
                  className="w-full sm:w-auto bg-gradient-to-r from-slate-600 to-blue-600 hover:from-slate-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300 font-semibold px-8 py-3"
                >
                  Write More
                </Button>
              )}
              {expansionError.base && (
                <div className="mt-2 text-sm text-red-600 flex items-center gap-2">
                  <span>{expansionError.base}</span>
                  <button
                    onClick={() => handleExpandArticle('base')}
                    className="underline hover:no-underline"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collapsed state - show expandable button */}
      {isArticleCollapsed && (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="py-4">
            <button
              onClick={() => setIsArticleCollapsed(false)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span className="text-lg font-medium text-gray-700">Read Full Analysis</span>
              <ChevronDown className="h-5 w-5 text-gray-600" />
            </button>
          </CardContent>
        </Card>
      )}

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
            {newsData.sources.map((source, index) => (
              <div key={source.id} className="border rounded-lg p-4 bg-white/50 relative">
                {/* Citation Number Badge */}
                <div className="absolute -left-3 -top-3 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                  {index + 1}
                </div>
                <div className="flex justify-between items-start mb-2 ml-3">
                  <h4 className="font-semibold text-teal-700">{source.outlet}</h4>
                  <Badge variant="outline">{source.type}</Badge>
                </div>
                <p className="text-sm font-medium mb-1 ml-3">{source.headline}</p>
                <p className="text-xs text-gray-600 mb-2 ml-3">{source.analysisNote}</p>
                <p className="text-xs text-gray-500 mb-2 ml-3">
                  Published: {new Date(source.publishedAt).toLocaleString()}
                </p>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal-600 hover:text-teal-800 underline flex items-center gap-1 ml-3"
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

      {/* Questions Sidebar Column (30%) - Always visible */}
      <div className="lg:w-[380px] lg:flex-shrink-0 space-y-6">
        <ThoughtProvokingQuestions
          questions={visibleQuestions}
          isLoading={allQuestions.length > 0 && visibleQuestions.length < allQuestions.length}
        />
        {(newsData.summaryPoints?.length > 0 || newsData.disagreements?.length > 0) && (
          <SourcePerspectives
            summaryPoints={newsData.summaryPoints || []}
            disagreements={newsData.disagreements || []}
          />
        )}
      </div>
    </div>
  )
}
