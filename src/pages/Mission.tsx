import { ArrowLeft } from 'lucide-react'
import { Button } from '@ui/button'
import { useNavigate } from 'react-router-dom'
import UnifiedNavigation from '@/components/UnifiedNavigation'

const Mission = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <UnifiedNavigation />
      {/* Header with back button */}
      <div className="relative pt-20">
        <div className="relative container mx-auto px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-white hover:text-gray-200 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to NewsGlide
          </Button>
        </div>
      </div>

      {/* Mission Content */}
      <div className="relative py-20">
        <div className="relative container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-6">
                Our Mission
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto rounded-full"></div>
            </div>

            <div className="glass-card rounded-2xl border-white/10 p-12">
              <div className="prose prose-lg max-w-none">
                <p className="text-lg leading-relaxed text-gray-300 mb-6">
                  In an era of information abundance and increasing polarization, NewsGlide exists
                  to restore clarity and truth to news consumption. We believe that access to
                  unbiased, synthesized information is not just a convenience—it's a fundamental
                  requirement for an informed democracy and educated global citizenry.
                </p>

                <p className="text-lg leading-relaxed text-gray-300 mb-6">
                  Our artificial intelligence doesn't serve corporate interests, political agendas,
                  or advertising revenue streams. Instead, it serves you—the curious reader seeking
                  understanding beyond headlines and soundbites. By aggregating diverse perspectives
                  from reputable sources and distilling them into clear, neutral narratives, we aim
                  to cut through the noise that often obscures important truths. We envision a world
                  where people can engage with complex topics through multiple lenses of
                  understanding, where information literacy flourishes, and where the act of staying
                  informed becomes an empowering rather than overwhelming experience.
                </p>

                <p className="text-lg leading-relaxed text-gray-300 mb-12">
                  Through NewsGlide, we're not just building a product—we're fostering a movement
                  toward more thoughtful media consumption, critical thinking, and informed civic
                  participation. Every synthesis we generate, every question we help answer, and
                  every moment of clarity we provide contributes to a more knowledgeable and
                  thoughtful society.
                </p>

                {/* Team Section */}
                <div className="pt-12 border-t border-white/10">
                  <h2 className="text-3xl font-bold text-white text-center mb-12">Our Team</h2>

                  <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                    {/* Elliot Greenbaum */}
                    <div className="text-center">
                      <div className="mb-6">
                        <img
                          src="/images/elliot-greenbaum.png"
                          alt="Elliot Greenbaum"
                          className="w-48 h-48 rounded-full mx-auto object-cover object-center border-4 border-white/10 shadow-xl"
                          style={{ objectPosition: 'center center' }}
                        />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Elliot Greenbaum</h3>
                      <p className="text-blue-400 font-medium">Co-Founder & CEO</p>
                    </div>

                    {/* Ben Kassan */}
                    <div className="text-center">
                      <div className="mb-6">
                        <div className="w-48 h-48 rounded-full mx-auto bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-4 border-white/10 shadow-xl flex items-center justify-center">
                          <span className="text-6xl text-white/80">BK</span>
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Ben Kassan</h3>
                      <p className="text-blue-400 font-medium">Co-Founder</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Mission
