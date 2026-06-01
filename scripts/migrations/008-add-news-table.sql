-- Migration: Add news table for AI-generated news system
-- Created: 2026-06-01

CREATE TABLE IF NOT EXISTS news (
  id VARCHAR(255) PRIMARY KEY,
  
  -- Bilingual Content
  title_en TEXT NOT NULL,
  title_ml TEXT,
  content_en TEXT NOT NULL,
  content_ml TEXT,
  summary_en TEXT,
  summary_ml TEXT,
  
  -- Classification
  category VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  
  -- Season Context
  season_id VARCHAR(50),
  season_name VARCHAR(255),
  
  -- Publishing
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  
  -- Generation
  generated_by VARCHAR(20) DEFAULT 'ai',
  edited_by_admin BOOLEAN DEFAULT false,
  tone VARCHAR(20),
  reporter_en VARCHAR(100),
  reporter_ml VARCHAR(100),
  
  -- Metadata
  metadata JSONB,
  image_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_news_season ON news(season_id);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_event_type ON news(event_type);

-- Comments
COMMENT ON TABLE news IS 'AI-generated bilingual news articles for tournament events';
COMMENT ON COLUMN news.title_en IS 'English headline (under 80 characters)';
COMMENT ON COLUMN news.title_ml IS 'Malayalam headline (under 80 characters)';
COMMENT ON COLUMN news.content_en IS 'English article content (2-3 paragraphs)';
COMMENT ON COLUMN news.content_ml IS 'Malayalam article content (2-3 paragraphs)';
COMMENT ON COLUMN news.tone IS 'neutral, dramatic, funny, or harsh';
COMMENT ON COLUMN news.generated_by IS 'ai or manual';
