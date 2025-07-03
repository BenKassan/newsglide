import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Mission = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header with back button */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative container mx-auto px-6 py-4">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/'}
            className="btn-hover flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to NewsGlide
          </Button>
        </div>
      </div>

      {/* Mission Content */}
      <div className="relative py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
                Our Mission
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12">
              <div className="prose prose-lg max-w-none">
                <p className="text-lg leading-relaxed text-gray-700 mb-6">
                  In an era of information abundance and increasing polarization, NewsGlide exists to restore clarity and truth to news consumption. We believe that access to unbiased, synthesized information is not just a convenience—it's a fundamental requirement for an informed democracy and educated global citizenry.
                </p>

                <p className="text-lg leading-relaxed text-gray-700 mb-6">
                  Our artificial intelligence doesn't serve corporate interests, political agendas, or advertising revenue streams. Instead, it serves you—the curious reader seeking understanding beyond headlines and soundbites. By aggregating diverse perspectives from reputable sources and distilling them into clear, neutral narratives, we aim to cut through the noise that often obscures important truths. We envision a world where people can engage with complex topics through multiple lenses of understanding, where information literacy flourishes, and where the act of staying informed becomes an empowering rather than overwhelming experience.
                </p>

                <p className="text-lg leading-relaxed text-gray-700 mb-12">
                  Through NewsGlide, we're not just building a product—we're fostering a movement toward more thoughtful media consumption, critical thinking, and informed civic participation. Every synthesis we generate, every question we help answer, and every moment of clarity we provide contributes to a more knowledgeable and thoughtful society.
                </p>

                <div className="text-center pt-8 border-t border-gray-200">
                  <p className="text-lg font-medium text-gray-800 italic">
                    Elliot Greenbaum and Benjamin Kassan
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Co-founders, NewsGlide
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mission;