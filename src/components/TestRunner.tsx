"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { eventPlatformTester, TestSuite } from '../utils/testingFramework';
import GlassCard from './GlassCard';
import LoadingSpinner from './LoadingSpinner';

export default function TestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestSuite[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');

  const runTests = async () => {
    setIsRunning(true);
    setCurrentTest('Initializing test suite...');

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setCurrentTest(prev => {
          const messages = [
            'Setting up test environment...',
            'Creating test users...',
            'Testing registration flow...',
            'Testing badge management...',
            'Testing account cards...',
            'Testing real-time updates...',
            'Testing responsive design...',
            'Cleaning up test data...'
          ];
          const currentIndex = messages.findIndex(msg => msg === prev);
          return currentIndex >= 0 && currentIndex < messages.length - 1 ? messages[currentIndex + 1] : prev;
        });
      }, 2000);

      const testResults = await eventPlatformTester.runCompleteTestSuite();
      clearInterval(progressInterval);

      setResults(testResults);
      setCurrentTest('Tests completed!');
    } catch (error) {
      console.error('Test execution error:', error);
      setCurrentTest('Test execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const generateReport = () => {
    if (results.length === 0) return '';
    return eventPlatformTester.generateReport();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <GlassCard className="p-8">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">
                Event Platform Test Suite
              </h2>
              <p className="text-white/70">
                Comprehensive testing for registration, badge management, and account cards
              </p>
            </div>

            {/* Test Controls */}
            <div className="flex gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={runTests}
                disabled={isRunning}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span>Running Tests...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 8a9 9 0 110-18 9 9 0 010 18z" />
                    </svg>
                    <span>Run Complete Test Suite</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Current Test Status */}
            {isRunning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"
              >
                <div className="flex items-center justify-center gap-2 text-blue-400">
                  <LoadingSpinner size="sm" color="blue" />
                  <span>{currentTest}</span>
                </div>
              </motion.div>
            )}

            {/* Test Results */}
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {results.reduce((sum, suite) => sum + suite.passed, 0)}
                    </div>
                    <div className="text-green-300">Passed</div>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {results.reduce((sum, suite) => sum + suite.failed, 0)}
                    </div>
                    <div className="text-red-300">Failed</div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {results.length}
                    </div>
                    <div className="text-blue-300">Test Suites</div>
                  </div>
                </div>

                {/* Detailed Results */}
                <div className="space-y-4">
                  {results.map((suite, suiteIndex) => (
                    <div key={suiteIndex} className="bg-white/5 rounded-xl p-6 border border-white/10">
                      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${suite.passed > suite.failed ? 'bg-green-400' : 'bg-red-400'}`} />
                        {suite.name}
                      </h3>

                      <div className="grid gap-3">
                        {suite.tests.map((test, testIndex) => (
                          <div
                            key={testIndex}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              test.passed
                                ? 'bg-green-500/10 border-green-500/20'
                                : 'bg-red-500/10 border-red-500/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`text-lg ${test.passed ? 'text-green-400' : 'text-red-400'}`}>
                                {test.passed ? '✅' : '❌'}
                              </span>
                              <div>
                                <div className="font-medium text-white">{test.testName}</div>
                                <div className="text-sm text-white/70">{test.message}</div>
                              </div>
                            </div>
                            <div className="text-sm text-white/60">
                              {test.duration}ms
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Report Download */}
                <div className="text-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const report = generateReport();
                      const blob = new Blob([report], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `event-platform-test-report-${new Date().toISOString().split('T')[0]}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 flex items-center gap-2 mx-auto"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download Report</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
