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
      case 'weak': return 'bg-red-500';
      case 'moderate': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStrengthTextColor = (level) => {
    switch (level) {
      case 'weak': return 'text-red-600';
      case 'moderate': return 'text-yellow-600';
      case 'strong': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🔐 Password Strength Intelligence
          </h1>
          <p className="text-gray-600 text-lg">
            Powered by Google Gemini AI - Analyze your password security instantly
          </p>
        </div>

        {/* Main Analysis Section */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Password Analysis</h2>
            
            {/* Password Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Password to Analyze
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password..."
                  onKeyPress={(e) => e.key === 'Enter' && analyzePassword()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={analyzePassword}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              {loading ? '🔄 Analyzing...' : '🔍 Analyze Password'}
            </button>
          </div>

          {/* Analysis Results */}
          {analysis && (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">Analysis Results</h3>
              
              {/* Strength Meter */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Strength Score</span>
                  <span className={`text-sm font-bold ${getStrengthTextColor(analysis.strength_level)}`}>
                    {analysis.strength_score}/100 - {analysis.strength_level.toUpperCase()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all duration-500 ${getStrengthColor(analysis.strength_level)}`}
                    style={{ width: `${analysis.strength_score}%` }}
                  ></div>
                </div>
              </div>

              {/* Weaknesses */}
              {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-red-600 mb-3">🚨 Identified Weaknesses</h4>
                  <ul className="space-y-2">
                    {analysis.weaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span className="text-gray-700">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Crack Time Estimates */}
              {analysis.crack_time && Object.keys(analysis.crack_time).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-orange-600 mb-3">⏱️ Crack Time Estimates</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(analysis.crack_time).map(([method, time]) => (
                      <div key={method} className="bg-orange-50 p-4 rounded-lg">
                        <div className="font-semibold text-orange-800 capitalize">
                          {method.replace('_', ' ')}
                        </div>
                        <div className="text-orange-700">{time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {analysis.suggestions && analysis.suggestions.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-green-600 mb-3">💡 Improvement Suggestions</h4>
                  <ul className="space-y-2">
                    {analysis.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span className="text-gray-700">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Explanation */}
              {analysis.explanation && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-blue-600 mb-3">📖 Detailed Explanation</h4>
                  <p className="text-gray-700 leading-relaxed">{analysis.explanation}</p>
                </div>
              )}
            </div>
          )}

          {/* History Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-800">Analysis History</h3>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Clear History
                </button>
              )}
            </div>
            
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No password analyses yet. Start by analyzing a password above!
              </p>
            ) : (
              <div className="space-y-4">
                {history.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-800">
                        Password: {item.password_masked}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${getStrengthColor(item.strength_level)}`}
                            style={{ width: `${item.strength_score}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-medium ${getStrengthTextColor(item.strength_level)}`}>
                          {item.strength_score}/100
                        </span>
                      </div>
                      <span className={`text-sm px-2 py-1 rounded ${getStrengthTextColor(item.strength_level)} bg-${item.strength_level === 'weak' ? 'red' : item.strength_level === 'moderate' ? 'yellow' : 'green'}-100`}>
                        {item.strength_level.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;