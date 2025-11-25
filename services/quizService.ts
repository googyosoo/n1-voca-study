
import { Vocabulary, Question, QuizType, UserProgress, DifficultyLevel } from '../types';
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

export const generateQuestions = (count: number, difficulty: DifficultyLevel, progress: UserProgress = {}): Question[] => {
  // Filter vocabulary by selected difficulty
  // If we strictly filter by one difficulty, we might not have enough unique words for a long session if the list is small.
  // Strategy: Prioritize selected difficulty, but fill with others if needed.
  
  const targetVocab = VOCABULARY_LIST.filter(v => v.difficulty === difficulty);
  
  // If we don't have enough words of this difficulty to fulfill the count (unlikely with full db, but possible with sample),
  // we mix in some from other levels to ensure the user gets a full quiz.
  let pool = [...targetVocab];
  if (pool.length < count) {
      const otherVocab = VOCABULARY_LIST.filter(v => v.difficulty !== difficulty);
      const needed = count - pool.length;
      pool = [...pool, ...shuffleArray(otherVocab).slice(0, needed)];
  }

  // Shuffle the pool and slice
  const shuffledVocab = shuffleArray(pool);
  const selectedVocab = shuffledVocab.slice(0, count);

  return selectedVocab.map((vocab) => {
    // Filter quiz types
    const validTypes = Object.values(QuizType).filter(t => {
        // Exclude types where the question prompts with Korean meaning
        if (t === QuizType.MeaningToKanji || t === QuizType.MeaningToExample) return false;

        // Filter out Kana-related quizzes for words where Kanji == Kana (e.g. Katakana words)
        if (vocab.kanji === vocab.kana) {
            if (t === QuizType.KanjiToKana || t === QuizType.KanaToKanji) return false;
        }

        // Filter out Example-related quizzes if no example exists
        const isExampleType = [
          QuizType.KanjiToExample,
          QuizType.KanaToExample,
          QuizType.ExampleToMeaning
        ].includes(t as QuizType);

        if (isExampleType && !vocab.example) {
          return false;
        }

        return true;
    });

    const type = validTypes[Math.floor(Math.random() * validTypes.length)];
    
    // Generate distractors efficiently
    // If the quiz type requires examples in options, we must pick distractors that HAVE examples.
    const isExampleTargetType = [
      QuizType.KanjiToExample, 
      QuizType.KanaToExample
    ].includes(type);

    let distractors: Vocabulary[] = [];
    
    if (isExampleTargetType) {
         // Custom distractor fetcher for example types to ensure distractors have examples
         const usedIds = new Set<number>();
         usedIds.add(vocab.id);
         let attempts = 0;
         while (distractors.length < 3 && attempts < 100) {
             const randomIndex = Math.floor(Math.random() * VOCABULARY_LIST.length);
             const candidate = VOCABULARY_LIST[randomIndex];
             // Ensure candidate has example
             if (!usedIds.has(candidate.id) && candidate.example) {
                 distractors.push(candidate);
                 usedIds.add(candidate.id);
             }
             attempts++;
         }
         // Fallback if not enough examples found (shouldn't happen with good data)
         if (distractors.length < 3) {
             const extra = getRandomDistractors(vocab.id, 3 - distractors.length);
             distractors = [...distractors, ...extra];
         }
    } else {
        // For standard types or ExampleToMeaning (where options are meanings), any distractor works
        distractors = getRandomDistractors(vocab.id, 3);
    }

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