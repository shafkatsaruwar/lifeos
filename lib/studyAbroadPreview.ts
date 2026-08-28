import { emptyStudyAbroadHub, type StudyAbroadHub } from "@/lib/studyAbroadTypes";

/** Visual-only sample hub. Enabled with ?saPreview=1|full|sparse — never persisted. */
export function buildStudyAbroadPreviewHub(mode: string = "full"): StudyAbroadHub {
  if (mode === "sparse") {
    const stamp = new Date().toISOString();
    return {
      ...emptyStudyAbroadHub,
      countries: [
        { id: "preview-de", name: "Germany", code: "DE", active: true, createdAt: stamp, updatedAt: stamp },
      ],
      sessionMemory: { lastView: "dashboard", updatedAt: stamp },
    };
  }

  const stamp = new Date().toISOString();
  const inDays = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };

  return {
    ...emptyStudyAbroadHub,
    countries: [
      { id: "preview-de", name: "Germany", code: "DE", active: true, createdAt: stamp, updatedAt: stamp },
      { id: "preview-nl", name: "Netherlands", code: "NL", active: true, createdAt: stamp, updatedAt: stamp },
      { id: "preview-gb", name: "United Kingdom", code: "GB", active: true, createdAt: stamp, updatedAt: stamp },
      { id: "preview-es", name: "Spain", code: "ES", active: true, createdAt: stamp, updatedAt: stamp },
    ],
    universities: [
      { id: "preview-thi", countryId: "preview-de", name: "TH Ingolstadt", city: "Ingolstadt", createdAt: stamp, updatedAt: stamp, saved: true },
      { id: "preview-tum", countryId: "preview-de", name: "Technical University of Munich", city: "Munich", createdAt: stamp, updatedAt: stamp, saved: true },
      { id: "preview-tud", countryId: "preview-nl", name: "TU Delft", city: "Delft", createdAt: stamp, updatedAt: stamp, saved: true },
      { id: "preview-ucl", countryId: "preview-gb", name: "UCL", city: "London", createdAt: stamp, updatedAt: stamp, saved: true },
      { id: "preview-upc", countryId: "preview-es", name: "UPC Barcelona", city: "Barcelona", createdAt: stamp, updatedAt: stamp, saved: true },
    ],
    programs: [
      {
        id: "preview-thi-ux",
        universityId: "preview-thi",
        name: "MSc User Experience Design",
        status: "shortlisted",
        shortlisted: true,
        fitScore: 9,
        deadline: inDays(38),
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        id: "preview-tum-id",
        universityId: "preview-tum",
        name: "MSc Industrial Design",
        status: "researching",
        shortlisted: false,
        fitScore: 7,
        deadline: inDays(52),
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        id: "preview-tud-ide",
        universityId: "preview-tud",
        name: "MSc Design for Interaction",
        status: "shortlisted",
        shortlisted: true,
        fitScore: 8,
        deadline: inDays(61),
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        id: "preview-ucl-hci",
        universityId: "preview-ucl",
        name: "MSc Human-Computer Interaction",
        status: "shortlisted",
        shortlisted: true,
        fitScore: 8,
        deadline: inDays(74),
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        id: "preview-upc-di",
        universityId: "preview-upc",
        name: "MSc Design Innovation",
        status: "discovering",
        shortlisted: false,
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        id: "preview-thi-ai",
        universityId: "preview-thi",
        name: "MSc Artificial Intelligence",
        status: "researching",
        shortlisted: false,
        deadline: inDays(90),
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    applications: [
      {
        id: "preview-app-1",
        programId: "preview-thi-ux",
        stage: "preparing",
        intake: "Winter 2027",
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    requirements: [
      {
        id: "preview-req-1",
        programId: "preview-thi-ux",
        title: "Portfolio",
        status: "draft",
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        id: "preview-req-2",
        programId: "preview-thi-ux",
        title: "SOP",
        status: "missing",
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    documents: [],
    applicationDocuments: [],
    funding: [],
    programFunding: [],
    tasks: [
      {
        id: "preview-task-1",
        title: "Review portfolio requirements",
        parentType: "program",
        parentId: "preview-thi-ux",
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    knowledge: [],
    costs: [],
    timelineEvents: [
      {
        id: "preview-tl-1",
        title: "THI application deadline",
        date: inDays(38),
        kind: "deadline",
        contextType: "program",
        contextId: "preview-thi-ux",
        createdAt: stamp,
      },
      {
        id: "preview-tl-2",
        title: "Scholarship deadline",
        date: inDays(55),
        kind: "scholarship_deadline",
        contextType: "country",
        contextId: "preview-de",
        createdAt: stamp,
      },
      {
        id: "preview-tl-3",
        title: "UCL HCI deadline",
        date: inDays(74),
        kind: "deadline",
        contextType: "program",
        contextId: "preview-ucl-hci",
        createdAt: stamp,
      },
    ],
    history: [],
    sessionMemory: { lastProgramId: "preview-thi-ux", lastView: "dashboard", updatedAt: stamp },
  };
}
