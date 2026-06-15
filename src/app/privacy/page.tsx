import type { Metadata } from 'next';
import LegalPage from '@/Features/Legal/LegalPage';
import { SUPPORT_EMAIL } from '@/Lib/Constants';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Quiz Dart collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Quiz Dart (&ldquo;we&rdquo;, &ldquo;us&rdquo;) lets you generate, play, and share quizzes.
        This policy explains what we collect, why, and the choices you have. We
        collect the minimum needed to run the service.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account</strong> — when you sign in with Google we receive your
          name, email address, and profile image. You may also set a public
          username shown on leaderboards.
        </li>
        <li>
          <strong>Content you create</strong> — quizzes, questions, topics, and
          any source material you paste in to generate a quiz.
        </li>
        <li>
          <strong>Gameplay</strong> — your runs, scores, answers, streaks, and
          timing, used for your history, stats, and leaderboards.
        </li>
        <li>
          <strong>On your device</strong> — settings and a local play profile are
          stored in your browser (localStorage), not on our servers.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To provide sign-in, your library, gameplay, stats, and leaderboards.</li>
        <li>To generate quizzes and images from the topics/material you submit.</li>
        <li>To operate, secure, and improve the service.</li>
      </ul>
      <p>We do not sell your personal data or use it for third-party advertising.</p>

      <h2>Service providers</h2>
      <p>We share data with processors only as needed to run Quiz Dart:</p>
      <ul>
        <li><strong>Google</strong> — sign-in (OAuth).</li>
        <li><strong>Google Gemini</strong> — generating quiz questions from your topics/material.</li>
        <li><strong>Replicate</strong> — generating quiz images.</li>
        <li><strong>ElevenLabs</strong> — optional host-voice narration (only when enabled).</li>
        <li><strong>Turso</strong> — database hosting; <strong>Railway</strong> — application hosting.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use a single essential cookie to keep you signed in. We do not use
        advertising or third-party tracking cookies.
      </p>

      <h2>Retention</h2>
      <p>
        We keep your account and content until you delete them. You can delete
        your account at any time from Settings, which removes your profile, your
        quizzes, and your gameplay data.
      </p>

      <h2>Your rights</h2>
      <p>
        You can access, export, and delete your data from <strong>Settings</strong>:
        &ldquo;Export my data&rdquo; downloads your quizzes and history as JSON, and
        &ldquo;Delete account&rdquo; permanently removes your data. Depending on where you
        live (e.g. the EEA/UK or California), you may have additional rights to
        access, correct, or restrict processing of your data.
      </p>

      <h2>Children</h2>
      <p>Quiz Dart is not directed to children under 13, and we do not knowingly collect their data.</p>

      <h2>Contact</h2>
      <p>
        Questions or requests: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
