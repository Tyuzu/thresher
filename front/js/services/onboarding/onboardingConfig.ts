/**
 * Generic Onboarding Step Configurations and Data Maps.
 */
export const BASE_ONBOARDING_STEPS = {
  choice: {
    id: "choice",
    title: "Do you want to Work or Hire?",
    key: "choice",
    options: { Work: "work", Hire: "hire" },
    showBack: false,
    getNextStep: (val) => (val === "work" ? "workDays" : "hireType")
  },
  // Work path steps
  workDays: {
    id: "workDays",
    title: "How many days do you want to work?",
    key: "days",
    options: { "1 Day": "1", "Few Days": "few", "Long Term": "long", "Weekend Only": "weekend" },
    nextStep: "workType"
  },
  workType: {
    id: "workType",
    title: "Select work type",
    key: "type",
    options: { Kitchen: "kitchen", Delivery: "delivery", Cleaning: "cleaning", Retail: "retail", "Event Staff": "event" },
    nextStep: "workShift"
  },
  workShift: {
    id: "workShift",
    title: "Preferred shift timing?",
    key: "shift",
    options: { Morning: "morning", Afternoon: "afternoon", Night: "night", Flexible: "flexible" },
    nextStep: "workLocation"
  },
  workLocation: {
    id: "workLocation",
    title: "Preferred work location?",
    key: "location",
    options: { "Near Me": "near", Remote: "remote", "Specific Area": "specific" },
    nextStep: "workPay"
  },
  workPay: {
    id: "workPay",
    title: "What pay range are you expecting?",
    key: "pay",
    options: { "Below 1000/day": "low", "1000–2000/day": "medium", "2000+/day": "high" },
    nextStep: "summary"
  },
  // Hire path steps
  hireType: {
    id: "hireType",
    title: "What type of worker are you looking to hire?",
    key: "hireType",
    options: { "Part-Time": "parttime", "Full-Time": "fulltime", Temporary: "temp" },
    nextStep: "hireShift"
  },
  hireShift: {
    id: "hireShift",
    title: "What shift do you need covered?",
    key: "shift",
    options: { Morning: "morning", Afternoon: "afternoon", Night: "night", Flexible: "flexible" },
    nextStep: "hirePay"
  },
  hirePay: {
    id: "hirePay",
    title: "What pay range are you offering?",
    key: "pay",
    options: { Low: "low", Medium: "medium", High: "high" },
    nextStep: "hireLocation"
  },
  hireLocation: {
    id: "hireLocation",
    title: "Where is the job located?",
    key: "location",
    options: { "Near Me": "near", Remote: "remote", "Specific Area": "specific" },
    nextStep: "summary"
  }
};

/**
 * Global label map helper to transform stored values back to user labels.
 */
export function buildLabelMap(stepConfigs) {
  const labelMap = {};
  Object.values(stepConfigs).forEach((cfg) => {
    if (cfg.options) {
      Object.entries(cfg.options).forEach(([label, val]) => {
        labelMap[val] = label;
      });
    }
  });
  return labelMap;
}