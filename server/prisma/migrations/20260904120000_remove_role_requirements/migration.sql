-- Make legacy role references optional. Existing role data is preserved.
ALTER TABLE `users` MODIFY `roleId` INTEGER NULL;
ALTER TABLE `workspace_members` MODIFY `roleId` INTEGER NULL;
ALTER TABLE `workspace_invitations` MODIFY `roleId` INTEGER NULL;