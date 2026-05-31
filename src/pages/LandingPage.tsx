import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Brain,
  FileText,
  Target,
  MessageSquare,
  TrendingUp,
  Map,
  Github,
  MessageCircle,
  ArrowRight,
  Check,
  Star,
  Users,
  Zap,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Header } from '../components/layout/Header';

const features = [
  {
    icon: FileText,
    title: 'Resume Analysis',
    description: 'Get AI-powered insights on your resume with ATS compatibility scores and actionable recommendations.',
    color: 'bg-primary-100 dark:bg-primary-900/30',
    iconColor: 'text-primary-600 dark:text-primary-400',
  },
  {
    icon: Target,
    title: 'Job Match Analyzer',
    description: 'Compare your resume against job descriptions to identify skill gaps and improvement areas.',
    color: 'bg-accent-100 dark:bg-accent-900/30',
    iconColor: 'text-accent-600 dark:text-accent-400',
  },
  {
    icon: MessageSquare,
    title: 'Mock Interviews',
    description: 'Practice with AI-generated questions tailored to your experience level and target role.',
    color: 'bg-success-100 dark:bg-success-900/30',
    iconColor: 'text-success-600 dark:text-success-400',
  },
  {
    icon: TrendingUp,
    title: 'Skill Gap Analysis',
    description: 'Identify missing skills and get a prioritized learning roadmap to advance your career.',
    color: 'bg-warning-100 dark:bg-warning-900/30',
    iconColor: 'text-warning-600 dark:text-warning-400',
  },
  {
    icon: Github,
    title: 'GitHub Analysis',
    description: 'Get insights on your GitHub profile and portfolio to showcase your best work.',
    color: 'bg-secondary-100 dark:bg-secondary-800',
    iconColor: 'text-secondary-600 dark:text-secondary-400',
  },
  {
    icon: MessageCircle,
    title: 'AI Career Mentor',
    description: 'Chat with an AI mentor for personalized career advice and technical guidance.',
    color: 'bg-error-100 dark:bg-error-900/30',
    iconColor: 'text-error-600 dark:text-error-400',
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Senior Frontend Engineer at Google',
    content: 'Career Copilot helped me refine my resume and prepare for interviews. I landed my dream job within 3 months!',
    avatar: 'https://images.pexels.com/photos/3764359/pexels-photo-3764359.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
  },
  {
    name: 'Marcus Johnson',
    role: 'Full Stack Developer at Stripe',
    content: 'The mock interview feature is incredible. It felt like practicing with a real interviewer.',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
  },
  {
    name: 'Priya Patel',
    role: 'Tech Lead at Microsoft',
    content: 'The skill gap analysis showed me exactly what I needed to learn. Now I lead a team of 12 developers.',
    avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
  },
];

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for getting started',
    features: ['5 Resume Analyses', 'Basic Job Matching', '3 Mock Interviews', 'Limited AI Mentor'],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For serious career growth',
    features: ['Unlimited Resume Analyses', 'Advanced Job Matching', 'Unlimited Mock Interviews', 'Full AI Mentor Access', 'Priority Support', 'Custom Roadmaps'],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For teams and organizations',
    features: ['Everything in Pro', 'Team Analytics', 'API Access', 'Custom Integrations', 'Dedicated Support', 'SLA Guarantee'],
    cta: 'Contact Sales',
    popular: false,
  },
];

const stats = [
  { value: '10,000+', label: 'Developers Helped' },
  { value: '500+', label: 'Companies Hired Into' },
  { value: '92%', label: 'Interview Success Rate' },
  { value: '4.9/5', label: 'User Rating' },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-full text-primary-700 dark:text-primary-300 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              AI-Powered Developer Career Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary-900 dark:text-white mb-6 text-balance">
              Your AI-Powered Partner for{' '}
              <span className="gradient-text">Developer Career Growth</span>
            </h1>

            <p className="text-lg sm:text-xl text-secondary-600 dark:text-secondary-400 max-w-3xl mx-auto mb-10">
              Transform your career with AI-driven resume analysis, interview preparation,
              skill gap identification, and personalized learning paths.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => navigate(user ? '/dashboard' : '/signup')} rightIcon={<ArrowRight className="w-5 h-5" />}>
                {user ? 'Go to Dashboard' : 'Start Free Trial'}
              </Button>
              <Button variant="outline" size="lg" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                See How It Works
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-secondary-500 dark:text-secondary-400">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span className="text-sm">Bank-level Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span className="text-sm">10,000+ Developers</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-warning-500 text-warning-500" />
                <span className="text-sm">4.9/5 Rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gradient-to-r from-primary-600 to-accent-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center text-white">
                <div className="text-3xl sm:text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-primary-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-secondary-900 dark:text-white mb-4">
              Everything You Need to Ace Your Career
            </h2>
            <p className="text-lg text-secondary-600 dark:text-secondary-400 max-w-2xl mx-auto">
              Comprehensive tools designed specifically for software developers to accelerate career growth.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group p-6 bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg transition-all duration-300"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary-50 dark:bg-secondary-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-secondary-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-lg text-secondary-600 dark:text-secondary-400 max-w-2xl mx-auto">
              Three simple steps to transform your developer career.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Upload Your Resume', description: 'Upload your resume or connect your GitHub profile to get started.' },
              { step: '02', title: 'Get AI Analysis', description: 'Our AI analyzes your skills, experience, and career goals.' },
              { step: '03', title: 'Take Action', description: 'Follow personalized recommendations to land your dream job.' },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-5xl font-bold text-primary-100 dark:text-primary-900/30 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-secondary-600 dark:text-secondary-400">{item.description}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 right-0 transform translate-x-1/2">
                    <ChevronRight className="w-6 h-6 text-secondary-300 dark:text-secondary-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-secondary-900 dark:text-white mb-4">
              Loved by Developers
            </h2>
            <p className="text-lg text-secondary-600 dark:text-secondary-400 max-w-2xl mx-auto">
              See what developers are saying about Career Copilot.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="bg-white dark:bg-secondary-800 rounded-xl p-6 border border-secondary-200 dark:border-secondary-700">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-warning-500 text-warning-500" />
                  ))}
                </div>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6 italic">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-secondary-900 dark:text-white">{testimonial.name}</div>
                    <div className="text-sm text-secondary-500 dark:text-secondary-400">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary-50 dark:bg-secondary-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-secondary-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-secondary-600 dark:text-secondary-400 max-w-2xl mx-auto">
              Choose the plan that fits your career goals.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                className={`relative bg-white dark:bg-secondary-800 rounded-xl border ${
                  plan.popular ? 'border-primary-500 ring-2 ring-primary-500' : 'border-secondary-200 dark:border-secondary-700'
                } p-6`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-sm font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-secondary-900 dark:text-white">{plan.price}</span>
                    {plan.period && <span className="text-secondary-500">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-secondary-600 dark:text-secondary-400">
                      <Check className="w-5 h-5 text-success-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  className="w-full"
                  onClick={() => navigate('/signup')}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-primary-600 to-accent-600 rounded-2xl p-8 sm:p-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Accelerate Your Career?
            </h2>
            <p className="text-lg text-primary-100 mb-8 max-w-xl mx-auto">
              Join thousands of developers who have transformed their careers with AI Career Copilot.
            </p>
            <Button
              size="lg"
              className="bg-white text-primary-600 hover:bg-primary-50"
              onClick={() => navigate(user ? '/dashboard' : '/signup')}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Get Started for Free
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-secondary-900 dark:bg-secondary-950 text-secondary-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-primary-600 rounded-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Career Copilot</span>
              </div>
              <p className="text-sm">
                AI-powered platform helping developers accelerate their careers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-secondary-800 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} AI Career Copilot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
