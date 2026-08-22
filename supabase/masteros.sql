-- MasterOS schema (generic teaching OS). SAT is just course seed data.
-- Connect later from the same TypeScript models in lib/masteros/types.ts

create table if not exists students (
  id text primary key,
  name text not null,
  grade_level text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists courses (
  id text primary key,
  name text not null,
  description text,
  status text not null default 'active',
  start_date date,
  target_date date
);

create table if not exists enrollments (
  student_id text not null references students(id) on delete cascade,
  course_id text not null references courses(id) on delete cascade,
  primary key (student_id, course_id)
);

create table if not exists units (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  title text not null,
  sort_order int not null
);

create table if not exists lessons (
  id text primary key,
  unit_id text not null references units(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  title text not null,
  objective text,
  lesson_date date,
  duration int,
  status text not null default 'planned',
  notes text
);

create table if not exists lesson_sections (
  id text primary key,
  lesson_id text not null references lessons(id) on delete cascade,
  section_type text not null,
  title text not null,
  content text,
  sort_order int not null,
  complete boolean default false
);

create table if not exists skills (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  name text not null,
  description text,
  domain text
);

create table if not exists lesson_skills (
  lesson_id text not null references lessons(id) on delete cascade,
  skill_id text not null references skills(id) on delete cascade,
  primary key (lesson_id, skill_id)
);

create table if not exists student_skills (
  student_id text not null references students(id) on delete cascade,
  skill_id text not null references skills(id) on delete cascade,
  mastery_state text not null,
  accuracy int not null default 0,
  attempts int not null default 0,
  recent_accuracy int not null default 0,
  last_practiced date,
  primary key (student_id, skill_id)
);

create table if not exists questions (
  id text primary key,
  body text not null,
  answer text not null,
  explanation text,
  difficulty text,
  question_type text,
  skill_id text references skills(id),
  course_id text references courses(id),
  subject text,
  source text,
  notes text
);

create table if not exists assignments (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  lesson_id text references lessons(id),
  title text not null,
  assignment_type text not null,
  assigned_date date,
  due_date date,
  status text not null,
  total_points int,
  score int
);

create table if not exists assignment_questions (
  assignment_id text not null references assignments(id) on delete cascade,
  question_id text not null references questions(id) on delete cascade,
  sort_order int not null,
  points numeric,
  primary key (assignment_id, question_id)
);

create table if not exists question_results (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  question_id text not null references questions(id),
  assignment_id text references assignments(id),
  correct boolean not null,
  response text,
  mistake_type text,
  points_earned numeric
);

create table if not exists assessments (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  assessment_type text not null,
  title text not null,
  assessed_on date,
  score int,
  total int,
  sections jsonb,
  skill_scores jsonb
);

create table if not exists teacher_notes (
  id text primary key,
  body text not null,
  created_at timestamptz not null default now(),
  student_id text references students(id),
  course_id text references courses(id),
  lesson_id text references lessons(id),
  skill_id text references skills(id)
);
