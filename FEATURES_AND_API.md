# Aptitude Ace: Features & API Documentation

This document provides an overview of the key features of the Aptitude Ace application and details the API calls (Genkit AI flows and Supabase database interactions) that power them.

## Core Technologies

-   **Frontend**: Next.js, React, Tailwind CSS, ShadCN UI
-   **AI**: Google Gemini via Genkit
-   **Backend & Database**: Supabase (Authentication, Postgres Database)

---

## 1. User Authentication

### Features
- Secure user sign-up and sign-in using email and password.
- Protected routes to ensure only authenticated users can access the app.
- User-specific data storage for documents, questions, and test history.

### API Calls & Logic
-   **`src/components/login-form.tsx`**: Uses `@supabase/auth-ui-react` to render a pre-built, secure login form. The `providers` prop is set to `[]` to disable social logins.
-   **`src/middleware.ts`**: Intercepts all page requests. It checks for a valid user session using `supabase.auth.getUser()` and redirects unauthenticated users to the `/login` page.
-   **`src/app/auth/callback/route.ts`**: Handles the authentication callback from Supabase to finalize the session.
-   **`src/app/page.tsx`**: On the main page, it fetches the current user and their profile from the Supabase `profiles` table.

---

## 2. PDF Upload & Content Segregation

### Features
-   Upload one or more PDF documents at the same time.
-   AI automatically separates the content of each PDF into "theory" and a structured list of "questions".
-   Each question is identified with its text, multiple-choice options, and a suggested topic.

### API Calls & Logic
-   **Genkit Flow**: `contentSegregation` (`src/ai/flows/content-segregation.ts`)
    -   **Input**: A PDF file encoded as a Base64 data URI.
    -   **AI Model**: `gemini-1.5-flash-latest` (multimodal).
    -   **Process**: The AI analyzes the PDF content and extracts theory (formatted in Markdown) and questions (in a structured JSON format).
-   **Server Action**: `segregateContentAction` (`src/app/actions.ts`)
    -   This action is called from the `UploadTab` component.
    -   It takes the PDF data URI and file name.
    -   It calls the `contentSegregation` Genkit flow to process the PDF.
    -   It then saves the returned theory and questions to the `documents` and `questions` tables in Supabase, linking them to the current user.

---

## 3. Theory Zone & Document Management

### Features
-   View the extracted theory from all uploaded documents.
-   Rename and delete documents. Deleting a document also removes all its associated questions and test history.

### API Calls & Logic
-   **`src/components/theory-zone-tab.tsx`**: Displays the list of documents and their theory content.
-   **Server Action**: `deleteDocumentAction` (`src/app/actions.ts`)
    -   **Database**: Deletes a single record from the `documents` table. Thanks to `ON DELETE CASCADE` rules set up in the database, Supabase automatically handles the deletion of all related `questions` and `test_attempts`.
-   **Server Action**: `renameDocumentAction` (`src/app/actions.ts`)
    -   **Database**: Securely verifies document ownership and checks for name conflicts before updating the `source_file` field in the `documents` table.

---

## 4. Question Bank

### Features
-   View, filter, and manage all questions extracted from your PDFs.
-   Manually set or update a question's topic and difficulty.
-   Select an answer and have the AI verify if it's correct.
-   View a detailed, step-by-step solution for any question.
-   Chat with an AI tutor to ask follow-up questions about a solution.
-   Get general tips and tricks for solving a specific type of question.

### API Calls & Logic
-   **Genkit Flow**: `getSolution` (`src/ai/flows/question-helpers.ts`)
    -   **Server Action**: `getSolutionAction`
    -   **Process**: Generates a detailed solution, identifies the correct option, and estimates difficulty.
-   **Genkit Flow**: `askFollowUp` (`src/ai/flows/question-helpers.ts`)
    -   **Server Action**: `askFollowUpAction`
    -   **Process**: Provides a conversational answer to a user's question about a problem, using the original question, solution, and chat history as context.
-   **Genkit Flow**: `getTricks` (`src/ai/flows/question-helpers.ts`)
    -   **Server Action**: `getTricksAction`
    -   **Process**: Analyzes a question's topic and provides general strategies and shortcuts for that type of problem.
-   **Database**: Direct `update` calls to the `questions` table are made from `QuestionItem` (via the `onQuestionUpdate` prop passed down from `AptitudeAceClient`) to save changes to a question's `topic` or `difficulty`.

---

## 5. Bookmark & Revisit Questions

### Features
- Mark questions as "important" or "review later" with a bookmark button.
- A dedicated "Review" tab in the main interface shows all bookmarked questions.

### API Calls & Logic
-   **Database Setup**: This feature requires a schema change. You must add a new boolean column to your `questions` table.
    -   Run this SQL in your Supabase SQL Editor:
    ```sql
    ALTER TABLE public.questions
    ADD COLUMN is_bookmarked BOOLEAN DEFAULT FALSE;
    ```
-   **`src/components/question-item.tsx`**: A bookmark button on the question card calls the `onQuestionUpdate` function to toggle the `is_bookmarked` field in the database.
-   **`src/components/review-tab.tsx`**: This new component filters the full list of questions to show only those where `is_bookmarked` is `true`.

---

## 6. Mock Test Generator

### Features
-   Create custom mock tests based on filters (topic, difficulty, source PDF).
-   Set the number of questions and time per question.
-   If questions in the test don't have solutions yet, the AI generates them automatically before the test starts.
-   Take the test under timed conditions.
-   Receive immediate results upon completion, including a score and performance breakdown.
-   Get AI-generated feedback on your overall performance and specific areas of weakness.

### API Calls & Logic
-   **Genkit Flow**: `batchSolveQuestions` (`src/ai/flows/batch-question-solver.ts`)
    -   **Server Action**: `batchSolveQuestionsAction`
    -   **Process**: This is called before a test starts if any selected questions are missing solutions. It takes an array of questions and returns solutions, correct options, and difficulties for all of them in a single AI call. The results are then saved to the database.
-   **Genkit Flow**: `generateTestFeedback` (`src/ai/flows/test-feedback.ts`)
    -   **Server Action**: `generateTestFeedbackAction`
    -   **Process**: After a test is finished, this flow is called. It analyzes the user's answers, topics, and correctness to provide an overall feedback summary and a list of weak topics.
-   **Database**:
    -   When a test is completed, a new record is saved to the `tests` table.
    -   Each answer is saved as a record in the `test_attempts` table.

---

## 7. Dashboard, Analytics & Peer Comparison

### Features
-   An overview of key stats: uploaded PDFs, total questions, tests taken, and average score.
-   A GitHub-style activity calendar showing test frequency over the last year.
-   A bar chart showing your top-performing topics based on accuracy in tests.
-   **Peer Benchmarking**: Compare your topic accuracy against the anonymized average of all other users on the test results page.
-   A table of your most recent test results.

### API Calls & Logic
-   **Database RPC**: `get_topic_performance` (`src/components/dashboard-tab.tsx`)
    -   The dashboard calls a Supabase Remote Procedure Call (RPC) named `get_topic_performance`. This is a custom SQL function defined in the database that calculates the accuracy percentage for each topic across all of a user's test attempts.
-   **Database RPC (New)**: `get_topic_benchmark` (`src/components/test-generator-tab.tsx`)
    -   **Setup**: This feature requires creating a new SQL function in your Supabase database. Run this in your SQL Editor:
    ```sql
    CREATE OR REPLACE FUNCTION get_topic_benchmark(topic_text TEXT)
    RETURNS TABLE(global_accuracy REAL) AS $$
    BEGIN
        RETURN QUERY
        SELECT
            CASE
                WHEN COUNT(*) = 0 THEN 0
                ELSE (SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) * 100.0) / COUNT(*)
            END
        FROM
            public.test_attempts ta
        JOIN
            public.questions q ON ta.question_id = q.id
        WHERE
            q.topic = topic_text;
    END;
    $$ LANGUAGE plpgsql;
    ```
    -   **Server Action**: `getTopicBenchmarkAction` is called from the test results page for each topic. It calls the `get_topic_benchmark` RPC to fetch the global average accuracy for that topic.
-   **Database Queries**: The dashboard fetches all data from the `tests` and `documents` tables (filtered by user) to calculate stats and populate the activity calendar and recent tests table.
