// News generation removed — this is a no-op stub
export type NewsEventType = string;

export async function triggerNews(
  _eventType: NewsEventType,
  _data: {
    season_id: string;
    season_name?: string;
    metadata?: Record<string, any>;
    context?: string;
  }
): Promise<void> {
  // no-op
}
