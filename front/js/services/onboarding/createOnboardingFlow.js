import { createElement } from "../components/createElement.js";
import { Button } from "../components/base/Button.js";
import Modal from "../components/ui/Modal.mjs";
import { buildLabelMap } from "./onboardingConfig.js";

/**
 * Core engine to build and display an interactive onboarding flow.
 * 
 * @param {Object} options
 * @param {string} options.storageKey - Key used for localStorage persistence.
 * @param {string} options.title - Modal title text.
 * @param {Object} options.stepConfigs - Configuration object containing all steps.
 * @param {Function} [options.onComplete] - Optional callback triggered after finishing.
 */
export function createOnboardingFlow({ storageKey, title, stepConfigs, onComplete }) {
  if (localStorage.getItem(storageKey)) {
    return;
  }

  const state = {
    currentStepId: "choice",
    editingFromSummary: false,
    history: [],
    answers: {},
    path: null
  };

  const labelMap = buildLabelMap(stepConfigs);

  const modalEl = Modal({
    title,
    size: "large",
    content: () => createElement("div", { id: "onboarding-container", class: "onboarding-box" }, []),
    closeOnOverlayClick: false
  });

  const container = modalEl.querySelector("#onboarding-container");

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

    if (state.editingFromSummary) {
      state.editingFromSummary = false;
      goToStep("summary");
      return;
    }

    const nextStepId = config.getNextStep ? config.getNextStep(value) : config.nextStep;
    goToStep(nextStepId);
  }

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

    const finishBtn = Button("Finish", "btn-finish", {
      click: () => {
        localStorage.setItem(storageKey, JSON.stringify(state.answers));
        modalEl.remove();
        if (typeof onComplete === "function") {
          onComplete(state.answers);
        }
      }
    }, "buttonx");
    container.appendChild(finishBtn);

    if (state.history.length > 0) {
      const backBtn = Button("Back", "btn-back", { click: goBack }, "button-back");
      container.appendChild(backBtn);
    }
  }

  function renderStep(stepId) {
    const config = stepConfigs[stepId];
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

  render();
}