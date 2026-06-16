export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      chat_messages: {
        Row: {
          id: string;
          created_at: string;
          role: 'user' | 'assistant';
          content: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          role: 'user' | 'assistant';
          content: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          role?: 'user' | 'assistant';
          content?: string;
        };
      };
      assignments: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          description: string | null;
          subject: string;
          due_date: string;
          priority: 'low' | 'medium' | 'high';
          status: 'pending' | 'in_progress' | 'completed';
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          description?: string | null;
          subject: string;
          due_date: string;
          priority?: 'low' | 'medium' | 'high';
          status?: 'pending' | 'in_progress' | 'completed';
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          subject?: string;
          due_date?: string;
          priority?: 'low' | 'medium' | 'high';
          status?: 'pending' | 'in_progress' | 'completed';
        };
      };
      study_sessions: {
        Row: {
          id: string;
          created_at: string;
          subject: string;
          duration_minutes: number;
          notes: string | null;
          date: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          subject: string;
          duration_minutes: number;
          notes?: string | null;
          date: string;
        };
        Update: {
          id?: string;
          subject?: string;
          duration_minutes?: number;
          notes?: string | null;
          date?: string;
        };
      };
      meals: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          calories: number | null;
          protein: number | null;
          carbs: number | null;
          date: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          date: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          notes?: string | null;
        };
      };
      workouts: {
        Row: {
          id: string;
          created_at: string;
          type: string;
          duration_minutes: number;
          calories_burned: number | null;
          notes: string | null;
          date: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          type: string;
          duration_minutes: number;
          calories_burned?: number | null;
          notes?: string | null;
          date: string;
        };
        Update: {
          id?: string;
          type?: string;
          duration_minutes?: number;
          calories_burned?: number | null;
          notes?: string | null;
        };
      };
      flashcard_decks: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          subject: string;
          cards_count: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          subject: string;
          cards_count?: number;
        };
        Update: {
          id?: string;
          name?: string;
          subject?: string;
          cards_count?: number;
        };
      };
      flashcards: {
        Row: {
          id: string;
          created_at: string;
          deck_id: string;
          front: string;
          back: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          deck_id: string;
          front: string;
          back: string;
        };
        Update: {
          id?: string;
          front?: string;
          back?: string;
        };
      };
    };
  };
}
