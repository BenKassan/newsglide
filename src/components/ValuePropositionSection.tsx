
import React from 'react';
import { Shield, User, MessageCircle, Brain } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

const valueProps = [
  {
    icon: Shield,
    title: "Defeat Bias",
    description: "We search and analyze news from dozens of reputable outlets, crafting a neutral story while highlighting key disagreements."
  },
  {
    icon: User,
    title: "Personalized For You",
    description: "Search exactly what you want — word for word. Create a customized list of news stories to follow. We'll update you on new developments."
  },
  {
    icon: MessageCircle,
    title: "Interact With Your Content",
    description: "Ask follow-up questions and learn more about your interests with our live AI agent."
  },
  {
    icon: Brain,
    title: "Adjustable Complexity",
    description: "From simple summaries to PhD-level analysis - choose the reading level that works for you."
  }
];

export const ValuePropositionSection: React.FC = () => {
  return (
    <div className="py-20 bg-white/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-4">
            Why Choose NewsGlide?
          </h3>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Our cutting-edge AI model beats traditional news media in every sense. Here's how:
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
          {valueProps.map((prop, i) => (
            <Card 
              key={i} 
              className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group"
            >
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <prop.icon className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold mb-4 text-gray-800">
                  {prop.title}
                </h4>
                <p className="text-gray-600 leading-relaxed">
                  {prop.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
