import { safeArgBuilder } from "../safeArgsBuilder.js";
export const baitoStaticRoutes = {
  "/baitos": { moduleImport: () => import("../../pages/baitos/baitos.js"), functionName: "Baitos" },
  "/baitos/dash": { moduleImport: () => import("../../pages/baitos/baitoDash.js"), functionName: "BaitoDash", protected: true },
  "/baitos/hire": { moduleImport: () => import("../../pages/baitos/hireWorkers.js"), functionName: "HireWorkers" },
  "/baitos/create-profile": { moduleImport: () => import("../../pages/baitos/createProfile.js"), functionName: "CreateBaitoProfile", protected: true },
  "/create-baito": { moduleImport: () => import("../../pages/baitos/createNewBaito.js"), functionName: "CreateBaito", protected: true },
  "/booking": { moduleImport: () => import("../../pages/booking/booking.js"), functionName: "Booking" },
};

export const baitoDynamicRoutes = [
  {
    pattern: /^\/baito\/([\w-]+)$/,
    moduleImport: () => import("../../pages/baitos/displayBaito.js"),
    functionName: "Baito",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/baitos\/worker\/([\w-]+)$/,
    moduleImport: () => import("../../pages/baitos/displayBaitoWorker.js"),
    functionName: "Worker",
    protected: true,
    argBuilder: safeArgBuilder
  },
];