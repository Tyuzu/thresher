// songsTab.ts
import { saveSong } from "./api.js";
import { createElement } from "../../components/createElement.js";
import { createFormGroup } from "../../components/form/createFormGroupEnhanced.js";
import Modal from "../../components/ui/Modal.js";
import Imagex from "../../components/base/Imagex.js";
import Notify from "../../components/ui/Notify.js";
import { uploadFile } from "../media/api/mediaApi.js";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

export interface Song {
    songid?: string | number;
    title?: string;
    genre?: string;
    duration?: string;
    description?: string;
    audio?: string;
    audioextn?: string;
    poster?: string;
    posterextn?: string;
}

export interface OpenSongModalOptions {
    mode: "create" | "edit" | "upload";
    song?: Song;
    artistID: string | number;
    container?: HTMLElement;
    _container?: HTMLElement;
    _isCreator?: boolean;
    isCreator?: boolean;
}

interface UploadResponse {
    filename?: string;
    key?: string;
    extension?: string;
}

export function openSongModal({ mode, song = {}, artistID, container, _container, _isCreator, isCreator }: OpenSongModalOptions): void {
    const isEdit = mode === "edit";
    const safeContainer = container ?? _container ?? document.body;
    void safeContainer;
    void isCreator;

    const form = createSongForm(song);

    const modalInstance = Modal({
        title: isEdit
            ? `Edit Song: ${song.title ?? ""}`
            : "Upload New Song",

        content: form,

        onClose: () => {
            // optional cleanup
        },

        autofocusSelector: 'input[name="title"]'
    });

    const closeModal = (): void => {
        modalInstance?.close();
    };

    const audioInput = form.querySelector('input[name="audio"]') as HTMLInputElement;
    const durationInput = form.querySelector('input[name="duration"]') as HTMLInputElement;
    const titleInput = form.querySelector('input[name="title"]') as HTMLInputElement;
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;

    let durationLoaded: boolean = Boolean(durationInput.value);

    submitBtn.disabled = !durationLoaded;

    // ---------------------------------
    // AUDIO METADATA
    // ---------------------------------

    audioInput.addEventListener("change", () => {
        const file = audioInput.files?.[0];

        durationLoaded = false;
        submitBtn.disabled = true;
        durationInput.value = "";

        if (!file) {
            return;
        }

        // autofill title
        if (!titleInput.value) {
            titleInput.value = file.name.replace(
                /\.[^/.]+$/,
                ""
            );
        }

        const audioEl = document.createElement("audio");

        audioEl.preload = "metadata";
        audioEl.src = URL.createObjectURL(file);

        audioEl.addEventListener("loadedmetadata", () => {
            URL.revokeObjectURL(audioEl.src);

            const totalSeconds = Math.floor(audioEl.duration);

            if (!totalSeconds || Number.isNaN(totalSeconds)) {
                return;
            }

            const mins = Math.floor(totalSeconds / 60);
            const secs = (totalSeconds % 60)
                .toString()
                .padStart(2, "0");

            durationInput.value = `${mins}:${secs}`;
            durationLoaded = true;
            submitBtn.disabled = false;
        });
    });

    // ---------------------------------
    // FORM SUBMIT
    // ---------------------------------

    form.addEventListener("submit", async (e: Event) => {
        e.preventDefault();

        if (!durationLoaded) {
            Notify("Audio duration not loaded yet", { type: "error" });
            return;
        }

        try {
            const uploadedFiles: {
                audio?: string;
                audioextn?: string;
                poster?: string;
                posterextn?: string;
            } = {};

            // ---------------------------------
            // AUDIO UPLOAD
            // ---------------------------------

            const audioFile = audioInput.files?.[0];

            if (audioFile) {
                const res = (await uploadFile({
                    id: `audio-${Date.now()}`,
                    entityType: "song",
                    entityId: String(song.songid || ""),
                    file: audioFile
                })) as UploadResponse;

                uploadedFiles.audio = res.filename || res.key;
                uploadedFiles.audioextn = res.extension || ".m4a";
            }

            // ---------------------------------
            // POSTER UPLOAD
            // ---------------------------------

            const posterInput = form.querySelector(
                'input[name="poster"]'
            ) as HTMLInputElement;

            const posterFile = posterInput.files?.[0];

            if (posterFile) {
                const res = (await uploadFile({
                    id: `poster-${Date.now()}`,
                    entityType: "song",
                    entityId: String(song.songid || ""),
                    file: posterFile
                })) as UploadResponse;

                uploadedFiles.poster = res.filename || res.key;
                uploadedFiles.posterextn = res.extension || ".png";
            }

            // ---------------------------------
            // PAYLOAD
            // ---------------------------------

            const payload: Song = {
                title: titleInput.value.trim(),
                genre: (form.querySelector('[name="genre"]') as HTMLInputElement).value.trim(),
                duration: durationInput.value.trim(),
                description: (form.querySelector('[name="description"]') as HTMLInputElement).value.trim() || ""
            };

            if (uploadedFiles.audio) {
                payload.audio = uploadedFiles.audio;
                payload.audioextn = uploadedFiles.audioextn;
            }

            if (uploadedFiles.poster) {
                payload.poster = uploadedFiles.poster;
                payload.posterextn = uploadedFiles.posterextn;
            }

            // ---------------------------------
            // SAVE SONG
            // ---------------------------------

            await saveSong(artistID, song.songid ?? null, payload, isEdit, {
                headers: {
                    "Content-Type": "application/json"
                }
            });

            closeModal();

            Notify("Song saved successfully", { type: "success" });

        } catch (err: any) {
            console.error(err);

            Notify(`Upload failed: ${err.message}`, { type: "error" });
        }
    });
}

// ------------------------ Song Form ------------------------
function createSongForm(song: Song = {}): HTMLFormElement {
    const audioPreview = createElement("audio", { controls: true, style: { display: "none", marginTop: "10px" } }) as HTMLAudioElement;
    const imagePreview = Imagex({ style: "display:none;max-height:120px;margin-top:10px;" } as any) as HTMLImageElement;

    const audioGroup = createFormGroup({ type: "file", name: "audio", label: "Audio File", accept: "audio/*", additionalNodes: [audioPreview] as Node[] }) as HTMLElement;
    const imageGroup = createFormGroup({ type: "file", name: "poster", label: "Poster Image", accept: "image/*", additionalNodes: [imagePreview] as Node[] }) as HTMLElement;

    setupFilePreview(audioGroup.querySelector("input") as HTMLInputElement, audioPreview, "audio");
    setupFilePreview(imageGroup.querySelector("input") as HTMLInputElement, imagePreview, "image");

    return createElement("form", { class: "song-form" }, [
        createFormGroup({ type: "text", id: "title", name: "title", label: "Title", value: song.title || "", placeholder: "Song Title", required: true }),
        createFormGroup({ type: "text", id: "genre", name: "genre", label: "Genre", value: song.genre || "", placeholder: "Genre", required: true }),
        createFormGroup({ type: "text", id: "duration", name: "duration", label: "Duration", value: song.duration || "", placeholder: "Duration", required: true }),
        createFormGroup({ type: "text", id: "description", name: "description", label: "Description", value: song.description || "", placeholder: "Description (optional)" }),
        audioGroup,
        imageGroup,
        createElement("button", { type: "submit" }, [song.songid ? "Save Changes" : "Add Song"]),
    ]) as HTMLFormElement;
}

// ------------------------ File Preview ------------------------
function setupFilePreview(input: HTMLInputElement, preview: HTMLAudioElement | HTMLElement, type: "audio" | "image"): void {
    input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) {
            preview.style.display = "none";
            return;
        }

        const url = URL.createObjectURL(file);
        if (type === "audio" && file.type.startsWith("audio/")) {
            const audioEl = preview as HTMLAudioElement;
            audioEl.src = url;
            audioEl.load();
            audioEl.style.display = "block";
        }
        if (type === "image" && file.type.startsWith("image/")) {
            const img = preview as HTMLImageElement;
            img.style.display = "block";
            img.src = url;
        }
    });
}