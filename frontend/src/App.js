import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [password, setPassword] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Generate session ID on mount
  useEffect(() => {
    const generateSessionId = () => {
      return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    };
    setSessionId(generateSessionId());
  }, []);

  // Load history when session ID is set
  useEffect(() => {
    if (sessionId) {
      loadHistory();
    }
  }, [sessionId]);

  const loadHistory = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/analysis-history/${sessionId}`);
      const data = await response.json();
      setHistory(data.analyses || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const analyzePassword = async () => {
    if (!password.trim()) {
      alert('Please enter a password to analyze');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/analyze-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: password,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setAnalysis(data);
      loadHistory(); // Refresh history
    } catch (error) {
      console.error('Error analyzing password:', error);
      alert('Error analyzing password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (level) => {
    switch (level) {
      case 'weak': return 'bg-gradient-to-r from-red-500 to-red-600';
      case 'moderate': return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'strong': return 'bg-gradient-to-r from-emerald-500 to-green-500';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  const getStrengthTextColor = (level) => {
    switch (level) {
      case 'weak': return 'text-red-400';
      case 'moderate': return 'text-amber-400';
      case 'strong': return 'text-emerald-400';
      default: return 'text-gray-400';
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-dark-gradient">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl mb-6 shadow-lg shadow-blue-500/25 overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1660732106134-f3009a1e90ea?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwyfHxwYXNzd29yZCUyMHByb3RlY3Rpb24lMjBsb2dvfGVufDB8fHxibHVlfDE3NTE1MjI4NzB8MA&ixlib=rb-4.1.0&q=85&w=80&h=80"
              alt="AI Password Tester Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-4">
            AI Password Tester
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Powered by Google Gemini AI - Advanced password security analysis with real-time threat assessment
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Password Input */}
            <div className="space-y-8">
              {/* Password Analysis Card */}
              <div className="glass-card p-8">
                <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg mr-3 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  Password Analysis
                </h2>
                
                {/* Password Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Enter Password to Analyze
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-200 backdrop-blur-sm"
                      placeholder="Enter your password..."
                      onKeyPress={(e) => e.key === 'Enter' && analyzePassword()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Analyze Button */}
                <button
                  onClick={analyzePassword}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transform hover:scale-[1.02] disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Analyzing...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Analyze Password
                    </div>
                  )}
                </button>
              </div>

              {/* History Card */}
              <div className="glass-card p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-semibold text-white flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg mr-3 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    Analysis History
                  </h3>
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors duration-200"
                    >
                      Clear History
                    </button>
                  )}
                </div>
                
                {history.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-800/50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-400">
                      No password analyses yet. Start by analyzing a password above!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                    {history.map((item, index) => (
                      <div key={index} className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-4 hover:bg-gray-800/50 transition-all duration-200">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-200">
                            Password: {item.password_masked}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center flex-1">
                            <div className="w-20 bg-gray-700 rounded-full h-2 mr-3">
                              <div 
                                className={`h-2 rounded-full ${getStrengthColor(item.strength_level)} transition-all duration-500`}
                                style={{ width: `${item.strength_score}%` }}
                              ></div>
                            </div>
                            <span className={`text-sm font-medium ${getStrengthTextColor(item.strength_level)}`}>
                              {item.strength_score}/100
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${item.strength_level === 'weak' ? 'bg-red-500/20 text-red-300' : item.strength_level === 'moderate' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                            {item.strength_level.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Analysis Results */}
            <div>
              {analysis ? (
                <div className="glass-card p-8">
                  <h3 className="text-2xl font-semibold text-white mb-6 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg mr-3 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    Analysis Results
                  </h3>
                  
                  {/* Strength Meter */}
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-gray-300">Strength Score</span>
                      <span className={`text-sm font-bold ${getStrengthTextColor(analysis.strength_level)}`}>
                        {analysis.strength_score}/100 - {analysis.strength_level.toUpperCase()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-3 rounded-full transition-all duration-1000 ${getStrengthColor(analysis.strength_level)} shadow-lg`}
                        style={{ width: `${analysis.strength_score}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Weaknesses */}
                  {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-lg font-semibold text-red-400 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        Identified Weaknesses
                      </h4>
                      <ul className="space-y-2">
                        {analysis.weaknesses.map((weakness, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-red-400 mr-3 mt-1">•</span>
                            <span className="text-gray-300">{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Crack Time Estimates */}
                  {analysis.crack_time && Object.keys(analysis.crack_time).length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-lg font-semibold text-amber-400 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Crack Time Estimates
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        {Object.entries(analysis.crack_time).map(([method, time]) => (
                          <div key={method} className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                            <div className="font-semibold text-amber-300 capitalize text-sm">
                              {method.replace('_', ' ')}
                            </div>
                            <div className="text-amber-200 text-lg font-bold">{time}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {analysis.suggestions && analysis.suggestions.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Improvement Suggestions
                      </h4>
                      <ul className="space-y-2">
                        {analysis.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-emerald-400 mr-3 mt-1">✓</span>
                            <span className="text-gray-300">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Explanation */}
                  {analysis.explanation && (
                    <div>
                      <h4 className="text-lg font-semibold text-blue-400 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Detailed Explanation
                      </h4>
                      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                        <p className="text-gray-300 leading-relaxed">{analysis.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="glass-card p-8 text-center">
                  <div className="w-20 h-20 bg-gray-800/50 rounded-3xl mx-auto mb-6 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-300 mb-3">Ready to Analyze</h3>
                  <p className="text-gray-400">
                    Enter a password in the input field and click "Analyze Password" to see detailed security analysis.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;