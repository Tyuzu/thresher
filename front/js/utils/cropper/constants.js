// constants.js

export const CROPPER_VERSION = "1.5.13";

export const JS_SRC =
  `https://unpkg.com/cropperjs@${CROPPER_VERSION}/dist/cropper.min.js`;

export const CSS_HREF =
  `https://unpkg.com/cropperjs@${CROPPER_VERSION}/dist/cropper.min.css`;

export const CROP_SIZES = {
  avatar: {
    width: 300,
    height: 300
  },

  banner: {
    width: 700,
    height: 300
  }
};

export const DEFAULT_ADJUSTMENTS = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  blur: 0,
  hueRotate: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0
};

export const CONTROL_CONFIG = {
  brightness: {
    min: 0.5,
    max: 1.8,
    step: 0.01,
    unit: "x"
  },

  contrast: {
    min: 0.5,
    max: 1.8,
    step: 0.01,
    unit: "x"
  },

  saturation: {
    min: 0,
    max: 2.5,
    step: 0.01,
    unit: "x"
  },

  blur: {
    min: 0,
    max: 8,
    step: 0.1,
    unit: "px"
  },

  hueRotate: {
    min: -180,
    max: 180,
    step: 1,
    unit: "deg"
  },

  grayscale: {
    min: 0,
    max: 1,
    step: 0.01,
    unit: "%"
  },

  sepia: {
    min: 0,
    max: 1,
    step: 0.01,
    unit: "%"
  },

  invert: {
    min: 0,
    max: 1,
    step: 0.01,
    unit: "%"
  }
};

export const PRESETS = {
  normal: {
    brightness: 1,
    contrast: 1,
    saturation: 1,
    blur: 0,
    hueRotate: 0,
    grayscale: 0,
    sepia: 0,
    invert: 0
  },

  warm: {
    brightness: 1.04,
    contrast: 1.06,
    saturation: 1.10,
    blur: 0,
    hueRotate: -8,
    grayscale: 0,
    sepia: 0.14,
    invert: 0
  },

  cool: {
    brightness: 0.99,
    contrast: 1.08,
    saturation: 1.05,
    blur: 0,
    hueRotate: 16,
    grayscale: 0,
    sepia: 0,
    invert: 0
  },

  mono: {
    brightness: 1,
    contrast: 1.10,
    saturation: 0,
    blur: 0,
    hueRotate: 0,
    grayscale: 1,
    sepia: 0,
    invert: 0
  },

  vintage: {
    brightness: 1.03,
    contrast: 0.95,
    saturation: 0.90,
    blur: 0,
    hueRotate: -12,
    grayscale: 0,
    sepia: 0.28,
    invert: 0
  },

  dramatic: {
    brightness: 0.96,
    contrast: 1.28,
    saturation: 1.08,
    blur: 0,
    hueRotate: 0,
    grayscale: 0,
    sepia: 0,
    invert: 0
  }
};