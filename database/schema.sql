-- GTimes — Database Schema
-- Run once on the gtimes_db database

CREATE DATABASE IF NOT EXISTS gtimes_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gtimes_db;

-- Admin users
CREATE TABLE IF NOT EXISTS admins (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(100) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  name       VARCHAR(200) NOT NULL,
  bio        TEXT DEFAULT NULL,
  avatar     VARCHAR(300) DEFAULT NULL,
  role       ENUM('super','editor','author') DEFAULT 'author',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  expires    INT(11) UNSIGNED NOT NULL,
  data       MEDIUMTEXT
);

-- Article categories
CREATE TABLE IF NOT EXISTS categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500) DEFAULT NULL,
  color       VARCHAR(20) DEFAULT '#00663A',
  sort_order  INT DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Articles
CREATE TABLE IF NOT EXISTS articles (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(500) NOT NULL,
  slug         VARCHAR(500) NOT NULL UNIQUE,
  excerpt      TEXT,
  content      LONGTEXT,
  content_hi   LONGTEXT DEFAULT NULL,
  content_te   LONGTEXT DEFAULT NULL,
  cover_image  VARCHAR(300) DEFAULT NULL,
  category_id  INT DEFAULT NULL,
  author_name  VARCHAR(200) DEFAULT 'GTimes Staff',
  status       ENUM('draft','published') DEFAULT 'draft',
  featured     TINYINT(1) DEFAULT 0,
  views        INT DEFAULT 0,
  published_at DATETIME DEFAULT NULL,
  created_by   INT DEFAULT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(500) NOT NULL,
  slug         VARCHAR(500) NOT NULL UNIQUE,
  description  TEXT,
  cover_image  VARCHAR(300) DEFAULT NULL,
  location     VARCHAR(300) DEFAULT NULL,
  event_date   DATE DEFAULT NULL,
  event_time   VARCHAR(50) DEFAULT NULL,
  campus       VARCHAR(50) DEFAULT 'all',
  status       ENUM('upcoming','ongoing','completed') DEFAULT 'upcoming',
  featured     TINYINT(1) DEFAULT 0,
  created_by   INT DEFAULT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- Gallery albums
CREATE TABLE IF NOT EXISTS gallery_albums (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(300) NOT NULL,
  slug        VARCHAR(300) NOT NULL UNIQUE,
  description TEXT DEFAULT NULL,
  cover_image VARCHAR(300) DEFAULT NULL,
  campus      VARCHAR(50) DEFAULT 'all',
  is_active   TINYINT(1) DEFAULT 1,
  created_by  INT DEFAULT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- Gallery photos
CREATE TABLE IF NOT EXISTS gallery_photos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  album_id    INT NOT NULL,
  filename    VARCHAR(300) NOT NULL,
  caption     VARCHAR(500) DEFAULT NULL,
  sort_order  INT DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (album_id) REFERENCES gallery_albums(id) ON DELETE CASCADE
);

-- Videos
CREATE TABLE IF NOT EXISTS videos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(500) NOT NULL,
  description TEXT DEFAULT NULL,
  youtube_url VARCHAR(500) NOT NULL,
  youtube_id  VARCHAR(50) DEFAULT NULL,
  thumbnail   VARCHAR(300) DEFAULT NULL,
  category    VARCHAR(100) DEFAULT 'general',
  featured    TINYINT(1) DEFAULT 0,
  status      ENUM('draft','published') DEFAULT 'published',
  created_by  INT DEFAULT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- Comments (with moderation)
CREATE TABLE IF NOT EXISTS comments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL,
  name       VARCHAR(200) NOT NULL,
  email      VARCHAR(200) DEFAULT NULL,
  content    TEXT NOT NULL,
  status     ENUM('pending','approved','spam') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  value       TEXT,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default admin (password: gtimes@admin — CHANGE IMMEDIATELY)
INSERT IGNORE INTO admins (username, password, name, role)
VALUES ('admin', '$2b$10$FYmK8Q/xQ3jxokXbxQEJ9Oz2metBrfknl8ja46D8cRjiCFhDyH4D6', 'Super Admin', 'super');

-- Default categories
INSERT IGNORE INTO categories (name, slug, color, sort_order) VALUES
  ('School News',   'school-news',  '#00663A', 1),
  ('Achievements',  'achievements', '#1F1B76', 2),
  ('Sports',        'sports',       '#e63946', 3),
  ('Campus Life',   'campus-life',  '#B5D236', 4),
  ('Education',     'education',    '#0077b6', 5),
  ('Community',     'community',    '#e67e22', 6);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS article_tags (
  article_id INT NOT NULL,
  tag_id     INT NOT NULL,
  PRIMARY KEY (article_id, tag_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)     REFERENCES tags(id)     ON DELETE CASCADE
);

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(200) NOT NULL UNIQUE,
  name       VARCHAR(200) DEFAULT NULL,
  token      VARCHAR(64)  NOT NULL UNIQUE,
  verified   TINYINT(1)   DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Migration: run this if upgrading an existing database (MySQL 8.0+)
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_hi LONGTEXT DEFAULT NULL AFTER content;
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_te LONGTEXT DEFAULT NULL AFTER content_hi;
-- ALTER TABLE admins ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL AFTER name;
-- ALTER TABLE admins ADD COLUMN IF NOT EXISTS avatar VARCHAR(300) DEFAULT NULL AFTER bio;

-- Google Reviews cache
CREATE TABLE IF NOT EXISTS google_reviews (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  author_name      VARCHAR(200) NOT NULL,
  rating           TINYINT NOT NULL DEFAULT 5,
  review_text      TEXT NOT NULL,
  profile_photo_url VARCHAR(500) DEFAULT NULL,
  source_id        VARCHAR(200) NOT NULL UNIQUE,
  synced_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT IGNORE INTO settings (setting_key, value) VALUES
  ('site_name',        'GTimes'),
  ('site_tagline',     'Your School. Your Stories.'),
  ('contact_email',    'news@gtimes.in'),
  ('articles_per_page','12'),
  ('facebook',         ''),
  ('instagram',        ''),
  ('youtube',          ''),
  ('twitter',          ''),
  ('breaking_news',    '');
