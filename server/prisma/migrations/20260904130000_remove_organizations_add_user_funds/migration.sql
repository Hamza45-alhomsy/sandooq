-- Remove the organization system while preserving all user, workspace, and fund data.
DROP TABLE IF EXISTS `memberships`;
DROP TABLE IF EXISTS `organizations`;

-- Existing funds remain available. New funds are assigned to their user.
ALTER TABLE `funds` ADD COLUMN `userId` INTEGER NULL;
ALTER TABLE `funds` ADD UNIQUE INDEX `funds_workspaceId_userId_key`(`workspaceId`, `userId`);
ALTER TABLE `funds` ADD CONSTRAINT `funds_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
