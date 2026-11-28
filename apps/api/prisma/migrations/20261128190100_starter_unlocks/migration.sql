-- Starter topics unlock gradually (Phase 5 step 3). Same values as STARTER_UNLOCK_LEVELS in
-- @blurt/shared/content; only touches starter topics still at the default level 1.
UPDATE "Topic" SET "unlockLevel" = 2 WHERE "id" IN ('ecosystems', 'forces-and-motion') AND "unlockLevel" = 1;
UPDATE "Topic" SET "unlockLevel" = 3 WHERE "id" IN ('energy-light-and-sound', 'earthquakes-and-weather') AND "unlockLevel" = 1;
UPDATE "Topic" SET "unlockLevel" = 4 WHERE "id" = 'the-solar-system' AND "unlockLevel" = 1;
