-- Users get their email (from Supabase Auth) so admins can find and invite people.
ALTER TABLE "User" ADD COLUMN "email" TEXT;
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
