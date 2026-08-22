import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

function daysFromNow(n: number, hours = 0) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(d.getHours() + hours)
  return d
}
function daysAgo(n: number, hours = 0) {
  return daysFromNow(-n, hours)
}

async function main() {
  console.log('Seeding InternForge...')

  // ---------------- Companies ----------------
  const companies = await Promise.all([
    db.company.create({
      data: {
        name: 'Quantum Labs',
        logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=quantum&backgroundColor=10b981',
        website: 'https://quantumlabs.example',
        industry: 'AI Research',
        size: '201-500',
        description: 'Frontier AI research lab building safe, aligned foundation models and developer tooling.',
        location: 'Bengaluru, IN',
        verified: true,
      },
    }),
    db.company.create({
      data: {
        name: 'Nimbus Cloud',
        logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=cloud&backgroundColor=0ea5e9',
        website: 'https://nimbuscloud.example',
        industry: 'Cloud Infrastructure',
        size: '1001-5000',
        description: 'Developer-first cloud platform for observability, autoscaling and edge compute.',
        location: 'Remote',
        verified: true,
      },
    }),
    db.company.create({
      data: {
        name: 'FinEdge',
        logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=fintech&backgroundColor=f59e0b',
        website: 'https://finedge.example',
        industry: 'FinTech',
        size: '51-200',
        description: 'Neobank for freelancers — instant payouts, smart taxes, and AI bookkeeping.',
        location: 'Mumbai, IN',
        verified: true,
      },
    }),
    db.company.create({
      data: {
        name: 'PixelForge Studios',
        logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=games&backgroundColor=8b5cf6',
        website: 'https://pixelforge.example',
        industry: 'Game Development',
        size: '11-50',
        description: 'Indie game studio crafting narrative-driven RPGs with procedural worlds.',
        location: 'Pune, IN',
        verified: false,
      },
    }),
  ])

  // ---------------- Users ----------------
  const avatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3c4`

  const adminUser = await db.user.create({
    data: {
      email: 'admin@internforge.io',
      name: 'Aria Mehta',
      role: 'ADMIN',
      avatarUrl: avatar('admin'),
      title: 'Platform Administrator',
      location: 'Bengaluru, IN',
      status: 'ACTIVE',
    },
  })

  const companyAdmins = await Promise.all([
    db.user.create({
      data: {
        email: 'priya@quantumlabs.example',
        name: 'Priya Sharma',
        role: 'COMPANY',
        avatarUrl: avatar('priya'),
        title: 'Head of Talent — Quantum Labs',
        location: 'Bengaluru, IN',
        status: 'ACTIVE',
        companyMemberships: {
          create: { companyId: companies[0].id, role: 'ADMIN' },
        },
      },
    }),
    db.user.create({
      data: {
        email: 'raj@nimbuscloud.example',
        name: 'Raj Verma',
        role: 'RECRUITER',
        avatarUrl: avatar('raj'),
        title: 'University Recruiter — Nimbus Cloud',
        location: 'Remote',
        status: 'ACTIVE',
        companyMemberships: {
          create: { companyId: companies[1].id, role: 'RECRUITER' },
        },
      },
    }),
    db.user.create({
      data: {
        email: 'neha@finedge.example',
        name: 'Neha Iyer',
        role: 'COMPANY',
        avatarUrl: avatar('neha'),
        title: 'Engineering Manager — FinEdge',
        location: 'Mumbai, IN',
        status: 'ACTIVE',
        companyMemberships: {
          create: { companyId: companies[2].id, role: 'ADMIN' },
        },
      },
    }),
  ])

  const mentors = await Promise.all([
    db.user.create({
      data: {
        email: 'mentor.kabir@internforge.io',
        name: 'Kabir Rao',
        role: 'MENTOR',
        avatarUrl: avatar('kabir'),
        title: 'Senior ML Engineer',
        bio: '10 years building recommender systems. Mentored 40+ interns into full-time roles.',
        location: 'Bengaluru, IN',
        githubUrl: 'https://github.com/kabirrao',
        status: 'ACTIVE',
      },
    }),
    db.user.create({
      data: {
        email: 'mentor.ananya@internforge.io',
        name: 'Ananya Bose',
        role: 'MENTOR',
        avatarUrl: avatar('ananya'),
        title: 'Staff Cloud Engineer',
        bio: 'Distributed systems expert. Loves turning messy prototypes into production services.',
        location: 'Remote',
        githubUrl: 'https://github.com/ananyab',
        status: 'ACTIVE',
      },
    }),
    db.user.create({
      data: {
        email: 'mentor.arjun@internforge.io',
        name: 'Arjun Nair',
        role: 'MENTOR',
        avatarUrl: avatar('arjun'),
        title: 'Principal Frontend Engineer',
        bio: 'Design-systems nerd. Champions accessibility and performance budgets.',
        location: 'Pune, IN',
        githubUrl: 'https://github.com/arjunnair',
        status: 'ACTIVE',
      },
    }),
  ])

  const students = await Promise.all([
    db.user.create({
      data: {
        email: 'sara@student.io',
        name: 'Sara Kapoor',
        role: 'STUDENT',
        avatarUrl: avatar('sara'),
        title: 'Final-year CS Student',
        location: 'Bengaluru, IN',
        university: 'IIT Madras',
        major: 'Computer Science',
        gradYear: '2025',
        githubUrl: 'https://github.com/sarakapoor',
        linkedinUrl: 'https://linkedin.com/in/sarakapoor',
        bio: 'Building delightful interfaces. React, TypeScript, design systems.',
        status: 'ACTIVE',
      },
    }),
    db.user.create({
      data: {
        email: 'dev@student.io',
        name: 'Dev Patel',
        role: 'STUDENT',
        avatarUrl: avatar('dev'),
        title: 'Pre-final CS Student',
        location: 'Hyderabad, IN',
        university: 'BITS Pilani',
        major: 'Computer Science',
        gradYear: '2026',
        githubUrl: 'https://github.com/devpatel',
        bio: 'ML systems & MLOps. Kaggle competitions finalist.',
        status: 'ACTIVE',
      },
    }),
    db.user.create({
      data: {
        email: 'maya@student.io',
        name: 'Maya Reddy',
        role: 'STUDENT',
        avatarUrl: avatar('maya'),
        title: 'Final-year CS Student',
        location: 'Mumbai, IN',
        university: 'VJTI Mumbai',
        major: 'Information Technology',
        gradYear: '2025',
        githubUrl: 'https://github.com/mayareddy',
        bio: 'Backend & distributed systems. Go, Rust, Kafka.',
        status: 'ACTIVE',
      },
    }),
    db.user.create({
      data: {
        email: 'ishaan@student.io',
        name: 'Ishaan Gupta',
        role: 'STUDENT',
        avatarUrl: avatar('ishaan'),
        title: 'Pre-final CE Student',
        location: 'Delhi, IN',
        university: 'DTU Delhi',
        major: 'Computer Engineering',
        gradYear: '2026',
        githubUrl: 'https://github.com/ishaangupta',
        bio: 'Game developer. Unity, Godot, shaders.',
        status: 'ACTIVE',
      },
    }),
  ])

  // ---------------- Skills ----------------
  const skillDefs = [
    ['React', 'Frontend'],
    ['TypeScript', 'Languages'],
    ['Node.js', 'Backend'],
    ['Python', 'Languages'],
    ['Machine Learning', 'Data/ML'],
    ['SQL', 'Data'],
    ['AWS', 'Cloud/DevOps'],
    ['Docker', 'Cloud/DevOps'],
    ['System Design', 'Engineering'],
    ['UI/UX Design', 'Design'],
    ['Go', 'Languages'],
    ['Communication', 'Soft Skills'],
  ] as const

  const skills = await Promise.all(
    skillDefs.map(([name, category]) =>
      db.skill.create({
        data: {
          name,
          category,
          description: `${name} proficiency demonstrated through verified internship work.`,
        },
      })
    )
  )
  const skillId = (name: string) => skills.find((s) => s.name === name)!.id

  // ---------------- Internships ----------------
  const internships = await Promise.all([
    db.internship.create({
      data: {
        companyId: companies[0].id,
        title: 'ML Research Intern — Recommender Systems',
        description:
          'Join the Personalization team to prototype retrieval and ranking models that surface content to 8M+ users. You will own a research question end-to-end: literature review, dataset curation, model training, offline eval, and a production A/B test proposal.',
        domain: 'Machine Learning',
        durationWeeks: 12,
        stipend: '₹40,000 / month',
        location: 'Bengaluru, IN / Hybrid',
        remote: false,
        status: 'OPEN',
        slots: 2,
        requirements: [
          'Strong Python & PyTorch fundamentals',
          'Coursework in linear algebra, probability, ML',
          'Comfortable reading research papers',
          'A GitHub portfolio of projects',
        ],
        skillsRequired: ['Python', 'Machine Learning', 'SQL', 'System Design'],
        responsibilities: [
          'Reproduce a baseline recommender',
          'Propose & prototype an improvement',
          'Write a technical design doc',
          'Present results to the research team',
        ],
        startDate: daysFromNow(21),
        endDate: daysFromNow(21 + 84),
        applicationDeadline: daysFromNow(14),
      },
    }),
    db.internship.create({
      data: {
        companyId: companies[1].id,
        title: 'Backend SWE Intern — Distributed Tracing',
        description:
          'Help ship the next version of our OpenTelemetry-based tracing backend. You will design ingestion pipelines, write Go services, and benchmark for 1M spans/sec throughput.',
        domain: 'Backend',
        durationWeeks: 10,
        stipend: '₹35,000 / month',
        location: 'Remote',
        remote: true,
        status: 'OPEN',
        slots: 3,
        requirements: ['Go or Rust basics', 'Understanding of HTTP & gRPC', 'Familiarity with metrics/traces'],
        skillsRequired: ['Go', 'System Design', 'AWS', 'Docker'],
        responsibilities: ['Design span sampling strategy', 'Build collector service', 'Load test to 1M spans/sec'],
        startDate: daysFromNow(30),
        endDate: daysFromNow(30 + 70),
        applicationDeadline: daysFromNow(18),
      },
    }),
    db.internship.create({
      data: {
        companyId: companies[2].id,
        title: 'Frontend Intern — Design Systems',
        description:
          'Build the next generation of FinEdge components. Ship an accessible, themeable component library used across 14 product surfaces. Great for designers who code.',
        domain: 'Frontend',
        durationWeeks: 12,
        stipend: '₹30,000 / month',
        location: 'Mumbai, IN / Hybrid',
        remote: true,
        status: 'OPEN',
        slots: 2,
        requirements: ['React + TypeScript', 'Eye for accessible UI', 'Comfortable in Figma'],
        skillsRequired: ['React', 'TypeScript', 'UI/UX Design'],
        responsibilities: ['Audit existing components for a11y', 'Build 8 production components', 'Write Storybook stories'],
        startDate: daysFromNow(14),
        endDate: daysFromNow(14 + 84),
        applicationDeadline: daysFromNow(7),
      },
    }),
    db.internship.create({
      data: {
        companyId: companies[0].id,
        title: 'Data Eng Intern — Evaluation Pipelines',
        description:
          'Scale our LLM evaluation harness. Build datasets, scoring jobs, and dashboards that let researchers ship confidently.',
        domain: 'Data Engineering',
        durationWeeks: 12,
        stipend: '₹38,000 / month',
        location: 'Remote',
        remote: true,
        status: 'OPEN',
        slots: 2,
        requirements: ['Python & SQL', 'Airflow / Prefect exposure', 'Data modeling fundamentals'],
        skillsRequired: ['Python', 'SQL', 'AWS', 'Docker'],
        responsibilities: ['Model eval datasets', 'Build scoring DAGs', 'Create eval dashboards'],
        startDate: daysFromNow(25),
        endDate: daysFromNow(25 + 84),
        applicationDeadline: daysFromNow(12),
      },
    }),
    db.internship.create({
      data: {
        companyId: companies[3].id,
        title: 'Game Dev Intern — Procedural Worlds',
        description:
          'Prototype procedural terrain generation and a shader-based day/night cycle in Godot 4. Ship a vertical slice demo.',
        domain: 'Game Development',
        durationWeeks: 8,
        stipend: '₹25,000 / month',
        location: 'Pune, IN / Onsite',
        remote: false,
        status: 'OPEN',
        slots: 1,
        requirements: ['Godot or Unity experience', 'GLSL basics a plus', 'Portfolio of game projects'],
        skillsRequired: ['UI/UX Design', 'System Design', 'Communication'],
        responsibilities: ['Procedural terrain', 'Day/night shaders', 'Vertical slice demo'],
        startDate: daysFromNow(40),
        endDate: daysFromNow(40 + 56),
        applicationDeadline: daysFromNow(25),
      },
    }),
    db.internship.create({
      data: {
        companyId: companies[1].id,
        title: 'SRE Intern — Reliability Engineering',
        description:
          'Join the platform reliability team. Build self-healing automation, SLO dashboards, and chaos experiments.',
        domain: 'DevOps',
        durationWeeks: 10,
        stipend: '₹36,000 / month',
        location: 'Remote',
        remote: true,
        status: 'CLOSED',
        slots: 1,
        requirements: ['Linux & networking', 'Terraform / IaC basics', 'A scripting language'],
        skillsRequired: ['AWS', 'Docker', 'System Design', 'Go'],
        responsibilities: ['SLO dashboards', 'Chaos experiments', 'Auto-remediation runbooks'],
        startDate: daysAgo(10),
        endDate: daysAgo(10 - 70),
        applicationDeadline: daysAgo(20),
      },
    }),
  ])

  // ---------------- Applications ----------------
  const applications = await Promise.all([
    db.application.create({
      data: {
        internshipId: internships[0].id,
        studentId: students[1].id,
        status: 'INTERVIEW',
        coverLetter:
          'I have shipped two production recommenders as side projects and placed top-5% in a recent Kaggle retrieval competition. I am excited to bring rigor to Quantum Labs.',
        resumeUrl: 'https://example.com/dev-resume.pdf',
        matchScore: 88,
        appliedAt: daysAgo(8),
      },
    }),
    db.application.create({
      data: {
        internshipId: internships[1].id,
        studentId: students[2].id,
        status: 'OFFERED',
        coverLetter: 'Distributed systems is my happy place — I built a Raft implementation for fun.',
        resumeUrl: 'https://example.com/maya-resume.pdf',
        matchScore: 92,
        appliedAt: daysAgo(12),
      },
    }),
    db.application.create({
      data: {
        internshipId: internships[2].id,
        studentId: students[0].id,
        status: 'ACCEPTED',
        coverLetter: 'Design systems are my craft. I led my university design system for 2 years.',
        resumeUrl: 'https://example.com/sara-resume.pdf',
        matchScore: 95,
        appliedAt: daysAgo(15),
      },
    }),
    db.application.create({
      data: {
        internshipId: internships[0].id,
        studentId: students[0].id,
        status: 'SUBMITTED',
        coverLetter: 'While ML is not my primary focus, I have built React dashboards on top of ML models.',
        matchScore: 61,
        appliedAt: daysAgo(3),
      },
    }),
    db.application.create({
      data: {
        internshipId: internships[3].id,
        studentId: students[1].id,
        status: 'SCREENING',
        coverLetter: 'I have run Airflow pipelines at scale for a research lab.',
        matchScore: 79,
        appliedAt: daysAgo(5),
      },
    }),
    db.application.create({
      data: {
        internshipId: internships[4].id,
        studentId: students[3].id,
        status: 'ACCEPTED',
        coverLetter: 'Three game jams shipped. Godot 4 is my main engine.',
        matchScore: 90,
        appliedAt: daysAgo(20),
      },
    }),
    db.application.create({
      data: {
        internshipId: internships[1].id,
        studentId: students[0].id,
        status: 'REJECTED',
        coverLetter: 'Eager to learn backend at scale.',
        matchScore: 55,
        appliedAt: daysAgo(14),
      },
    }),
    db.application.create({
      data: {
        internshipId: internships[2].id,
        studentId: students[3].id,
        status: 'SCREENING',
        coverLetter: 'I design game UIs and could adapt to product design systems.',
        matchScore: 67,
        appliedAt: daysAgo(4),
      },
    }),
  ])

  // Interviews for two applications
  await db.interview.create({
    data: {
      applicationId: applications[0].id,
      scheduledAt: daysFromNow(3, 2),
      location: 'Google Meet',
      type: 'VIDEO',
      notes: 'Technical: ML system design + coding on retrieval.',
      status: 'SCHEDULED',
    },
  })
  await db.interview.create({
    data: {
      applicationId: applications[1].id,
      scheduledAt: daysFromNow(1, -1),
      location: 'Zoom',
      type: 'VIDEO',
      notes: 'Offer conversation with hiring manager.',
      status: 'SCHEDULED',
    },
  })

  // ---------------- Projects & tasks ----------------
  // Sara's accepted project at FinEdge (frontend design system)
  const projectSara = await db.project.create({
    data: {
      internshipId: internships[2].id,
      title: 'ForgeUI — Accessible Component Library',
      description:
        'Build a themeable, WCAG-compliant React component library that ships across all FinEdge product surfaces.',
      studentId: students[0].id,
      mentorId: mentors[2].id,
      status: 'IN_PROGRESS',
      progress: 62,
      repoUrl: 'https://github.com/finedge/forge-ui',
      startDate: daysAgo(28),
      endDate: daysFromNow(56),
    },
  })

  await db.milestone.createMany({
    data: [
      { projectId: projectSara.id, title: 'Design tokens & theme provider', description: 'Establish tokens, dark/light, RTL.', dueDate: daysAgo(21), status: 'DONE', order: 1 },
      { projectId: projectSara.id, title: 'Core primitives (Button, Input, Dialog)', description: 'Accessible primitives with focus trapping.', dueDate: daysAgo(7), status: 'DONE', order: 2 },
      { projectId: projectSara.id, title: 'Data components (Table, Pagination)', description: 'Virtualized table + a11y pagination.', dueDate: daysFromNow(7), status: 'IN_PROGRESS', order: 3 },
      { projectId: projectSara.id, title: 'Storybook + visual regression', description: 'Storybook stories + Chromatic snapshots.', dueDate: daysFromNow(21), status: 'PENDING', order: 4 },
      { projectId: projectSara.id, title: 'Publish v1 to internal registry', description: 'Versioned package, migration guide.', dueDate: daysFromNow(49), status: 'PENDING', order: 5 },
    ],
  })

  const tasksSeed = [
    { title: 'Implement Combobox with keyboard nav', status: 'IN_PROGRESS', priority: 'HIGH', tags: ['a11y', 'combobox'] },
    { title: 'Add RTL support to DatePicker', status: 'TODO', priority: 'MEDIUM', tags: ['i18n', 'datepicker'] },
    { title: 'Virtualize DataTable rows', status: 'REVIEW', priority: 'HIGH', tags: ['performance'] },
    { title: 'Write Chromatic baseline snapshots', status: 'TODO', priority: 'MEDIUM', tags: ['testing'] },
    { title: 'Document focus-trap on Dialog', status: 'DONE', priority: 'LOW', tags: ['docs', 'a11y'] },
    { title: 'Migrate Button to design tokens', status: 'DONE', priority: 'MEDIUM', tags: ['tokens'] },
    { title: 'Add Skeleton loading component', status: 'TODO', priority: 'LOW', tags: ['skeleton'] },
    { title: 'Fix Tooltip aria-describedby', status: 'BLOCKED', priority: 'URGENT', tags: ['bug', 'a11y'] },
  ] as const

  for (const [i, t] of tasksSeed.entries()) {
    await db.task.create({
      data: {
        projectId: projectSara.id,
        title: t.title,
        description: `Task scoped to the ForgeUI library. Priority ${t.priority}.`,
        status: t.status,
        priority: t.priority,
        assigneeId: students[0].id,
        dueDate: daysFromNow(i - 2),
        estimateHours: [6, 8, 10, 4, 3, 5, 4, 6][i],
        order: i,
        tags: t.tags,
      },
    })
  }

  // Ishaan's game project
  const projectIshaan = await db.project.create({
    data: {
      internshipId: internships[4].id,
      title: 'Voxel Valley — Procedural Terrain Demo',
      description: 'Godot 4 vertical slice with procedural terrain, day/night shaders, and player locomotion.',
      studentId: students[3].id,
      mentorId: mentors[2].id,
      status: 'IN_PROGRESS',
      progress: 38,
      repoUrl: 'https://github.com/pixelforge/voxel-valley',
      startDate: daysAgo(14),
      endDate: daysFromNow(42),
    },
  })
  await db.milestone.createMany({
    data: [
      { projectId: projectIshaan.id, title: 'Terrain noise generator', dueDate: daysAgo(7), status: 'DONE', order: 1 },
      { projectId: projectIshaan.id, title: 'Day/night shader cycle', dueDate: daysFromNow(7), status: 'IN_PROGRESS', order: 2 },
      { projectId: projectIshaan.id, title: 'Player locomotion & camera', dueDate: daysFromNow(21), status: 'PENDING', order: 3 },
      { projectId: projectIshaan.id, title: 'Vertical slice demo build', dueDate: daysFromNow(38), status: 'PENDING', order: 4 },
    ],
  })

  // ---------------- Submissions & evaluations ----------------
  const sub1 = await db.submission.create({
    data: {
      projectId: projectSara.id,
      taskId: (await db.task.findFirstOrThrow({ where: { title: 'Implement Combobox with keyboard nav' } })).id,
      studentId: students[0].id,
      title: 'Combobox v1 — keyboard nav + a11y',
      content:
        `Implemented a Combobox primitive with full keyboard support (Type-to-select, Arrow/Home/End, Enter/Escape).\n\nChanges:\n- focus management with roving tabindex\n- aria-expanded, aria-activedescendant, aria-controls\n- virtualized option list for >5k items\n\nKey snippet:\n` + '```tsx\nconst onKeyDown = (e) => {\n  switch(e.key) {\n    case "ArrowDown": setOpen(true); highlight(h => Math.min(h+1, items.length-1)); break;\n    case "Enter": select(highlighted); break;\n    case "Escape": setOpen(false); break;\n  }\n}\n```',
      fileUrl: 'https://github.com/finedge/forge-ui/pull/142',
      version: 2,
      status: 'REVIEWED',
      plagiarismScore: 0.04,
      submittedAt: daysAgo(3),
    },
  })
  const eval1 = await db.evaluation.create({
    data: {
      submissionId: sub1.id,
      projectId: projectSara.id,
      mentorId: mentors[2].id,
      codeQuality: 86,
      communication: 78,
      delivery: 82,
      learning: 90,
      score: 84,
      feedback:
        'Strong a11y instincts and clean focus management. Tests cover the happy path but miss the boundary of empty input. Refactor the switch statement into a keymap table for readability. Overall — excellent, ship it after addressing the empty-input edge case.',
      aiFeedback:
        'Highlights: robust keyboard support, correct ARIA semantics, virtualized rendering. Risks: missing empty-input branch could throw on null option. Suggested: extract keymap, add regression test for 5k+ options, document combobox vs listbox decision.',
      strengths: ['Keyboard nav', 'ARIA semantics', 'Virtualization'],
      improvements: ['Empty-input edge case', 'Keymap refactor', 'Regression tests'],
    },
  })

  const sub2 = await db.submission.create({
    data: {
      projectId: projectSara.id,
      studentId: students[0].id,
      title: 'DataTable virtualization spike',
      content: 'Spike for virtualizing 100k rows. Uses windowing with overscan=4.',
      version: 1,
      status: 'SUBMITTED',
      submittedAt: daysAgo(1),
    },
  })

  // ---------------- Skills (user skills) ----------------
  const saraSkills = [
    { name: 'React', base: 60, curr: 88, verified: true },
    { name: 'TypeScript', base: 55, curr: 82, verified: true },
    { name: 'UI/UX Design', base: 50, curr: 76, verified: true },
    { name: 'Node.js', base: 40, curr: 58, verified: false },
    { name: 'Communication', base: 65, curr: 80, verified: true },
    { name: 'System Design', base: 35, curr: 55, verified: false },
  ]
  for (const s of saraSkills) {
    await db.userSkill.create({
      data: {
        userId: students[0].id,
        skillId: skillId(s.name),
        baseline: s.base,
        current: s.curr,
        verified: s.verified,
        evidence: [{ type: 'submission', title: 'Combobox a11y', url: 'https://github.com/finedge/forge-ui/pull/142' }],
      },
    })
  }
  const devSkills = [
    { name: 'Python', base: 70, curr: 92, verified: true },
    { name: 'Machine Learning', base: 60, curr: 85, verified: true },
    { name: 'SQL', base: 65, curr: 88, verified: true },
    { name: 'AWS', base: 40, curr: 70, verified: false },
  ]
  for (const s of devSkills) {
    await db.userSkill.create({
      data: { userId: students[1].id, skillId: skillId(s.name), baseline: s.base, current: s.curr, verified: s.verified, evidence: [] },
    })
  }
  const mayaSkills = [
    { name: 'Go', base: 55, curr: 84, verified: true },
    { name: 'System Design', base: 50, curr: 78, verified: true },
    { name: 'Docker', base: 45, curr: 72, verified: false },
  ]
  for (const s of mayaSkills) {
    await db.userSkill.create({
      data: { userId: students[2].id, skillId: skillId(s.name), baseline: s.base, current: s.curr, verified: s.verified, evidence: [] },
    })
  }

  // ---------------- Assessments ----------------
  const assessment1 = await db.assessment.create({
    data: {
      internshipId: internships[2].id,
      title: 'Accessibility fundamentals quiz',
      type: 'QUIZ',
      description: 'WCAG 2.1 AA essentials for component authors.',
      maxScore: 100,
      dueDate: daysFromNow(5),
      durationMins: 30,
      questions: [
        { id: 'q1', prompt: 'Minimum touch target size is:', options: ['24px', '36px', '44px', '48px'], answer: 2 },
        { id: 'q2', prompt: 'Dialogs should trap focus when:', options: ['Always', 'Never', 'When modal', 'Only mobile'], answer: 2 },
        { id: 'q3', prompt: 'aria-activedescendant is used for:', options: ['Tooltips', 'Combobox options', 'Tabs', 'Breadcrumbs'], answer: 1 },
      ],
    },
  })
  await db.assessmentResult.create({
    data: {
      assessmentId: assessment1.id,
      userId: students[0].id,
      score: 92,
      answers: [{ id: 'q1', selected: 2 }, { id: 'q2', selected: 2 }, { id: 'q3', selected: 1 }],
      feedback: 'Excellent grasp of a11y primitives.',
      submittedAt: daysAgo(2),
    },
  })

  const assessment2 = await db.assessment.create({
    data: {
      internshipId: internships[0].id,
      title: 'Coding challenge — retrieval recall',
      type: 'CODING',
      description: 'Implement an ANN search over a 50k vector corpus within 600ms p99.',
      maxScore: 100,
      dueDate: daysFromNow(8),
      durationMins: 120,
      questions: [],
    },
  })

  // ---------------- Certificates ----------------
  await db.certificate.create({
    data: {
      certificateNumber: 'IF-CERT-2025-0007',
      userId: students[2].id,
      internshipId: internships[5].id,
      grade: 'A',
      skills: ['Go', 'System Design', 'Docker'],
      verificationCode: 'IF-VERIFY-9F3K2A',
      qrData: 'https://internforge.io/verify/IF-VERIFY-9F3K2A',
      template: 'emerald',
      issuedAt: daysAgo(5),
    },
  })

  // ---------------- Daily logs ----------------
  const logMoods = ['GREAT', 'GOOD', 'OKAY', 'TIRED'] as const
  for (let i = 0; i < 7; i++) {
    await db.dailyLog.create({
      data: {
        userId: students[0].id,
        internshipId: internships[2].id,
        date: daysAgo(i),
        content:
          [
            'Shipped Combobox keyboard nav, mentor reviewed and approved.',
            'Refactored keymap table per mentor feedback.',
            'Spiked DataTable virtualization, hit 60fps at 100k rows.',
            'Wrote Chromatic baselines for 12 components.',
            'Paired with mentor on RTL handling for DatePicker.',
            'Debugged Tooltip aria-describedby regression.',
            'Drafted migration guide for v1 consumers.',
          ][i],
        tasksCompleted: [tasksSeed[i].title],
        hoursSpent: 6.5,
        mood: logMoods[i % logMoods.length],
      },
    })
  }

  // ---------------- Attendance ----------------
  const attStatus = ['PRESENT', 'PRESENT', 'REMOTE', 'PRESENT', 'LATE', 'PRESENT', 'LEAVE'] as const
  for (let i = 0; i < 7; i++) {
    await db.attendance.create({
      data: {
        userId: students[0].id,
        internshipId: internships[2].id,
        date: daysAgo(i),
        status: attStatus[i],
        checkIn: i === 6 ? null : new Date(daysAgo(i).setHours(9, 30, 0, 0)),
        checkOut: i === 6 ? null : new Date(daysAgo(i).setHours(17, 45, 0, 0)),
      },
    })
  }

  // ---------------- Feedback ----------------
  await db.feedback.create({
    data: {
      fromUserId: mentors[2].id,
      toUserId: students[0].id,
      internshipId: internships[2].id,
      rating: 5,
      content:
        'Sara raises the bar on accessibility. She pairs craft with empathy for users. Delegation and writing are next growth edges.',
      type: 'WEEKLY',
      createdAt: daysAgo(2),
    },
  })

  // ---------------- Onboarding tasks ----------------
  const onboarding = [
    { title: 'Sign NDA & internship agreement', type: 'SIGNATURE', order: 1 },
    { title: 'Complete Code of Conduct module', type: 'QUIZ', order: 2 },
    { title: 'Setup dev environment (repo access, Storybook)', type: 'DOCUMENT', order: 3 },
    { title: 'Intro meeting with mentor Arjun', type: 'MEETING', order: 4 },
    { title: 'Read ForgeUI design doc', type: 'RESOURCE', order: 5 },
  ]
  for (const o of onboarding) {
    await db.onboardingTask.create({
      data: {
        internshipId: internships[2].id,
        userId: students[0].id,
        title: o.title,
        type: o.type,
        status: o.order <= 3 ? 'DONE' : o.order === 4 ? 'IN_PROGRESS' : 'PENDING',
        order: o.order,
      },
    })
  }

  // ---------------- Conversations & messages ----------------
  const convoMentorStudent = await db.conversation.create({
    data: {
      type: 'DIRECT',
      members: {
        create: [
          { userId: students[0].id },
          { userId: mentors[2].id },
        ],
      },
    },
  })
  const convoMessages = [
    { senderId: students[0].id, content: 'Hi Arjun! Pushed the Combobox PR — could you review when you have a moment?', t: daysAgo(3, 1) },
    { senderId: mentors[2].id, content: 'On it. Quick note: empty-input branch throws — can you guard it?', t: daysAgo(3, 0) },
    { senderId: students[0].id, content: 'Good catch. Pushed the fix + a regression test. 🙏', t: daysAgo(2, 6) },
    { senderId: mentors[2].id, content: 'Approved. Let’s pair on the DataTable virtualization spike tomorrow at 11.', t: daysAgo(2, 4) },
    { senderId: students[0].id, content: '11 works. I’ll come with two approaches prepared.', t: daysAgo(2, 3) },
  ]
  for (const m of convoMessages) {
    await db.message.create({
      data: {
        conversationId: convoMentorStudent.id,
        senderId: m.senderId,
        content: m.content,
        type: 'TEXT',
        createdAt: m.t,
        readBy: [m.senderId],
      },
    })
  }

  // ---------------- Notifications ----------------
  const notifs = [
    { userId: students[0].id, type: 'SUCCESS', title: 'Submission approved', message: 'Combobox v1 approved by Arjun Nair.', link: '/?view=submissions' },
    { userId: students[0].id, type: 'INFO', title: 'Interview scheduled', message: 'DataTable spike pairing at 11:00 tomorrow.', link: '/?view=tasks' },
    { userId: students[0].id, type: 'WARNING', title: 'Deadline approaching', message: 'Accessibility quiz due in 5 days.', link: '/?view=assessments' },
    { userId: students[1].id, type: 'INFO', title: 'Application status', message: 'Your ML Research application moved to Interview.', link: '/?view=applications' },
    { userId: students[2].id, type: 'SUCCESS', title: 'Certificate issued', message: 'Your SRE certificate IF-CERT-2025-0007 is ready.', link: '/?view=certificates' },
    { userId: mentors[2].id, type: 'INFO', title: 'New submission to review', message: 'DataTable virtualization spike awaiting review.', link: '/' },
    { userId: adminUser.id, type: 'WARNING', title: 'Plagiarism flagged', message: 'Submission sub_x9 scored 0.31 similarity — review.', link: '/?view=admin' },
  ]
  for (const n of notifs) {
    await db.notification.create({ data: { ...n, read: n.type === 'SUCCESS' || n.type === 'INFO' ? false : true, createdAt: daysAgo(Math.floor(Math.random() * 4)) } })
  }

  // ---------------- Announcements ----------------
  await db.announcement.create({
    data: {
      internshipId: internships[2].id,
      companyId: companies[2].id,
      title: 'Welcome to the FinEdge Frontend cohort!',
      content: 'We are thrilled to have you. Sprint zero starts Monday — your mentor will reach out today. Join #frontend-interns on Slack.',
      authorId: companyAdmins[2].id,
      pinned: true,
    },
  })
  await db.announcement.create({
    data: {
      internshipId: internships[0].id,
      title: 'Reading list for week 1',
      content: 'Please skim the RecSys 2024 best paper before our kickoff. Slides will follow.',
      authorId: mentors[0].id,
    },
  })

  // ---------------- Badges ----------------
  const badgeDefs = [
    { name: 'First Commit', icon: 'GitCommit', tier: 'BRONZE', criteria: ['Make your first merged PR'] },
    { name: 'A11y Champion', icon: 'Accessibility', tier: 'GOLD', criteria: ['Ship 3 accessibility-reviewed components'] },
    { name: 'Streak Keeper', icon: 'Flame', tier: 'SILVER', criteria: ['Log work for 7 consecutive days'] },
    { name: 'Top Performer', icon: 'Trophy', tier: 'PLATINUM', criteria: ['Finish in top 10% of cohort'] },
    { name: 'Bug Hunter', icon: 'Bug', tier: 'SILVER', criteria: ['Find & fix 5 verified bugs'] },
  ]
  const badges = await Promise.all(badgeDefs.map((b) => db.badge.create({ data: b })))
  await db.userBadge.create({ data: { userId: students[0].id, badgeId: badges[0].id, awardedAt: daysAgo(20) } })
  await db.userBadge.create({ data: { userId: students[0].id, badgeId: badges[1].id, awardedAt: daysAgo(4) } })
  await db.userBadge.create({ data: { userId: students[0].id, badgeId: badges[2].id, awardedAt: daysAgo(1) } })
  await db.userBadge.create({ data: { userId: students[2].id, badgeId: badges[3].id, awardedAt: daysAgo(5) } })

  // ---------------- Audit logs ----------------
  const audit = [
    { userId: adminUser.id, action: 'CREATE', resource: 'Internship', resourceId: internships[0].id, severity: 'INFO', details: { note: 'Admin created internship program' } },
    { userId: mentors[2].id, action: 'EVALUATE', resource: 'Submission', resourceId: sub1.id, severity: 'INFO', details: { score: 84 } },
    { userId: companyAdmins[0].id, action: 'UPDATE', resource: 'Application', resourceId: applications[0].id, severity: 'INFO', details: { from: 'SUBMITTED', to: 'INTERVIEW' } },
    { userId: null, action: 'LOGIN_ATTEMPT', resource: 'Auth', severity: 'WARN', details: { note: '3 failed attempts for dev@student.io' } },
    { userId: adminUser.id, action: 'DELETE', resource: 'User', severity: 'CRITICAL', details: { note: 'Blocked — soft delete only' } },
  ]
  for (const a of audit) {
    await db.auditLog.create({ data: { ...a, ipAddress: '203.0.113.7' } })
  }

  // Platform settings
  await db.platformSetting.createMany({
    data: [
      { key: 'platform.name', value: 'InternForge' },
      { key: 'platform.tagline', value: 'Verified internships. Measurable skills.' },
      { key: 'features.ai_feedback', value: 'true' },
      { key: 'features.plagiarism', value: 'true' },
      { key: 'features.blockchain_certs', value: 'false' },
    ],
  })

  console.log('Seed complete ✅')
  console.table({
    companies: companies.length,
    students: students.length,
    mentors: mentors.length,
    companyAdmins: companyAdmins.length,
    internships: internships.length,
    applications: applications.length,
    skills: skills.length,
    tasks: tasksSeed.length,
  })
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e)
    db.$disconnect()
    process.exit(1)
  })
