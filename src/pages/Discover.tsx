import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@shared/hooks/use-toast'
import { useAuth } from '@features/auth'
import { OnboardingSurveyModal } from '@/components/OnboardingSurveyModal'

const Discover = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [showSurvey, setShowSurvey] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/')
    }
  }, [user, navigate])

  const handleSurveyComplete = () => {
    toast({
      title: 'Survey completed!',
      description: 'Your personalized recommendations are ready. Returning to home...',
      variant: 'success',
    })
    
    // Navigate back to home after a short delay
    setTimeout(() => {
      navigate('/')
    }, 1500)
  }

  const handleSurveyClose = () => {
    // If user closes the survey, navigate back to home
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <OnboardingSurveyModal
        isOpen={showSurvey}
        onClose={handleSurveyClose}
        onComplete={handleSurveyComplete}
      />
    </div>
  )
}

export default Discover