import { Vocabulary, Question, QuizType, UserProgress } from '../types';
import { VOCABULARY_LIST } from '../constants';

// Optimized for large datasets (O(1) selection instead of array splicing)
const getRandomDistractors = (correctId: number, count: number): Vocabulary[] => {
  const distractors: Vocabulary[] = [];
  const usedIds = new Set<number>();
  usedIds.add(correctId);

  const totalVocab = VOCABULARY_LIST.length;

  // Fallback safety: if total vocab is too small, return whatever is available
  if (totalVocab <= count + 1) {
    return VOCABULARY_LIST.filter(v => v.id !== correctId).slice(0, count);
  }

  while (distractors.length < count) {
    const randomIndex = Math.floor(Math.random() * totalVocab);
    const candidate = VOCABULARY_LIST[randomIndex];

    if (!usedIds.has(candidate.id)) {
      distractors.push(candidate);
      usedIds.add(candidate.id);
    }
  }
  
  return distractors;
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const generateQuestions = (count: number, progress: UserProgress = {}): Question[] => {
  // Pure Random Mode: Shuffle the entire vocabulary list every time
  // This ensures maximum variety and that users don't see the same words repeatedly
  // regardless of their mastery status.
  const shuffledVocab = shuffleArray(VOCABULARY_LIST);
  const selectedVocab = shuffledVocab.slice(0, count);

  return selectedVocab.map((vocab) => {
    // Filter quiz types
    const validTypes = Object.values(QuizType).filter(t => {
        if (vocab.kanji === vocab.kana) {
            // If Kanji and Kana are same (usually katakana words or hiragana only),
            // disable reading/writing quizzes that would be identical
            return t !== QuizType.KanjiToKana && t !== QuizType.KanaToKanji;
        }
        return true;
    });

    const type = validTypes[Math.floor(Math.random() * validTypes.length)];
    
    // Generate distractors efficiently
    const distractors = getRandomDistractors(vocab.id, 3);
    const options = shuffleArray([vocab, ...distractors]);
    
    return {
      vocab,
      type,
      options,
      correctOptionId: vocab.id,
    };
  });
};

export const getProgressStats = (progress: UserProgress) => {
  const total = VOCABULARY_LIST.length;
  let mastered = 0;
  let learning = 0;
  
  // Optimize stat calculation
  const progressValues = Object.values(progress);
  for (const count of progressValues) {
      if (count >= 2) mastered++;
      else if (count === 1) learning++;
  }
  
  const unlearned = total - mastered - learning;
  
  return { total, mastered, learning, unlearned };
};