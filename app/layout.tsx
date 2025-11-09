import './globals.css';
import { ReactNode } from 'react';
import ThemeWrapper from '../components/ThemeWrapper';

export const metadata = {
  title: 'LinkLens — AI-powered URL Risk Visualizer',
  description: 'Analyze, visualize and track URL risk with AI + heuristics.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeWrapper>{children}</ThemeWrapper>
      </body>
    </html>
  );
}
