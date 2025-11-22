import { Vocabulary, Question, QuizType, UserProgress } from '../types';
import { VOCABULARY_LIST } from '../constants';

const getRandomDistractors = (correctId: number, count: number): Vocabulary[] => {
  const distractors: Vocabulary[] = [];
  const available = VOCABULARY_LIST.filter((v) => v.id !== correctId);
  
  while (distractors.length < count && available.length > 0) {
    const randomIndex = Math.floor(Math.random() * available.length);
    distractors.push(available[randomIndex]);
    available.splice(randomIndex, 1);
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
  // Strategy: Prioritize words with < 2 correct answers to ensure "1-2 times" coverage.
  const unmastered = VOCABULARY_LIST.filter(v => (progress[v.id] || 0) < 2);
  const mastered = VOCABULARY_LIST.filter(v => (progress[v.id] || 0) >= 2);
  
  let selectedVocab: Vocabulary[] = [];

  // 1. Fill with unmastered words first
  if (unmastered.length > 0) {
    const shuffledUnmastered = shuffleArray(unmastered);
    selectedVocab = shuffledUnmastered.slice(0, count);
  }

  // 2. If we still need questions, fill with mastered words (Review mode)
  if (selectedVocab.length < count) {
    const remainingCount = count - selectedVocab.length;
    const shuffledMastered = shuffleArray(mastered);
    selectedVocab = [...selectedVocab, ...shuffledMastered.slice(0, remainingCount)];
  }
  
  // 3. Fallback: if total vocab list is smaller than count, just use what we have
  // (Not likely with 3000 words, but possible with small test set)

  // Shuffle the selected set so unmastered words aren't always at the start
  selectedVocab = shuffleArray(selectedVocab);

  return selectedVocab.map((vocab) => {
    // Randomly select a quiz type
    const types = Object.values(QuizType);
    const type = types[Math.floor(Math.random() * types.length)];
    
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
  const mastered = Object.values(progress).filter(count => count >= 2).length;
  const learning = Object.values(progress).filter(count => count === 1).length;
  const unlearned = total - mastered - learning;
  
  return { total, mastered, learning, unlearned };
};