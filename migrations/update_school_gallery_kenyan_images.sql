-- Update existing seeded gallery rows to Kenyan classroom/student photos
-- Run this if add_school_gallery.sql was already executed before these image updates.

UPDATE school_gallery
SET image_url = '/images/school/kenya-classroom.jpg',
    updated_at = NOW()
WHERE title = 'Cake Class Session';

UPDATE school_gallery
SET image_url = '/images/school/kenya-students-university.jpg',
    updated_at = NOW()
WHERE title = 'Student Practice Board';

INSERT INTO school_gallery (title, category, image_url, sort_order, is_featured, is_visible)
SELECT 'Community Classroom Session', 'class', '/images/school/kenya-classroom-community.jpg', 5, false, true
WHERE NOT EXISTS (
    SELECT 1 FROM school_gallery WHERE title = 'Community Classroom Session'
);

INSERT INTO school_gallery (title, category, image_url, sort_order, is_featured, is_visible)
SELECT 'Karatina Student Practice', 'students', '/images/school/kenya-special-school.jpg', 6, false, true
WHERE NOT EXISTS (
    SELECT 1 FROM school_gallery WHERE title = 'Karatina Student Practice'
);
