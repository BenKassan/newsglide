import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Button } from '@ui/button'
import { Card, CardContent } from '@ui/card'
import { Home } from 'lucide-react'
import UnifiedNavigation from '@/components/UnifiedNavigation'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <UnifiedNavigation />
      <div className="pt-20 flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <Card className="glass-card border-white/10 max-w-md mx-4">
          <CardContent className="text-center p-12">
            <h1 className="text-8xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">404</h1>
            <p className="text-xl text-gray-300 mb-8">Oops! Page not found</p>
            <p className="text-gray-400 mb-8">The page you're looking for doesn't exist or has been moved.</p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
            >
              <Home className="h-4 w-4 mr-2" />
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default NotFound
