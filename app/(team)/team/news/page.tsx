import { Metadata } from 'next';
import TeamNewsClient from './TeamNewsClient';

export const metadata: Metadata = {
  title: 'News | Team Dashboard',
  description: 'Latest news and updates from Turf Cats eFootball League',
};

export default function TeamNewsPage() {
  return <TeamNewsClient />;
}
