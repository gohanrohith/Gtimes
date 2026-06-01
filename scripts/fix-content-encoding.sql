-- Fix double/triple HTML-escaped article content.
-- Caused by using <%= %> instead of <%- %> in Quill editor containers —
-- each edit added another layer of entity-encoding to the stored HTML.
--
-- Strategy: 5 rounds of (&amp;→&, &lt;→<, &gt;→>) handles up to 5 nesting levels.
-- Run in phpMyAdmin or MySQL CLI. Safe to run multiple times (idempotent after first run).

UPDATE articles SET
  content = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    content,
    '&amp;','&'),'&lt;','<'),'&gt;','>'),
    '&amp;','&'),'&lt;','<'),'&gt;','>'),
    '&amp;','&'),'&lt;','<'),'&gt;','>'),
    '&amp;','&'),'&lt;','<'),'&gt;','>'),
    '&amp;','&'),'&lt;','<'),'&gt;','>'),

  content_hi = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    content_hi,
    '&amp;','&'),'&lt;','<'),'&gt;','>'),
    '&amp;','&'),'&lt;','<'),'&gt;','>'),
    '&amp;','&'),'&lt;','<'),'&gt;','>'),
    '&amp;','&'),'&lt;','<'),'&gt;','>'),
    '&amp;','&'),'&lt;','<'),'&gt;','>'),

  content_te = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    content_te,
    '&amp;','&'),'&lt;','<'),'&gt;','>'),
    '&amp;','&'),'&lt;','<'),'&gt;','>'),
    '&amp;','&'),'&lt;','<'),'&gt;','>'),
    '&amp;','&'),'&lt;','<'),'&gt;','>'),
    '&amp;','&'),'&lt;','<'),'&gt;','>')

WHERE
  content    LIKE '%&lt;%' OR content    LIKE '%&amp;%' OR
  content_hi LIKE '%&lt;%' OR content_hi LIKE '%&amp;%' OR
  content_te LIKE '%&lt;%' OR content_te LIKE '%&amp;%';

SELECT ROW_COUNT() AS rows_fixed;
