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
  // Optimized selection strategy
  const unmastered = [];
  const mastered = [];

  // Single pass filtering is faster than multiple filter calls
  for (const v of VOCABULARY_LIST) {
    if ((progress[v.id] || 0) < 2) {
        unmastered.push(v);
    } else {
        mastered.push(v);
    }
  }
  
  let selectedVocab: Vocabulary[] = [];

  // 1. Prioritize unmastered words (Shuffle only what we need if possible, but shuffling full array provides better randomness)
  if (unmastered.length > 0) {
    const shuffledUnmastered = shuffleArray(unmastered);
    selectedVocab = shuffledUnmastered.slice(0, count);
  }

  // 2. Fill with mastered words if needed
  if (selectedVocab.length < count && mastered.length > 0) {
    const remainingCount = count - selectedVocab.length;
    const shuffledMastered = shuffleArray(mastered);
    selectedVocab = [...selectedVocab, ...shuffledMastered.slice(0, remainingCount)];
  }
  
  // If we still don't have enough (e.g., total vocab < count), just use what we have
  // Then shuffle the final mix so unmastered questions aren't always first
  selectedVocab = shuffleArray(selectedVocab);

  return selectedVocab.map((vocab) => {
    // Filter quiz types
    const validTypes = Object.values(QuizType).filter(t => {
        if (vocab.kanji === vocab.kana) {
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