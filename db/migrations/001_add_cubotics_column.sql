-- Migration: add Cubotics column to users and migrate existing score -> Cubotics
BEGIN TRANSACTION;
ALTER TABLE users ADD COLUMN Cubotics INTEGER DEFAULT 0;
UPDATE users SET Cubotics = CAST((COALESCE(score,0)/100.0) AS INTEGER) WHERE (Cubotics IS NULL OR Cubotics = 0) AND (score IS NOT NULL);
ALTER TABLE users ADD COLUMN NeonShards INTEGER DEFAULT 0;
COMMIT;

-- Note: D1 supports ALTER TABLE ADD COLUMN; run this migration once when deploying.