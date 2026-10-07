export interface Course {
  id: string;
  slug?: string;
  courseId?: string;
  title: string;
  displayTitle?: string;
  description?: string;
  instructor: string;
  instructorInitial?: string;
  category?: string;
  level?: string;
  rating: number;
  ratingCount: number | string;
  studentsCount?: number;
  students?: string;
  duration?: string;
  lessonsCount?: number;
  originalPrice: number;
  salePrice: number;
  badge?: string;
  tags?: string[];
  thumbnailUrl?: string;
  bgGradient?: string;
  thumbnail?: string;
  theme?: string;
  shortLabel?: string;
  icon?: string;
  shortDescription?: string;
  language?: string;
  updatedAtLabel?: string;
  outcomes?: string[];
  curriculum?: CourseChapter[];
  reviews?: CourseReview[];
  instructorProfile?: InstructorProfile;
  countdown?: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  type: 'Video' | 'Lab' | 'Quiz' | 'Reading';
  isPreview?: boolean;
}

export interface CourseChapter {
  id: string;
  title: string;
  duration?: string;
  lessons: CourseLesson[];
}

export interface CourseReview {
  id: string;
  author: string;
  avatar?: string;
  rating: number;
  date: string;
  comment: string;
}

export interface InstructorProfile {
  name: string;
  title: string;
  bio: string;
  rating: number;
  studentsCount: number | string;
  coursesCount: number;
  avatar?: string;
}

export interface CourseFilters {
  query?: string;
  searchMode?: string;
  categories?: string[];
  levels?: string[];
  ratings?: string;
  tags?: string[];
  maxDuration?: number;
  priceType?: string;
  sort?: string;
}

export interface CourseFilterOptions {
  categories: string[];
  popularTags: string[];
}

export interface CourseListResponse {
  success: boolean;
  data: Course[];
  total: number;
}

export interface EnrolledCourse {
  id: string;
  title: string;
  instructor: string;
  totalLessons: number;
  completedLessons: number;
  image?: string;
  thumbnailUrl?: string;
  cover?: string;
  coverTitle?: string;
  coverSubtitle?: string;
  badge?: string;
  lastStudiedAt?: string;
}

