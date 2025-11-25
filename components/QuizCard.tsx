
import React, { useState, useEffect } from 'react';
import { Question, QuizType, Vocabulary } from '../types';
import Button from './Button';
import { CheckCircle2, XCircle, HelpCircle, Volume2, Loader2, Sparkles, Quote } from 'lucide-react';
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
  const [playingOptionId, setPlayingOptionId] = useState<number | null>(null);
  const [example, setExample] = useState<string | undefined>(vocab.example);
  const [isLoadingExample, setIsLoadingExample] = useState(false);
  const [hasTriedGenerating, setHasTriedGenerating] = useState(false);

  useEffect(() => {
    setExample(vocab.example);
    setIsLoadingExample(false);
    setHasTriedGenerating(false);
    setPlayingOptionId(null);
  }, [vocab]);

  useEffect(() => {
    const fetchExample = async () => {
      // Only fetch if we need it for display later AND it's missing
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

  // Helper to mask the target word in an example sentence
  const maskWordInSentence = (sentence: string, word: Vocabulary) => {
    if (!sentence) return '';
    
    const kanjiWord = word.kanji;
    let result = sentence;

    // Attempt 1: Exact Kanji match
    if (result.includes(kanjiWord)) {
        return result.split(kanjiWord).join('_______');
    }
    
    // Attempt 2: Stem match for verbs/adjectives (e.g., 懐く -> 懐)
    const trailingKana = kanjiWord.match(/[ぁ-ん]+$/);
    if (trailingKana) {
        const stem = kanjiWord.substring(0, kanjiWord.length - trailingKana[0].length);
        if (stem.length > 0 && result.includes(stem)) {
            return result.split(stem).join('_______');
        }
    }

    // Attempt 3: Fallback - if the Kana matches (rare for Kanji words in context but possible)
    if (result.includes(word.kana)) {
        return result.split(word.kana).join('_______');
    }
    
    return result;
  };

  const getQuestionText = () => {
    switch (type) {
      case QuizType.KanjiToMeaning:
      case QuizType.KanjiToKana:
      case QuizType.KanjiToExample:
        return vocab.kanji;
      case QuizType.MeaningToKanji:
      case QuizType.MeaningToExample:
        return vocab.meaningKo;
      case QuizType.KanaToKanji:
      case QuizType.KanaToExample:
        return vocab.kana;
      case QuizType.ExampleToMeaning:
        // Mask the word to create a Cloze test style question
        return vocab.example ? maskWordInSentence(vocab.example, vocab) : vocab.kanji;
      default:
        return '';
    }
  };

  const getOptionText = (option: Vocabulary) => {
    switch (type) {
      case QuizType.KanjiToMeaning:
      case QuizType.ExampleToMeaning:
        return option.meaningKo;
      case QuizType.KanjiToKana:
        return option.kana;
      case QuizType.MeaningToKanji:
      case QuizType.KanaToKanji:
        return option.kanji;
      case QuizType.KanjiToExample:
      case QuizType.MeaningToExample:
      case QuizType.KanaToExample:
        // Mask the word in options too, so user matches context, not just the word text
        return option.example ? maskWordInSentence(option.example, option) : "No example available";
      default:
        return '';
    }
  };

  // Determine which text to play for audio.
  // For Japanese words (Kanji), we prefer Kana to ensure correct pronunciation.
  // For Sentences, we use the full text.
  const getAudioSource = (item: Vocabulary, context: 'question' | 'option'): string | null => {
    if (context === 'question') {
        // Spoiler prevention: Don't play audio if the quiz asks for the reading!
        if (type === QuizType.KanjiToKana) return null;
        
        switch (type) {
            case QuizType.KanjiToMeaning:
            case QuizType.KanjiToExample:
            case QuizType.KanaToKanji: // Question is Kana
                return item.kana; 
            case QuizType.ExampleToMeaning:
                return item.example || null;
            default:
                return null;
        }
    } else {
        // Options
        switch (type) {
            case QuizType.MeaningToKanji: // Options are Kanji
            case QuizType.KanaToKanji: // Options are Kanji
                return item.kana;
            case QuizType.KanjiToKana: // Options are Kana
                 return item.kana;
            case QuizType.KanjiToExample:
            case QuizType.MeaningToExample:
            case QuizType.KanaToExample:
                return item.example || null;
            default:
                return null;
        }
    }
  };

  const getInstructionText = () => {
     switch (type) {
      case QuizType.KanjiToMeaning:
        return "이 단어의 의미는?";
      case QuizType.KanjiToKana:
        return "이 단어의 읽는 법은?";
      case QuizType.MeaningToKanji:
        return "이 뜻을 가진 단어는?";
      case QuizType.KanaToKanji:
        return "이 발음의 단어는?";
      case QuizType.KanjiToExample:
        return "이 단어가 들어갈 알맞은 예문은?";
      case QuizType.MeaningToExample:
        return "이 뜻에 해당하는 단어의 예문은?";
      case QuizType.KanaToExample:
        return "이 발음의 단어가 들어갈 예문은?";
      case QuizType.ExampleToMeaning:
        return "빈칸에 들어갈 단어의 의미는?";
      default:
        return '알맞은 답을 고르세요';
    }
  }

  const handlePlayAudio = async (text: string, category: 'vocab' | 'example' | 'option', optionId?: number) => {
    if (!text) return;
    
    if (category === 'vocab') setIsPlayingVocab(true);
    else if (category === 'example') setIsPlayingExample(true);
    else if (category === 'option' && optionId) setPlayingOptionId(optionId);

    await playTextToSpeech(text);

    if (category === 'vocab') setIsPlayingVocab(false);
    else if (category === 'example') setIsPlayingExample(false);
    else if (category === 'option') setPlayingOptionId(null);
  };

  // Determine layout styles based on content length
  const isLongTextOption = [
    QuizType.KanjiToExample, 
    QuizType.MeaningToExample, 
    QuizType.KanaToExample
  ].includes(type);

  const isLongTextQuestion = type === QuizType.ExampleToMeaning;
  
  // Check if we should show audio button for the question
  const questionAudioText = getAudioSource(vocab, 'question');

  return (
    <div className="w-full">
      {/* Question Card */}
      <div key={vocab.id} className="bg-white/70 backdrop-blur-md rounded-[2rem] shadow-xl shadow-indigo-100/40 p-6 md:p-8 mb-4 md:mb-6 text-center border border-white/60 relative overflow-hidden group transition-all duration-300 animate-fade-in">
        
        <div className="relative z-10">
            <p className="text-indigo-500 text-xs md:text-sm mb-2 md:mb-4 font-bold uppercase tracking-wide flex items-center justify-center gap-2">
                <HelpCircle className="w-3 h-3 md:w-4 md:h-4" />
                {getInstructionText()}
            </p>
            
            <div className={`flex items-center justify-center gap-3 ${isLongTextQuestion ? 'flex-wrap' : ''}`}>
                <h2 className={`${isLongTextQuestion ? 'text-xl md:text-2xl leading-relaxed text-left' : 'text-4xl md:text-5xl text-center'} font-black text-gray-800 mb-4 md:mb-6 min-h-[3.5rem] md:min-h-[4rem] flex items-center justify-center break-keep tracking-tight drop-shadow-sm transition-all duration-200`}>
                {isLongTextQuestion && <Quote className="w-6 h-6 md:w-8 md:h-8 text-indigo-200 inline-block mr-2 -mt-4 transform rotate-180" />}
                {getQuestionText()}
                {isLongTextQuestion && <Quote className="w-6 h-6 md:w-8 md:h-8 text-indigo-200 inline-block ml-2 -mb-4" />}
                </h2>

                {questionAudioText && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePlayAudio(questionAudioText, 'vocab'); 
                        }}
                        disabled={isPlayingVocab}
                        className="p-3 rounded-full bg-indigo-50 text-indigo-500 hover:bg-indigo-100 hover:text-indigo-600 transition-colors disabled:opacity-50 touch-manipulation active:scale-95 flex-shrink-0 shadow-sm"
                        title="Listen"
                    >
                        {isPlayingVocab ? <Loader2 className="w-6 h-6 animate-spin" /> : <Volume2 className="w-6 h-6" />}
                    </button>
                )}
            </div>
            
            {/* Pronunciation Hint for Kanji Question */}
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

      {/* Options Grid */}
      <div className={`grid ${isLongTextOption ? 'grid-cols-1 gap-3' : 'grid-cols-1 gap-2 md:gap-3'}`}>
        {options.map((option, idx) => {
          let variant: 'secondary' | 'success' | 'danger' = 'secondary';
          const isSelected = selectedOptionId === option.id;
          const isCorrect = option.id === question.correctOptionId;
          const optionAudioText = getAudioSource(option, 'option');
          const isPlayingThisOption = playingOptionId === option.id;

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
                className={`relative flex items-center 
                  ${isLongTextOption ? 'min-h-[5rem] md:min-h-[6rem] text-sm md:text-base px-6 py-3 justify-between' : 'min-h-[4rem] md:min-h-[4.5rem] text-base md:text-lg justify-center'} 
                  transition-all duration-200 
                  ${isAnswered && !isCorrect && !isSelected ? 'opacity-50 bg-white/40 scale-[0.98] border-transparent' : ''} 
                  ${!isAnswered && 'hover:scale-[1.01] hover:shadow-md active:scale-[0.99]'}
                `}
                onClick={() => !isAnswered && onAnswer(option.id)}
                disabled={isAnswered}
                fullWidth
                style={{ touchAction: 'manipulation' }}
                >
                <div className={`flex items-center gap-3 ${isLongTextOption ? 'w-full' : ''}`}>
                    <span className={`break-keep font-bold z-10 relative text-left ${isLongTextOption ? 'flex-1 leading-snug' : ''}`}>
                        {getOptionText(option)}
                    </span>
                    
                    {/* Option Audio Button - Only show if audio source exists and not answered yet (or always?) - Let's show always for learning */}
                    {optionAudioText && !isAnswered && (
                         <div 
                            className="p-2 rounded-full hover:bg-black/5 text-current/50 hover:text-current transition-colors cursor-pointer z-20 active:scale-90"
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePlayAudio(optionAudioText, 'option', option.id);
                            }}
                            role="button"
                            aria-label="Listen to option"
                         >
                            {isPlayingThisOption ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                         </div>
                    )}
                </div>
                
                {/* Result Icons */}
                {isAnswered && isCorrect && <CheckCircle2 className="absolute right-4 md:right-5 w-5 h-5 md:w-6 md:h-6 animate-in zoom-in duration-200 text-white z-10 flex-shrink-0" />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="absolute right-4 md:right-5 w-5 h-5 md:w-6 md:h-6 animate-in zoom-in duration-200 text-white z-10 flex-shrink-0" />}
                </Button>
            </div>
          );
        })}
      </div>
      
      {/* Result Card (Explanation) */}
      {isAnswered && (
        <div className="mt-4 md:mt-6 p-5 md:p-6 bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-lg shadow-indigo-100/50 border border-white/60 text-left animate-fade-in overflow-hidden relative duration-200">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            
            <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="flex items-baseline gap-2 md:gap-3">
                    <span className="text-2xl md:text-3xl font-black text-gray-800">{vocab.kanji}</span>
                    <span className="text-lg md:text-xl text-indigo-600 font-bold">[{vocab.kana}]</span>
                </div>
                <button 
                    onClick={() => handlePlayAudio(vocab.kana, 'vocab')}
                    disabled={isPlayingVocab}
                    className="p-2 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors flex items-center justify-center disabled:opacity-50 active:scale-95 touch-manipulation"
                    title="Pronounce Vocabulary"
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
                            onClick={() => handlePlayAudio(example, 'example')}
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
