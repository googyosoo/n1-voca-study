export interface Vocabulary {
  id: number;
  kanji: string;
  kana: string;
  meaningEn: string;
  meaningKo: string;
  example?: string;
}

export enum QuizType {
  KanjiToMeaning = 'KanjiToMeaning', // 漢字 보고 뜻 맞추기
  MeaningToKanji = 'MeaningToKanji', // 뜻 보고 漢字 맞추기
  KanjiToKana = 'KanjiToKana',     // 漢字 보고 요미가나 맞추기
  KanaToKanji = 'KanaToKanji'      // 요미가나 보고 漢字 맞추기
}

export interface Question {
  vocab: Vocabulary;
  type: QuizType;
  options: Vocabulary[]; // 4 options including the correct one
  correctOptionId: number;
}

export interface QuizState {
  currentQuestionIndex: number;
  score: number;
  questions: Question[];
  isFinished: boolean;
  history: {
    question: Question;
    selectedOptionId: number;
    isCorrect: boolean;
  }[];
}

export type UserProgress = Record<number, number>; // vocabId -> correctCount