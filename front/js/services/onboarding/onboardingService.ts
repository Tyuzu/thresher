import { createOnboardingFlow } from "./createOnboardingFlow.js";
import { BASE_ONBOARDING_STEPS } from "./onboardingConfig.js";

/**
 * Triggers the Farmium onboarding flow.
 */
export function FarmiumOnboarding(onComplete) {
  return createOnboardingFlow({
    storageKey: "farmiumOnboarding",
    title: "Farmium Onboarding",
    stepConfigs: BASE_ONBOARDING_STEPS,
    onComplete
  });
}

/**
 * Triggers the Baito onboarding flow.
 */
export function BaitoOnboarding(onComplete) {
  return createOnboardingFlow({
    storageKey: "baitoOnboarding",
    title: "Baito Onboarding",
    stepConfigs: BASE_ONBOARDING_STEPS,
    onComplete
  });
}

/**
 * Example: Easily add new feature onboardings in the future.
 */
export function CustomFeatureOnboarding(customSteps, storageKey, title, onComplete) {
  return createOnboardingFlow({
    storageKey: storageKey || "customOnboarding",
    title: title || "Welcome to New Feature",
    stepConfigs: customSteps || BASE_ONBOARDING_STEPS,
    onComplete
  });
}