export interface GrowingConditions {
    soil: string;
    sunlight: string;
    water: string;
    temperature: string;
}

export interface NutritionalValue {
    label: string;
    value: string;
}

export interface CropAbout {
    id: string;
    commonName: string;
    scientificName: string;
    image: string;
    imageAlt: string;
    description: string;
    plantingHarvesting: string;
    usage: string;
    nutritionalValues: NutritionalValue[];
    growingConditions: GrowingConditions;
    careTips: string[];
    varieties: string[];
    funFacts: string[];
}

export type CreateCropAboutPayload = Omit<CropAbout, "id"> & { id?: string };
export type UpdateCropAboutPayload = Partial<CreateCropAboutPayload>;

export interface CropAboutResponse {
    crop?: CropAbout;
    crops?: CropAbout[];
    message?: string;
}