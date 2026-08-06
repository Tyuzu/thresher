// onboarding/baitoOnboard.js
import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import Modal from "../../components/ui/Modal.mjs";

/**
 * Onboarding step configurations.
 * Declarative structure allows adding, removing, or reordering steps easily.
 */
const STEP_CONFIGS = {
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
 * Call Onboarding() to open the modal.
 * Saves final answers to localStorage key "baitoOnboarding".
 */
export function Onboarding() {
  if (localStorage.getItem("baitoOnboarding")) {
    return;
  }

  // State management
  const state = {
    currentStepId: "choice",
    editingFromSummary: false,
    history: [],
    answers: {},
    path: null
  };

  // Map values back to human-readable labels for summary view
  const labelMap = {};
  Object.values(STEP_CONFIGS).forEach((cfg) => {
    Object.entries(cfg.options).forEach(([label, val]) => {
      labelMap[val] = label;
    });
  });

  // Base Modal creation
  const modalEl = Modal({
    title: "Baito Onboarding",
    size: "large",
    content: () => createElement("div", { id: "onboarding-container", class: "onboarding-box" }, []),
    closeOnOverlayClick: false
  });

  const container = modalEl.querySelector("#onboarding-container");

  // --- Components ---
  function Stepper({ total, current }) {
    const wrap = createElement("div", {
      class: "stepper-wrap",
      role: "progressbar",
      "aria-valuemin": "1",
      "aria-valuemax": String(total),
      "aria-valuenow": String(current),
      style: "display:flex;gap:8px;margin-bottom:14px;"
    }, []);

    for (let i = 1; i <= total; i++) {
      const bg = i < current ? "#4caf50" : i === current ? "#1976d2" : "#e0e0e0";
      const stepEl = createElement("div", {
        class: "step-seg",
        style: `flex:1; height:10px; border-radius:6px; background:${bg}; transition: background 220ms ease;`
      }, []);
      wrap.appendChild(stepEl);
    }
    return wrap;
  }

  // --- Flow Helpers ---
  function getPathStepCount() {
    return state.path === "hire" ? 5 : 6;
  }

  function getStepIndex(stepId) {
    if (stepId === "choice") return 1;
    if (stepId === "summary") return getPathStepCount();

    const workOrder = ["choice", "workDays", "workType", "workShift", "workLocation", "workPay", "summary"];
    const hireOrder = ["choice", "hireType", "hireShift", "hirePay", "hireLocation", "summary"];
    const order = state.path === "hire" ? hireOrder : workOrder;

    const idx = order.indexOf(stepId);
    return idx !== -1 ? idx + 1 : 1;
  }

  function goToStep(stepId, isBack = false) {
    if (!isBack && state.currentStepId && state.currentStepId !== stepId) {
      state.history.push(state.currentStepId);
    }
    state.currentStepId = stepId;
    render();
  }

  function goBack() {
    const prevStepId = state.history.pop();
    if (prevStepId) {
      state.currentStepId = prevStepId;
      render();
    }
  }

  function handleOptionSelect(config, value) {
    state.answers[config.key] = value;

    if (config.id === "choice") {
      state.path = value;
    }

    // Direct return to summary when editing a single choice
    if (state.editingFromSummary) {
      state.editingFromSummary = false;
      goToStep("summary");
      return;
    }

    const nextStepId = config.getNextStep ? config.getNextStep(value) : config.nextStep;
    goToStep(nextStepId);
  }

  // --- Render Views ---
  function renderSummary() {
    container.innerHTML = "";
    const totalSteps = getPathStepCount();
    container.appendChild(Stepper({ total: totalSteps, current: totalSteps }));
    container.appendChild(createElement("h2", {}, ["Summary of your choices:"]));

    const isWork = state.path === "work";
    const stepKeys = isWork
      ? [
          { label: "Choice", key: "choice", stepId: "choice" },
          { label: "Days", key: "days", stepId: "workDays" },
          { label: "Type", key: "type", stepId: "workType" },
          { label: "Shift", key: "shift", stepId: "workShift" },
          { label: "Location", key: "location", stepId: "workLocation" },
          { label: "Pay", key: "pay", stepId: "workPay" }
        ]
      : [
          { label: "Choice", key: "choice", stepId: "choice" },
          { label: "Worker Type", key: "hireType", stepId: "hireType" },
          { label: "Shift", key: "shift", stepId: "hireShift" },
          { label: "Pay", key: "pay", stepId: "hirePay" },
          { label: "Location", key: "location", stepId: "hireLocation" }
        ];

    const rows = stepKeys.map(({ label, key, stepId }) => {
      const rawVal = state.answers[key];
      const displayVal = labelMap[rawVal] || rawVal || "—";

      return createElement("div", {
        style: "display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f7f7f7;"
      }, [
        createElement("div", {}, [createElement("strong", {}, [`${label}: `]), displayVal]),
        Button("Edit", `edit-${key}`, {
          click: () => {
            state.editingFromSummary = true;
            goToStep(stepId);
          }
        }, "button-link")
      ]);
    });

    container.appendChild(createElement("div", { style: "margin:8px 0 18px 0;" }, rows));

    // Finish Action
    const finishBtn = Button("Finish", "btn-finish", {
      click: () => {
        localStorage.setItem("baitoOnboarding", JSON.stringify(state.answers));
        modalEl.remove();
      }
    }, "buttonx");
    container.appendChild(finishBtn);

    if (state.history.length > 0) {
      const backBtn = Button("Back", "btn-back", { click: goBack }, "button-back");
      container.appendChild(backBtn);
    }
  }

  function renderStep(stepId) {
    const config = STEP_CONFIGS[stepId];
    if (!config) return;

    container.innerHTML = "";

    const currentStepNum = getStepIndex(stepId);
    const totalSteps = getPathStepCount();

    container.appendChild(Stepper({ total: totalSteps, current: currentStepNum }));
    container.appendChild(createElement("h2", {}, [config.title]));

    const optsWrap = createElement("div", { style: "display:flex;flex-direction:column;gap:8px;margin:12px 0;" }, []);

    Object.entries(config.options).forEach(([label, value]) => {
      const btn = Button(
        label,
        `btn-${label.replace(/\s+/g, "-").toLowerCase()}`,
        { click: () => handleOptionSelect(config, value) },
        "buttonx"
      );
      optsWrap.appendChild(btn);
    });

    container.appendChild(optsWrap);

    const showBack = config.showBack !== false && state.history.length > 0;
    if (showBack) {
      const backBtn = Button("Back", "btn-back", { click: goBack }, "button-back");
      container.appendChild(backBtn);
    }
  }

  function render() {
    if (state.currentStepId === "summary") {
      renderSummary();
    } else {
      renderStep(state.currentStepId);
    }
  }

  // Initial Start
  render();
}