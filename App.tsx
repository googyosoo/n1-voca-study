import React, { useState, useEffect } from 'react';
import { generateQuestions, getProgressStats } from './services/quizService';
import { playSound } from './services/soundService';
import { QuizState, UserProgress } from './types';
import QuizCard from './components/QuizCard';
import Button from './components/Button';
import ProgressBar from './components/ProgressBar';
import Timer from './components/Timer';
import { BookOpen, RefreshCw, Trophy, ArrowRight, BarChart3, Sparkles } from 'lucide-react';

const QUESTIONS_PER_SESSION = 20;

const App: React.FC = () => {
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [userProgress, setUserProgress] = useState<UserProgress>({});

  // Load progress from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('n1_vocab_progress');
    if (saved) {
      try {
        setUserProgress(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load progress", e);
      }
    }
  }, []);

  const saveProgress = (newProgress: UserProgress) => {
    setUserProgress(newProgress);
    localStorage.setItem('n1_vocab_progress', JSON.stringify(newProgress));
  };

  const startQuiz = () => {
    const questions = generateQuestions(QUESTIONS_PER_SESSION, userProgress);
    setQuizState({
      currentQuestionIndex: 0,
      score: 0,
      questions,
      isFinished: false,
      history: [],
    });
    setIsAnswered(false);
    setSelectedOptionId(null);
  };

  const handleAnswer = (optionId: number) => {
    if (!quizState || isAnswered) return;

    setSelectedOptionId(optionId);
    setIsAnswered(true);

    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    const isCorrect = optionId === currentQuestion.correctOptionId;

    // Play Sound Effect
    playSound(isCorrect ? 'correct' : 'incorrect');

    // Update User Progress if correct
    if (isCorrect) {
      const vocabId = currentQuestion.vocab.id;
      const currentCount = userProgress[vocabId] || 0;
      const newProgress = { ...userProgress, [vocabId]: currentCount + 1 };
      saveProgress(newProgress);
    }

    setQuizState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        score: isCorrect ? prev.score + 1 : prev.score,
        history: [
          ...prev.history,
          {
            question: currentQuestion,
            selectedOptionId: optionId,
            isCorrect,
          },
        ],
      };
    });
  };

  const nextQuestion = () => {
    if (!quizState) return;

    if (quizState.currentQuestionIndex >= quizState.questions.length - 1) {
      setQuizState((prev) => (prev ? { ...prev, isFinished: true } : null));
    } else {
      setQuizState((prev) =>
        prev
          ? { ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }
          : null
      );
      setIsAnswered(false);
      setSelectedOptionId(null);
    }
  };

  // Aesthetic Background Component
  const Background = () => (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
    </div>
  );

  // 1. Start Screen
  if (!quizState) {
    const stats = getProgressStats(userProgress);
    const percentage = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
        <Background />
        <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 p-8 text-center border border-white/50">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-lg shadow-blue-200 mb-8 transform rotate-3 hover:rotate-0 transition-all duration-500">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl font-black text-gray-800 mb-2 tracking-tight">N1 Vocab<br/>Master</h1>
          <p className="text-gray-500 mb-10 font-medium text-lg">
            JLPT N1 필수 어휘 완전 정복
          </p>

          <div className="bg-white/60 rounded-3xl p-6 mb-10 shadow-inner border border-white/60">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" /> 나의 학습 진행도
                </span>
                <span className="text-2xl font-black text-indigo-600">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 mb-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(79,70,229,0.3)]" 
                  style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-50 rounded-2xl p-2">
                  <div className="text-xs text-green-600 font-bold mb-1">완료</div>
                  <div className="font-black text-green-700">{stats.mastered}</div>
                </div>
                <div className="bg-orange-50 rounded-2xl p-2">
                  <div className="text-xs text-orange-600 font-bold mb-1">학습중</div>
                  <div className="font-black text-orange-700">{stats.learning}</div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-2">
                  <div className="text-xs text-gray-500 font-bold mb-1">미학습</div>
                  <div className="font-black text-gray-600">{stats.unlearned}</div>
                </div>
            </div>
          </div>

          <Button onClick={startQuiz} fullWidth className="text-xl py-5 shadow-xl shadow-indigo-200 transform transition hover:-translate-y-1 hover:shadow-2xl">
            <Sparkles className="w-5 h-5 mr-2 animate-pulse" /> 
            오늘의 학습 시작 ({QUESTIONS_PER_SESSION}문항)
          </Button>
        </div>
      </div>
    );
  }

  // 3. Result Screen
  if (quizState.isFinished) {
    const percentage = Math.round((quizState.score / quizState.questions.length) * 100);
    
    return (
      <div className="min-h-screen py-10 px-4 flex flex-col items-center">
        <Background />
        <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 overflow-hidden border border-white/50">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-10 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <Trophy className="w-20 h-20 mx-auto mb-6 text-yellow-300 drop-shadow-lg transform hover:scale-110 transition-transform duration-300" />
            <h2 className="text-3xl font-black mb-2 tracking-tight">Session Complete!</h2>
            <p className="opacity-90 font-medium text-indigo-100">오늘도 한 걸음 성장하셨네요.</p>
          </div>
          
          <div className="p-8 text-center">
             <div className="inline-block bg-gray-50 rounded-3xl px-8 py-4 mb-4 border border-gray-100">
               <div className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-1">Score</div>
               <div className="text-6xl font-black text-gray-800 leading-none">
                 {quizState.score}<span className="text-3xl text-gray-300 font-medium">/{quizState.questions.length}</span>
               </div>
             </div>
             <p className={`text-lg font-bold ${percentage >= 80 ? 'text-green-500' : 'text-orange-500'}`}>
               {percentage >= 80 ? '탁월한 실력입니다! 🎉' : '조금만 더 힘내세요! 💪'}
             </p>
          </div>

          <div className="px-6 pb-6 bg-gray-50/50 max-h-[400px] overflow-y-auto custom-scrollbar">
             <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider mb-4 px-2">Review Incorrect Answers</h3>
             <div className="space-y-3">
                {quizState.history.filter(h => !h.isCorrect).length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200">
                    <span className="text-4xl block mb-2">💯</span>
                    <p className="text-gray-500 font-medium">완벽합니다! 오답이 없어요.</p>
                  </div>
                ) : (
                  quizState.history.filter(h => !h.isCorrect).map((item, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center mb-3">
                         <span className="text-gray-900 font-black text-xl">{item.question.vocab.kanji}</span>
                         <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-full uppercase tracking-wide">Incorrect</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex gap-2 text-gray-600">
                            <span className="font-bold min-w-[30px] text-red-500">오답</span>
                            <span className="line-through opacity-70">{item.question.options.find(o => o.id === item.selectedOptionId)?.meaningKo || item.question.options.find(o => o.id === item.selectedOptionId)?.kanji}</span>
                        </div>
                        <div className="flex gap-2 text-gray-800">
                            <span className="font-bold min-w-[30px] text-green-500">정답</span>
                            <span className="font-medium">{item.question.vocab.meaningKo} <span className="text-gray-400 font-normal">({item.question.vocab.kana})</span></span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>

          <div className="p-8 bg-white">
            <Button onClick={startQuiz} fullWidth icon={<RefreshCw className="w-5 h-5 mr-2" />} className="mb-4 py-4 shadow-lg shadow-indigo-100">
               새로운 세션 시작하기
            </Button>
            <div className="text-center">
                <button onClick={() => setQuizState(null)} className="text-gray-400 text-sm font-medium hover:text-gray-700 transition-colors">
                    홈 화면으로 돌아가기
                </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Quiz Screen
  const currentQuestion = quizState.questions[quizState.currentQuestionIndex];

  return (
    <div className="min-h-screen flex flex-col items-center py-6 px-4 md:py-10 relative">
      <Background />
      <div className="w-full max-w-lg z-10">
        <div className="flex justify-between items-center mb-8 px-2">
            <div className="flex flex-col">
                <h1 className="font-black text-gray-800 text-xl tracking-tight">N1 Vocabulary</h1>
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Session in progress</span>
            </div>
            <div className="flex items-center gap-3">
                <Timer isActive={!quizState.isFinished} />
                <button 
                    onClick={() => setQuizState(null)} 
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/50 hover:bg-white text-gray-400 hover:text-red-500 transition-all"
                >
                    <span className="sr-only">Quit</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        </div>
        
        <ProgressBar current={quizState.currentQuestionIndex + 1} total={quizState.questions.length} />

        <div className="mt-6">
            <QuizCard 
              question={currentQuestion}
              onAnswer={handleAnswer}
              selectedOptionId={selectedOptionId}
              isAnswered={isAnswered}
            />
        </div>

        {isAnswered && (
          <div className="fixed bottom-0 left-0 w-full p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:relative md:bg-transparent md:border-0 md:shadow-none md:p-0 md:mt-8 animate-slide-up z-50">
             <div className="max-w-lg mx-auto">
                <Button onClick={nextQuestion} fullWidth variant="primary" className="flex items-center justify-center gap-3 h-16 text-xl font-bold shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-1 transition-all">
                  {quizState.currentQuestionIndex === quizState.questions.length - 1 ? '결과 보기' : '다음 문제'}
                  <ArrowRight className="w-6 h-6" />
                </Button>
             </div>
          </div>
        )}
      </div>
      {/* Spacer for fixed bottom button on mobile */}
      {isAnswered && <div className="h-24 md:hidden"></div>}
    </div>
  );
};

export default App;