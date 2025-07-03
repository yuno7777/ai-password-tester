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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl mb-6 shadow-lg shadow-violet-500/25">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-4">
            Password Strength Intelligence
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
                    <span className="text-sm">🔍</span>
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
                      {showPassword ? '🙈' : '👁️'}
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
                      <span className="mr-2">🔍</span>
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
                      <span className="text-sm">📊</span>
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
                      <span className="text-2xl opacity-50">📝</span>
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
                      <span className="text-sm">⚡</span>
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
                        <span className="mr-2">🚨</span>
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
                        <span className="mr-2">⏱️</span>
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
                        <span className="mr-2">💡</span>
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
                        <span className="mr-2">📖</span>
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
                    <span className="text-3xl opacity-50">🔐</span>
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