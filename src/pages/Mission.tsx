import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Globe, Target, Users } from 'lucide-react';

const Mission = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" className="flex items-center gap-2 hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4" />
              Back to NewsGlide
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Mission</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            NewsGlide is dedicated to providing unbiased, comprehensive news analysis 
            that cuts through the noise and delivers the truth.
          </p>
        </div>

        {/* Mission Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-blue-600" />
                Combat Misinformation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We believe everyone deserves access to accurate, unbiased news. Our AI-powered 
                synthesis analyzes multiple reputable sources to eliminate bias and present 
                balanced perspectives on current events.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Globe className="h-6 w-6 text-indigo-600" />
                Global Transparency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We aggregate news from dozens of trusted outlets worldwide, ensuring 
                comprehensive coverage and diverse viewpoints on the stories that matter most 
                to you and your community.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Target className="h-6 w-6 text-purple-600" />
                Personalized Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                From simple summaries to PhD-level analysis, we adapt content to your needs. 
                Our interactive AI allows you to dive deeper into topics that interest you 
                with personalized follow-up questions.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Users className="h-6 w-6 text-green-600" />
                Empowering Citizens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We believe informed citizens make better decisions. By providing clear, 
                fact-based news analysis, we empower individuals to engage meaningfully 
                with the world around them.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Vision Statement */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Our Vision</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-lg text-gray-700 leading-relaxed">
              We envision a world where everyone has access to trustworthy, unbiased news 
              that helps them understand complex global events. Through AI-powered synthesis 
              and personalized content delivery, we're building the future of informed 
              democratic participation.
            </p>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <Link to="/">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Experience NewsGlide Today
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Mission;