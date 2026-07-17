// components/notifications/preferencesModal.js
import Modal from "../../components/ui/Modal.mjs";
import { createElement } from "../../components/createElement.js";
import notificationService from "./notificationService.js";
import { getSoundSettings, setSoundSettings } from "./soundAlerts.js";

export async function openNotificationPreferencesModal() {
    let userId = null;
    let preferences = {
        mentionsEnabled: true,
        followsEnabled: true,
        commentsEnabled: true,
        likesEnabled: true,
        messagesEnabled: true,
        allEnabled: true
    };
    const soundSettings = getSoundSettings();

    // Secure user identification
    try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            const user = JSON.parse(userStr);
            userId = user.id || user._id;
        }
    } catch (e) {
        console.error("Failed to safely retrieve user ID context:", e);
    }

    // Fetch live user states
    if (userId) {
        try {
            const fetched = await notificationService.getPreferences(userId);
            if (fetched) preferences = fetched;
        } catch (error) {
            console.error("Failed to fetch preferences from network layer:", error);
        }
    }

    const content = createElement("div", {
        style: "display: flex; flex-direction: column; gap: 1.5rem; padding: 1rem;"
    });

    // Helper to evaluate and match structural master status values
    const verifyMasterToggleState = () => {
        const subToggles = Array.from(content.querySelectorAll(".notif-toggle"));
        const masterToggle = content.querySelector(".master-toggle");
        if (!masterToggle) return;

        const allChecked = subToggles.every(t => t.checked);
        masterToggle.checked = allChecked;
        preferences.allEnabled = allChecked;
    };

    // Master Toggle Component
    const toggleAllContainer = createElement("div", {
        style: "padding: 1rem; background: #f0f0f0; border-radius: 6px; border-left: 4px solid #007bff;"
    });

    const masterCheckbox = createElement("input", {
        type: "checkbox",
        checked: preferences.allEnabled,
        class: "master-toggle",
        style: "cursor: pointer; width: 1.2rem; height: 1.2rem;",
        onchange: async (e) => {
            const newValue = e.target.checked;
            
            // Scope lookup exclusively inside the container boundary
            content.querySelectorAll(".notif-toggle").forEach(toggle => {
                toggle.checked = newValue;
            });

            // Re-map internal data states symmetrically
            preferences.allEnabled = newValue;
            preferences.mentionsEnabled = newValue;
            preferences.followsEnabled = newValue;
            preferences.commentsEnabled = newValue;
            preferences.likesEnabled = newValue;
            preferences.messagesEnabled = newValue;

            try {
                if (userId) {
                    // Send complete, unified state object to prevent server data drift
                    await notificationService.updatePreferences(userId, { ...preferences });
                }
            } catch (error) {
                console.error("Failed to update master preferences cluster:", error);
            }
        }
    });

    toggleAllContainer.appendChild(
        createElement("label", {
            style: "display: flex; align-items: center; gap: 0.75rem; cursor: pointer; font-weight: 600;"
        }, [masterCheckbox, "Enable All Notifications"])
    );

    content.appendChild(toggleAllContainer);

    const settingsContainer = createElement("div", {
        style: "display: flex; flex-direction: column; gap: 1rem;"
    });

    const configSchema = [
        { key: "mentionsEnabled", label: "Mentions", description: "Notify when someone mentions you", icon: "@" },
        { key: "followsEnabled", label: "Follows", description: "Notify when someone follows you", icon: "👥" },
        { key: "commentsEnabled", label: "Comments", description: "Notify when someone comments on your content", icon: "💬" },
        { key: "likesEnabled", label: "Likes", description: "Notify when someone likes your content", icon: "❤️" },
        { key: "messagesEnabled", label: "Direct Messages", description: "Notify when you receive messages", icon: "✉️" }
    ];

    configSchema.forEach(setting => {
        const toggleContainer = createElement("label", {
            style: "display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; background: #fff; border: 1px solid #e0e0e0; border-radius: 6px; cursor: pointer; transition: background-color 0.2s;"
        });

        // Use standard CSS strings rather than continuous multi-listener mutations
        toggleContainer.addEventListener("mouseenter", () => { toggleContainer.style.backgroundColor = "#f9f9f9"; });
        toggleContainer.addEventListener("mouseleave", () => { toggleContainer.style.backgroundColor = "#fff"; });

        const checkbox = createElement("input", {
            type: "checkbox",
            checked: preferences[setting.key],
            class: "notif-toggle",
            style: "cursor: pointer; width: 1.2rem; height: 1.2rem; flex-shrink: 0;",
            onchange: async (e) => {
                const checkedState = e.target.checked;
                preferences[setting.key] = checkedState;
                
                // Synchronize visual state models dynamically
                verifyMasterToggleState();

                try {
                    if (userId) {
                        await notificationService.updatePreferences(userId, { ...preferences });
                    }
                } catch (error) {
                    console.error(`Failed to update individual item preference: ${setting.key}`, error);
                }
            }
        });

        const textContent = createElement("div", {
            style: "display: flex; flex-direction: column; gap: 0.25rem; flex: 1;"
        }, [
            createElement("strong", { style: "display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem;" }, [setting.icon + " " + setting.label]),
            createElement("small", { style: "color: #666; font-size: 0.85rem;" }, [setting.description])
        ]);

        toggleContainer.append(checkbox, textContent);
        settingsContainer.appendChild(toggleContainer);
    });

    content.appendChild(settingsContainer);

    // Audio Control Layout Setup
    const soundSection = createElement("div", {
        style: "display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; background: #fff8e6; border: 1px solid #f0d78c; border-radius: 8px;"
    }, [
        createElement("strong", { style: "font-size: 0.95rem;" }, ["🔊 Sound alerts"])
    ]);

    const soundToggle = createElement("label", {
        style: "display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; cursor: pointer;"
    }, [
        createElement("span", {}, ["Enable incoming sounds"]),
        createElement("input", {
            type: "checkbox",
            checked: soundSettings.enabled,
            onchange: (e) => {
                setSoundSettings({ enabled: e.target.checked });
            }
        })
    ]);

    const soundRow = createElement("div", {
        style: "display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));"
    });

    // Audio Node Generator helper to avoid structural setup race-conditions
    const buildSelectNode = (labelTxt, currentVal, onUpdateKey) => {
        const optionData = [
            { value: "default", text: "Default" },
            { value: "chime", text: "Chime" },
            { value: "sharp", text: "Sharp" }
        ];

        const selectNode = createElement("select", {
            onchange: (e) => {
                const updatePayload = {};
                updatePayload[onUpdateKey] = e.target.value;
                setSoundSettings(updatePayload);
            }
        }, optionData.map(opt => {
            const attributes = { value: opt.value };
            // Ensure option state maps cleanly onto active parameters
            if (opt.value === currentVal) {
                attributes.selected = "selected";
            }
            return createElement("option", attributes, [opt.text]);
        }));

        return createElement("label", {
            style: "display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.9rem;"
        }, [labelTxt, selectNode]);
    };

    soundRow.appendChild(buildSelectNode("Message tone", soundSettings.messageTone, "messageTone"));
    soundRow.appendChild(buildSelectNode("Notification tone", soundSettings.notificationTone, "notificationTone"));
    
    soundSection.append(soundToggle, soundRow);
    content.appendChild(soundSection);

    content.appendChild(createElement("div", {
        style: "padding: 0.75rem 1rem; background: #e8f4f8; border-left: 4px solid #17a2b8; border-radius: 4px; font-size: 0.85rem; color: #666;"
    }, [
        "💡 You can manage these settings anytime. Disable all notifications to silence them completely."
    ]));

    const modal = new Modal({
        title: "🔔 Notification Preferences",
        content: content,
        size: "medium",
        showFooter: true,
        footerButtons: [
            {
                label: "Done",
                class: "btn-primary",
                onclick: () => { modal.close(); }
            }
        ]
    });

    modal.open();
}