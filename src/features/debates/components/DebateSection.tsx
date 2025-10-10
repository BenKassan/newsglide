import React, { useState, useRef } from 'react'
import { DebateSelector } from './DebateSelector'
import { DebateViewer } from './DebateViewer'
import { generateDebate, saveDebateToHistory, DebateResponse } from '../services/debateService'
import { useToast } from '@shared/hooks/use-toast'
import { useAuth } from '@features/auth'
import { useSubscription } from '@features/subscription'

interface NewsData {
  topic: string
  headline: string
  summaryPoints: string[]
  article: {
    base: string
    eli5: string
    phd: string
  }
}

interface DebateSectionProps {
  newsData: NewsData
  selectedReadingLevel: 'base' | 'eli5' | 'phd'
}

export const DebateSection: React.FC<DebateSectionProps> = ({ newsData, selectedReadingLevel }) => {
  const [showDebate, setShowDebate] = useState(false)
  const [generatingDebate, setGeneratingDebate] = useState(false)
  const [debateData, setDebateData] = useState<DebateResponse | null>(null)
  const [debateParticipants, setDebateParticipants] = useState<[string, string] | null>(null)

  const { toast } = useToast()
  const { user } = useAuth()
  const { canUseFeature } = useSubscription()

  const handleGenerateDebate = async (participant1Name: string, participant2Name: string) => {
    if (!canUseFeature('ai_debates')) {
      toast({
        title: 'Pro Feature',
        description: 'AI Debates are only available for Pro users. Upgrade to unlock!',
        variant: 'destructive',
      })
      return
    }

    setGeneratingDebate(true)
    setDebateParticipants([participant1Name, participant2Name])

    try {
      const debate = await generateDebate({
        topic: newsData.topic,
        newsContext: {
          headline: newsData.headline,
          summaryPoints: newsData.summaryPoints,
          article: newsData.article[selectedReadingLevel],
        },
        participant1Name,
        participant2Name,
      })

      setDebateData(debate)
      setShowDebate(true)

      // Save to history if logged in
      if (user) {
        await saveDebateToHistory(user.id, newsData.topic, participant1Name, participant2Name, debate)
      }

      toast({
        title: '✓ Debate Generated!',
        description: 'Your AI debate is ready to view',
        duration: 5000,
      })

      // Scroll to debate
      setTimeout(() => {
        document.getElementById('debate-viewer')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
    } catch (error) {
      console.error('Failed to generate debate:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate debate. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingDebate(false)
    }
  }

  const handleCancelGeneration = () => {
    setGeneratingDebate(false)
  }

  const handleRegenerateDebate = () => {
    if (debateParticipants) {
      setShowDebate(false)
      setDebateData(null)
      handleGenerateDebate(debateParticipants[0], debateParticipants[1])
    }
  }

  const handleNewDebate = () => {
    setShowDebate(false)
    setDebateData(null)
    setDebateParticipants(null)
  }

  return (
    <div className="mt-8 space-y-4">
      {!showDebate ? (
        <DebateSelector
          onStartDebate={handleGenerateDebate}
          isGenerating={generatingDebate}
          onCancel={handleCancelGeneration}
        />
      ) : (
        debateData &&
        debateParticipants && (
          <div id="debate-viewer">
            <DebateViewer
              debate={debateData}
              participant1Name={debateParticipants[0]}
              participant2Name={debateParticipants[1]}
              topic={newsData.topic}
              onRegenerateDebate={handleRegenerateDebate}
              onNewDebate={handleNewDebate}
            />
          </div>
        )
      )}
    </div>
  )
}
