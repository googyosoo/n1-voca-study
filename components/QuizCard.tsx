import React, { useState, useEffect } from 'react';
import { Question, QuizType, Vocabulary } from '../types';
import Button from './Button';
import { CheckCircle2, XCircle, HelpCircle, Volume2, Loader2, Sparkles } from 'lucide-react';
import { playTextToSpeech } from '../services/audioService';
import { generateExampleSentence } from '../services/contentService';

interface QuizCardProps {
  question: Question;
  onAnswer: (vocabId: number) => void;
  selectedOptionId: number | null;
  isAnswered: boolean;
}

const QuizCard: React.FC<QuizCardProps> = ({ question, onAnswer, selectedOptionId, isAnswered }) => {
  const { vocab, type, options } = question;
  const [isPlayingVocab, setIsPlayingVocab] = useState(false);
  const [isPlayingExample, setIsPlayingExample] = useState(false);
  const [example, setExample] = useState<string | undefined>(vocab.example);
  const [isLoadingExample, setIsLoadingExample] = useState(false);
  const [hasTriedGenerating, setHasTriedGenerating] = useState(false);

  useEffect(() => {
    setExample(vocab.example);
    setIsLoadingExample(false);
    setHasTriedGenerating(false);
  }, [vocab]);

  useEffect(() => {
    const fetchExample = async () => {
      if (isAnswered && !example && !isLoadingExample && !hasTriedGenerating) {
        setIsLoadingExample(true);
        setHasTriedGenerating(true);
        
        const generated = await generateExampleSentence(vocab.kanji, vocab.meaningKo);
        
        if (generated) {
            setExample(generated);
        }
        setIsLoadingExample(false);
      }
    };
    
    if (isAnswered && !example && !vocab.example) {
        fetchExample();
    }
  }, [isAnswered, example, vocab, isLoadingExample, hasTriedGenerating]);

  const getQuestionText = () => {
    switch (type) {
      case QuizType.KanjiToMeaning:
      case QuizType.KanjiToKana:
        return vocab.kanji;
      case QuizType.MeaningToKanji:
        return vocab.meaningKo;
      case QuizType.KanaToKanji:
        return vocab.kana;
      default:
        return '';
    }
  };

  const getOptionText = (option: Vocabulary) => {
    switch (type) {
      case QuizType.KanjiToMeaning:
        return option.meaningKo;
      case QuizType.KanjiToKana:
        return option.kana;
      case QuizType.MeaningToKanji:
      case QuizType.KanaToKanji:
        return option.kanji;
      default:
        return '';
    }
  };

  const getInstructionText = () => {
     switch (type) {
      case QuizType.KanjiToMeaning:
        return "이 단어의 의미는 무엇인가요?";
      case QuizType.KanjiToKana:
        return "이 단어는 어떻게 읽나요?";
      case QuizType.MeaningToKanji:
        return "이 뜻을 가진 단어는?";
      case QuizType.KanaToKanji:
        return "이 발음에 해당하는 단어는?";
      default:
        return '';
    }
  }

  const handlePlayAudio = async (text: string, isExample: boolean) => {
    if (!text) return;
    
    if (isExample) setIsPlayingExample(true);
    else setIsPlayingVocab(true);

    await playTextToSpeech(text);

    if (isExample) setIsPlayingExample(false);
    else setIsPlayingVocab(false);
  };

  return (
    <div className="w-full">
      {/* Key added to trigger animation on question change */}
      <div key={vocab.id} className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-xl shadow-indigo-100/40 p-6 md:p-8 mb-4 md:mb-6 text-center border border-white/60 relative overflow-hidden group transition-all duration-300 animate-fade-in">
        
        <div className="relative z-10">
            <p className="text-indigo-500 text-xs md:text-sm mb-2 md:mb-4 font-bold uppercase tracking-wide flex items-center justify-center gap-2">
                <HelpCircle className="w-3 h-3 md:w-4 md:h-4" />
                {getInstructionText()}
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-800 mb-4 md:mb-6 min-h-[3.5rem] md:min-h-[4rem] flex items-center justify-center break-keep tracking-tight drop-shadow-sm leading-tight transition-all duration-200">
            {getQuestionText()}
            </h2>
            
            {/* Pronunciation Hint */}
            <div className={`h-8 transition-all duration-300 ease-out ${type === QuizType.KanjiToMeaning && isAnswered ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'}`}>
            {type === QuizType.KanjiToMeaning && isAnswered && (
                <p className="text-indigo-500 text-lg md:text-xl font-bold bg-indigo-50 inline-block px-4 py-1 rounded-full">
                    {vocab.kana}
                </p>
            )}
            </div>
        </div>
        
        {/* Decoration */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-indigo-100 rounded-full opacity-50 mix-blend-multiply filter blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-100 rounded-full opacity-50 mix-blend-multiply filter blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:gap-3">
        {options.map((option, idx) => {
          let variant: 'secondary' | 'success' | 'danger' = 'secondary';
          const isSelected = selectedOptionId === option.id;
          const isCorrect = option.id === question.correctOptionId;

          if (isAnswered) {
            if (isCorrect) {
              variant = 'success';
            } else if (isSelected && !isCorrect) {
              variant = 'danger';
            }
          }

          return (
            <div key={`${question.vocab.id}-${option.id}`} className="animate-slide-in" style={{ animationDelay: `${idx * 50}ms` }}>
                <Button
                variant={variant}
                className={`relative flex items-center justify-center min-h-[4rem] md:min-h-[4.5rem] text-base md:text-lg transition-all duration-200 ${
                    isAnswered && !isCorrect && !isSelected ? 'opacity-50 bg-white/40 scale-[0.98] border-transparent' : ''
                } ${!isAnswered && 'hover:scale-[1.01] hover:shadow-md active:scale-[0.99]'}`}
                onClick={() => !isAnswered && onAnswer(option.id)}
                disabled={isAnswered}
                fullWidth
                // Ensure no tap delay on mobile
                style={{ touchAction: 'manipulation' }}
                >
                <span className="break-keep font-bold z-10 relative">{getOptionText(option)}</span>
                {isAnswered && isCorrect && <CheckCircle2 className="absolute right-4 md:right-5 w-5 h-5 md:w-6 md:h-6 animate-in zoom-in duration-200 text-white z-10" />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="absolute right-4 md:right-5 w-5 h-5 md:w-6 md:h-6 animate-in zoom-in duration-200 text-white z-10" />}
                </Button>
            </div>
          );
        })}
      </div>
      
      {isAnswered && (
        <div className="mt-4 md:mt-6 p-5 md:p-6 bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-lg shadow-indigo-100/50 border border-white/60 text-left animate-fade-in overflow-hidden relative duration-200">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            
            <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="flex items-baseline gap-2 md:gap-3">
                    <span className="text-2xl md:text-3xl font-black text-gray-800">{vocab.kanji}</span>
                    <span className="text-lg md:text-xl text-indigo-600 font-bold">[{vocab.kana}]</span>
                </div>
                <button 
                    // IMPORTANT: Play the KANA version to ensure Japanese pronunciation
                    onClick={() => handlePlayAudio(vocab.kana, false)}
                    disabled={isPlayingVocab}
                    className="p-2 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors flex items-center justify-center disabled:opacity-50 active:scale-95 touch-manipulation"
                    title="Pronounce Vocabulary (Japanese)"
                >
                    {isPlayingVocab ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                </button>
            </div>

            <p className="text-gray-800 font-bold text-lg md:text-xl mb-1 md:mb-2 leading-relaxed">{vocab.meaningKo}</p>
            <p className="text-gray-500 text-xs md:text-sm font-medium italic mb-4 md:mb-5">{vocab.meaningEn}</p>
            
            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-100 bg-gray-50/50 -mx-5 -mb-5 p-5 md:-mx-6 md:-mb-6 md:p-6 min-h-[5rem]">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        {isLoadingExample ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" /> Generating...
                            </>
                        ) : (
                            <>
                                Example Sentence
                                {!vocab.example && <Sparkles className="w-3 h-3 text-amber-400" />} 
                            </>
                        )}
                    </p>
                    {example && (
                        <button 
                            onClick={() => handlePlayAudio(example, true)}
                            disabled={isPlayingExample}
                            className="p-1.5 rounded-full bg-white border border-indigo-100 text-indigo-500 hover:bg-indigo-50 transition-colors flex items-center justify-center disabled:opacity-50 shadow-sm active:scale-95 touch-manipulation"
                            title="Pronounce Example"
                        >
                            {isPlayingExample ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                        </button>
                    )}
                </div>
                
                {isLoadingExample ? (
                    <div className="space-y-2 animate-pulse">
                        <div className="h-3 md:h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 md:h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                ) : example ? (
                    <p className="text-gray-700 text-sm md:text-base leading-relaxed font-medium animate-in fade-in duration-300">"{example}"</p>
                ) : (
                    <p className="text-gray-400 text-xs md:text-sm italic">No example available.</p>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default QuizCard;