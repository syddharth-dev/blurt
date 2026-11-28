-- An optional school: deleting a school leaves its classes without one.
ALTER TABLE "Class" DROP CONSTRAINT "Class_schoolId_fkey";
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
