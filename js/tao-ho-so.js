

/* =========================================================
   MCA - TẠO HỒ SƠ SINH VẬT
   File: js/tao-ho-so.js
========================================================= */

const MCA_DRAFT_KEY = "mcaCreatureDraft";
const MAX_ABILITIES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

let selectedImageFile = null;


/* =========================================================
   KHỞI ĐỘNG
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    setupCreatureForm();
    setupImageUpload();
    setupAbilitySystem();
    setupDraftButtons();
    setupResetButton();
    setupAutoSave();

    restoreDraft();

    if (
        document.querySelectorAll(".ability-item").length === 0
    ) {
        addAbility();
    }

    updateAbilityCounter();
});


/* =========================================================
   FORM
========================================================= */

function setupCreatureForm() {

    const form =
        document.getElementById("creatureForm");

    if (!form) {
        console.error("Không tìm thấy #creatureForm - tao-ho-so.js:50");
        return;
    }

    form.addEventListener(
        "submit",
        handleCreatureSubmit
    );
}


/* =========================================================
   SUBMIT HỒ SƠ
========================================================= */

async function handleCreatureSubmit(event) {

    event.preventDefault();

    const {
    data: {
        user
    },
    error: userError
} = await mcaSupabase
    .auth
    .getUser();


if (
    userError ||
    !user
) {

    showToast(
        "Bạn phải đăng nhập trước khi tạo hồ sơ.",
        "error"
    );


    setTimeout(
        () => {

            window.location.href =
                "dang-nhap.html";

        },
        1200
    );


    return;
}

    clearFormErrors();

    const creatureData =
        collectCreatureData();

    const validation =
        validateCreatureData(creatureData);


    if (!validation.valid) {

        showToast(
            validation.message,
            "error"
        );

        focusInvalidField(
            validation.field
        );

        return;
    }


    const submitButton =
        document.querySelector(
            ".create-submit-button"
        );


    try {

        if (submitButton) {

            submitButton.disabled = true;

            submitButton.textContent =
                "ĐANG GỬI HỒ SƠ...";

        }


        showToast(
            "Đang gửi hồ sơ đến MCA...",
            "normal"
        );


        /* =================================================
           1. UPLOAD ẢNH
        ================================================= */

        let imageUrl = null;


        if (selectedImageFile) {

            showToast(
                "Đang tải ảnh sinh vật...",
                "normal"
            );


            imageUrl =
                await uploadCreatureImage();


            console.log(
                "IMAGE URL:",
                imageUrl
            );

        }


        /* =================================================
           2. INSERT CREATURE
        ================================================= */

        const creatureInsertData = {

            creator_id: 
            user.id,

            name:
                creatureData.name,

            species:
                creatureData.species,

            universe:
                creatureData.universe,

            galaxy:
                creatureData.galaxy || null,

            planet:
                creatureData.planet,

            world:
                creatureData.world || null,

            age:
                creatureData.age || null,

            size:
                creatureData.size || null,

            element:
                creatureData.element || null,

            rarity:
                creatureData.rarity || null,

            power_source:
                creatureData.powerSource || null,

            proposed_threat_level:
                creatureData.threatLevel,

            verified_threat_level:
                null,

            description:
                creatureData.description,

            appearance:
                creatureData.appearance || null,

            weaknesses:
                creatureData.weaknesses,

            limitations:
                creatureData.limitations || null,

            strongest_ability_condition:
                creatureData.strongestAbilityCondition || null,

            /* QUAN TRỌNG */
            image_url:
                imageUrl,

            status:
                "pending"
        };


        console.log(
            "Dữ liệu gửi Supabase:",
            creatureInsertData
        );


        const {
            data: creature,
            error: creatureError
        } = await mcaSupabase
            .from("creatures")
            .insert(creatureInsertData)
            .select()
            .single();


        if (creatureError) {

            console.error(
                "Lỗi INSERT creatures:",
                creatureError
            );

            throw creatureError;
        }


        if (!creature) {

            throw new Error(
                "Supabase không trả về hồ sơ vừa tạo."
            );

        }


        console.log(
            "Creature đã tạo:",
            creature
        );


        /* =================================================
           3. TẠO MÃ VX
        ================================================= */

        const creatureCode =
            "VX-" +
            String(creature.id)
                .padStart(4, "0");


        const {
            error: codeError
        } = await mcaSupabase
            .from("creatures")
            .update({

                creature_code:
                    creatureCode,

                updated_at:
                    new Date().toISOString()

            })
            .eq(
                "id",
                creature.id
            );


        if (codeError) {

            console.warn(
                "Không cập nhật được creature_code:",
                codeError
            );

        }


        /* =================================================
           4. INSERT KỸ NĂNG
        ================================================= */

        await insertCreatureAbilities(
            creature.id,
            creatureData.abilities
        );


        /* =================================================
           5. XÓA DRAFT
        ================================================= */

        localStorage.removeItem(
            MCA_DRAFT_KEY
        );


        /* =================================================
           6. THÀNH CÔNG
        ================================================= */

        showSuccessModal({

            ...creatureData,

            id:
                creatureCode,

            databaseId:
                creature.id,

            creatureCode:
                creatureCode,

            imageUrl:
                imageUrl,

            status:
                "pending"

        });


        showToast(
            "Hồ sơ đã được gửi thành công.",
            "success"
        );

    }


    catch (error) {

    console.error(
        "===== MCA SUBMIT ERROR ====="
    );

    console.error(
        "Message:",
        error?.message
    );

    console.error(
        "Code:",
        error?.code
    );

    console.error(
        "Details:",
        error?.details
    );

    console.error(
        "Hint:",
        error?.hint
    );

    console.error(
        "Full error:",
        error
    );


    showToast(
        "Không thể gửi hồ sơ. " +
        (
            error?.message ||
            "Lỗi không xác định"
        ),
        "error"
    );
}

    finally {

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                "GỬI HỒ SƠ ĐIỀU TRA";

        }

    }
}


/* =========================================================
   UPLOAD ẢNH LÊN SUPABASE STORAGE
========================================================= */

async function uploadCreatureImage() {

    if (!selectedImageFile) {

        console.log(
            "Không có ảnh được chọn."
        );

        return null;
    }


    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (
        !allowedTypes.includes(
            selectedImageFile.type
        )
    ) {

        throw new Error(
            "Ảnh phải là JPG, JPEG, PNG hoặc WEBP."
        );

    }


    if (
        selectedImageFile.size >
        MAX_IMAGE_SIZE
    ) {

        throw new Error(
            "Ảnh không được vượt quá 5MB."
        );

    }


    const originalName =
        selectedImageFile.name;


    let extension =
        originalName
            .split(".")
            .pop()
            .toLowerCase();


    /*
        MIME image/jpeg có thể là
        .jpg hoặc .jpeg.
    */

    if (
        ![
            "jpg",
            "jpeg",
            "png",
            "webp"
        ].includes(extension)
    ) {

        if (
            selectedImageFile.type ===
            "image/jpeg"
        ) {
            extension = "jpg";
        }

        else if (
            selectedImageFile.type ===
            "image/png"
        ) {
            extension = "png";
        }

        else if (
            selectedImageFile.type ===
            "image/webp"
        ) {
            extension = "webp";
        }

    }


    const randomId =
        typeof crypto !== "undefined" &&
        crypto.randomUUID

            ? crypto.randomUUID()

            : Math.random()
                .toString(36)
                .substring(2);


    const fileName =
        `${Date.now()}-${randomId}.${extension}`;


    const filePath =
        `uploads/${fileName}`;


    console.log(
        "Bắt đầu upload:",
        {
            originalName:
                selectedImageFile.name,

            type:
                selectedImageFile.type,

            size:
                selectedImageFile.size,

            filePath:
                filePath
        }
    );


    const {
        data: uploadData,
        error: uploadError
    } = await mcaSupabase
        .storage
        .from("creature-images")
        .upload(
            filePath,
            selectedImageFile,
            {
                cacheControl:
                    "3600",

                upsert:
                    false,

                contentType:
                    selectedImageFile.type
            }
        );


    if (uploadError) {

        console.error(
            "Lỗi Supabase Storage:",
            uploadError
        );

        throw uploadError;
    }


    console.log(
        "Upload thành công:",
        uploadData
    );


    /* =====================================================
       LẤY PUBLIC URL
    ===================================================== */

    const {
        data: publicUrlData
    } = mcaSupabase
        .storage
        .from("creature-images")
        .getPublicUrl(filePath);


    const publicUrl =
        publicUrlData?.publicUrl;


    if (!publicUrl) {

        throw new Error(
            "Không lấy được URL ảnh từ Supabase Storage."
        );

    }


    console.log(
        "PUBLIC IMAGE URL:",
        publicUrl
    );


    return publicUrl;
}


/* =========================================================
   SETUP CHỌN ẢNH
========================================================= */

function setupImageUpload() {

    const imageInput =
        document.getElementById(
            "creatureImage"
        );

    const imagePreview =
        document.getElementById(
            "creatureImagePreview"
        );

    const imagePlaceholder =
        document.getElementById(
            "imagePlaceholder"
        );


    if (!imageInput) {

        console.warn(
            "Không tìm thấy #creatureImage"
        );

        return;
    }


    imageInput.addEventListener(
        "change",
        event => {

            const file =
                event.target.files?.[0];


            if (!file) {

                selectedImageFile = null;

                resetImagePreview();

                return;
            }


            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];


            if (
                !allowedTypes.includes(
                    file.type
                )
            ) {

                showToast(
                    "Chỉ chấp nhận JPG, JPEG, PNG hoặc WEBP.",
                    "error"
                );


                imageInput.value = "";

                selectedImageFile = null;

                resetImagePreview();

                return;
            }


            if (
                file.size >
                MAX_IMAGE_SIZE
            ) {

                showToast(
                    "Ảnh không được vượt quá 5MB.",
                    "error"
                );


                imageInput.value = "";

                selectedImageFile = null;

                resetImagePreview();

                return;
            }


            /*
                QUAN TRỌNG:
                lưu File để upload sau.
            */

            selectedImageFile =
                file;


            console.log(
                "Đã chọn ảnh:",
                selectedImageFile
            );


            const reader =
                new FileReader();


            reader.onload =
                readerEvent => {

                    if (imagePreview) {

                        imagePreview.src =
                            readerEvent.target.result;

                        imagePreview.style.display =
                            "block";

                    }


                    if (imagePlaceholder) {

                        imagePlaceholder.style.display =
                            "none";

                    }

                };


            reader.readAsDataURL(file);

        }
    );
}


/* =========================================================
   RESET PREVIEW ẢNH
========================================================= */

function resetImagePreview() {

    const preview =
        document.getElementById(
            "creatureImagePreview"
        );

    const placeholder =
        document.getElementById(
            "imagePlaceholder"
        );


    if (preview) {

        preview.src = "";

        preview.style.display =
            "none";

    }


    if (placeholder) {

        placeholder.style.display =
            "";

    }
}


/* =========================================================
   INSERT KỸ NĂNG
========================================================= */

async function insertCreatureAbilities(
    creatureId,
    abilities
) {

    if (
        !Array.isArray(abilities) ||
        abilities.length === 0
    ) {
        return;
    }


    const cleanAbilities =
        abilities
            .filter(
                ability =>
                    ability.name &&
                    ability.name.trim()
            )
            .slice(
                0,
                MAX_ABILITIES
            );


    if (
        cleanAbilities.length === 0
    ) {
        return;
    }


    const abilityRows =
        cleanAbilities.map(
            ability => ({

                creature_id:
                    creatureId,

                ability_name:
                    ability.name.trim(),

                ability_description:
                    ability.description
                        ?.trim() || null

            })
        );


    const {
        error
    } = await mcaSupabase
        .from(
            "creature_abilities"
        )
        .insert(
            abilityRows
        );


    if (error) {

        console.error(
            "Lỗi lưu kỹ năng:",
            error
        );

        throw error;
    }
}


/* =========================================================
   THU THẬP DỮ LIỆU
========================================================= */

function collectCreatureData() {

    return {

        name:
            getInputValue(
                "creatureName"
            ),

        species:
            getInputValue(
                "creatureSpecies"
            ),

        universe:
            getInputValue(
                "creatureUniverse"
            ),

        galaxy:
            getInputValue(
                "creatureGalaxy"
            ),

        planet:
            getInputValue(
                "creaturePlanet"
            ),

        world:
            getInputValue(
                "creatureWorld"
            ),

        age:
            getInputValue(
                "creatureAge"
            ),

        size:
            getInputValue(
                "creatureSize"
            ),

        element:
            getInputValue(
                "creatureElement"
            ),

        rarity:
            getInputValue(
                "creatureRarity"
            ),

        powerSource:
            getInputValue(
                "creaturePowerSource"
            ),

        threatLevel:
            getInputValue(
                "creatureThreat"
            ),

        description:
            getInputValue(
                "creatureDescription"
            ),

        appearance:
            getInputValue(
                "creatureAppearance"
            ),

        weaknesses:
            getInputValue(
                "creatureWeaknesses"
            ),

        limitations:
            getInputValue(
                "creatureLimitations"
            ),

        strongestAbilityCondition:
            getInputValue(
                "strongestAbilityCondition"
            ),

        abilities:
            collectAbilities()
    };
}


/* =========================================================
   LẤY VALUE INPUT
========================================================= */

function getInputValue(id) {

    const element =
        document.getElementById(id);

    if (!element) {
        return "";
    }

    return String(
        element.value || ""
    ).trim();
}


/* =========================================================
   LẤY DANH SÁCH KỸ NĂNG
========================================================= */

function collectAbilities() {

    const items =
        document.querySelectorAll(
            ".ability-item"
        );


    const abilities = [];


    items.forEach(item => {

        const name =
            item.querySelector(
                ".ability-name"
            )
            ?.value
            ?.trim() || "";


        const description =
            item.querySelector(
                ".ability-description"
            )
            ?.value
            ?.trim() || "";


        /*
            Chỉ tính là một kỹ năng
            khi có tên.
        */

        if (name) {

            abilities.push({

                name:
                    name,

                description:
                    description

            });

        }

    });


    return abilities;
}


/* =========================================================
   VALIDATE
========================================================= */

function validateCreatureData(data) {

    if (!data.name) {

        return invalid(
            "Vui lòng nhập tên sinh vật.",
            "creatureName"
        );

    }


    if (!data.species) {

        return invalid(
            "Vui lòng chọn loài sinh vật.",
            "creatureSpecies"
        );

    }


    if (!data.universe) {

        return invalid(
            "Vui lòng nhập vũ trụ.",
            "creatureUniverse"
        );

    }


    if (!data.planet) {

        return invalid(
            "Vui lòng nhập hành tinh.",
            "creaturePlanet"
        );

    }


    const threatLevels = [
        "F",
        "E",
        "D",
        "C",
        "B",
        "A",
        "S",
        "SS",
        "X"
    ];


    if (
        !threatLevels.includes(
            data.threatLevel
        )
    ) {

        return invalid(
            "Vui lòng chọn cấp độ đe dọa.",
            "creatureThreat"
        );

    }


    if (!data.description) {

        return invalid(
            "Vui lòng nhập mô tả sinh vật.",
            "creatureDescription"
        );

    }


    if (
        data.description.length < 30
    ) {

        return invalid(
            "Mô tả sinh vật phải có ít nhất 30 ký tự.",
            "creatureDescription"
        );

    }


    if (!data.weaknesses) {

        return invalid(
            "Sinh vật phải có ít nhất một điểm yếu.",
            "creatureWeaknesses"
        );

    }


    if (
        data.abilities.length === 0
    ) {

        return invalid(
            "Hãy thêm ít nhất một kỹ năng.",
            null
        );

    }


    if (
        data.abilities.length >
        MAX_ABILITIES
    ) {

        return invalid(
            "Một sinh vật chỉ được có tối đa 5 kỹ năng.",
            null
        );

    }


    return {
        valid: true
    };
}


function invalid(
    message,
    field
) {

    return {

        valid:
            false,

        message:
            message,

        field:
            field

    };
}


/* =========================================================
   ERROR INPUT
========================================================= */

function focusInvalidField(fieldId) {

    if (!fieldId) {
        return;
    }


    const field =
        document.getElementById(
            fieldId
        );


    if (!field) {
        return;
    }


    field.classList.add(
        "input-error"
    );


    field.focus();


    field.scrollIntoView({

        behavior:
            "smooth",

        block:
            "center"

    });
}


function clearFormErrors() {

    document
        .querySelectorAll(
            ".input-error"
        )
        .forEach(
            element => {

                element.classList.remove(
                    "input-error"
                );

            }
        );
}


/* =========================================================
   HỆ THỐNG KỸ NĂNG
========================================================= */

function setupAbilitySystem() {

    const addButton =
        document.getElementById(
            "addAbilityButton"
        );


    if (addButton) {

        addButton.addEventListener(
            "click",
            () => {

                addAbility();

            }
        );

    }


    const list =
        document.getElementById(
            "abilityList"
        );


    if (list) {

        list.addEventListener(
            "click",
            event => {

                const removeButton =
                    event.target.closest(
                        ".remove-ability"
                    );


                if (!removeButton) {
                    return;
                }


                const item =
                    removeButton.closest(
                        ".ability-item"
                    );


                if (!item) {
                    return;
                }


                const count =
                    document.querySelectorAll(
                        ".ability-item"
                    ).length;


                /*
                    Luôn giữ ít nhất
                    một ô kỹ năng.
                */

                if (count <= 1) {

                    const name =
                        item.querySelector(
                            ".ability-name"
                        );

                    const description =
                        item.querySelector(
                            ".ability-description"
                        );


                    if (name) {
                        name.value = "";
                    }


                    if (description) {
                        description.value = "";
                    }


                    showToast(
                        "Hồ sơ cần ít nhất một kỹ năng.",
                        "normal"
                    );


                    return;
                }


                item.remove();

                renumberAbilities();

                updateAbilityCounter();

            }
        );

    }
}


/* =========================================================
   THÊM KỸ NĂNG
========================================================= */

function addAbility(
    abilityData = {}
) {

    const list =
        document.getElementById(
            "abilityList"
        );


    if (!list) {
        return;
    }


    const currentCount =
        list.querySelectorAll(
            ".ability-item"
        ).length;


    if (
        currentCount >=
        MAX_ABILITIES
    ) {

        showToast(
            "Chỉ được thêm tối đa 5 kỹ năng.",
            "error"
        );

        return;
    }


    const item =
        document.createElement("div");


    item.className =
        "ability-item";


    item.innerHTML = `

        <div class="ability-number">
            ${currentCount + 1}
        </div>

        <div class="ability-fields">

            <input
                type="text"
                class="ability-name"
                placeholder="Tên kỹ năng"
                maxlength="100"
                value="${escapeHTML(
                    abilityData.name || ""
                )}"
            >

            <textarea
                class="ability-description"
                placeholder="Mô tả kỹ năng..."
                maxlength="1000"
                rows="3"
            >${escapeHTML(
                abilityData.description || ""
            )}</textarea>

        </div>

        <button
            type="button"
            class="remove-ability"
            title="Xóa kỹ năng"
        >
            ×
        </button>
    `;


    list.appendChild(item);

    updateAbilityCounter();
}


/* =========================================================
   ĐÁNH SỐ KỸ NĂNG
========================================================= */

function renumberAbilities() {

    document
        .querySelectorAll(
            ".ability-item"
        )
        .forEach(
            (item, index) => {

                const number =
                    item.querySelector(
                        ".ability-number"
                    );


                if (number) {

                    number.textContent =
                        index + 1;

                }

            }
        );
}


/* =========================================================
   COUNTER KỸ NĂNG
========================================================= */

function updateAbilityCounter() {

    const counter =
        document.getElementById(
            "abilityCounter"
        );


    const count =
        document.querySelectorAll(
            ".ability-item"
        ).length;


    if (counter) {

        counter.textContent =
            `${count}/${MAX_ABILITIES}`;

    }


    const addButton =
        document.getElementById(
            "addAbilityButton"
        );


    if (addButton) {

        addButton.disabled =
            count >= MAX_ABILITIES;

    }
}


/* =========================================================
   DRAFT BUTTON
========================================================= */

function setupDraftButtons() {

    const saveButton =
        document.getElementById(
            "saveDraftButton"
        );


    if (!saveButton) {
        return;
    }


    saveButton.addEventListener(
        "click",
        () => {

            saveDraft(true);

        }
    );
}


/* =========================================================
   LƯU DRAFT
========================================================= */

function saveDraft(showMessage = false) {

    const data =
        collectCreatureData();


    const draft = {

        ...data,

        savedAt:
            new Date().toISOString()

    };


    try {

        /*
            Không lưu file ảnh Base64
            vào localStorage.

            Tránh lỗi vượt dung lượng
            localStorage.
        */

        localStorage.setItem(
            MCA_DRAFT_KEY,
            JSON.stringify(draft)
        );


        updateAutoSaveStatus();


        if (showMessage) {

            showToast(
                "Đã lưu bản nháp.",
                "success"
            );

        }

    }
    catch (error) {

        console.error(
            "Không thể lưu draft:",
            error
        );


        if (showMessage) {

            showToast(
                "Không thể lưu bản nháp.",
                "error"
            );

        }

    }
}


/* =========================================================
   AUTOSAVE
========================================================= */

function setupAutoSave() {

    const form =
        document.getElementById(
            "creatureForm"
        );


    if (!form) {
        return;
    }


    let timer = null;


    form.addEventListener(
        "input",
        () => {

            clearTimeout(timer);


            timer =
                setTimeout(
                    () => {

                        saveDraft(false);

                    },
                    1000
                );

        }
    );
}


/* =========================================================
   RESTORE DRAFT
========================================================= */

function restoreDraft() {

    let draft;


    try {

        const saved =
            localStorage.getItem(
                MCA_DRAFT_KEY
            );


        if (!saved) {
            return;
        }


        draft =
            JSON.parse(saved);

    }
    catch (error) {

        console.error(
            "Draft bị lỗi:",
            error
        );

        return;
    }


    const fields = {

        creatureName:
            draft.name,

        creatureSpecies:
            draft.species,

        creatureUniverse:
            draft.universe,

        creatureGalaxy:
            draft.galaxy,

        creaturePlanet:
            draft.planet,

        creatureWorld:
            draft.world,

        creatureAge:
            draft.age,

        creatureSize:
            draft.size,

        creatureElement:
            draft.element,

        creatureRarity:
            draft.rarity,

        creaturePowerSource:
            draft.powerSource,

        creatureThreat:
            draft.threatLevel,

        creatureDescription:
            draft.description,

        creatureAppearance:
            draft.appearance,

        creatureWeaknesses:
            draft.weaknesses,

        creatureLimitations:
            draft.limitations,

        strongestAbilityCondition:
            draft.strongestAbilityCondition
    };


    Object.entries(fields)
        .forEach(
            ([id, value]) => {

                const element =
                    document.getElementById(id);


                if (
                    element &&
                    value !== undefined &&
                    value !== null
                ) {

                    element.value =
                        value;

                }

            }
        );


    if (
        Array.isArray(
            draft.abilities
        ) &&
        draft.abilities.length > 0
    ) {

        const list =
            document.getElementById(
                "abilityList"
            );


        if (list) {

            list.innerHTML = "";


            draft.abilities
                .slice(
                    0,
                    MAX_ABILITIES
                )
                .forEach(
                    ability => {

                        addAbility(
                            ability
                        );

                    }
                );

        }

    }


    updateAbilityCounter();
}


/* =========================================================
   RESET FORM
========================================================= */

function setupResetButton() {

    const resetButton =
        document.getElementById(
            "resetCreatureButton"
        );


    if (!resetButton) {
        return;
    }


    resetButton.addEventListener(
        "click",
        () => {

            const confirmed =
                confirm(
                    "Bạn có chắc muốn xóa toàn bộ dữ liệu đang nhập?"
                );


            if (!confirmed) {
                return;
            }


            resetCreatureForm();

        }
    );
}


/* =========================================================
   RESET TOÀN BỘ
========================================================= */

function resetCreatureForm() {

    const form =
        document.getElementById(
            "creatureForm"
        );


    if (form) {
        form.reset();
    }


    selectedImageFile = null;


    const imageInput =
        document.getElementById(
            "creatureImage"
        );


    if (imageInput) {
        imageInput.value = "";
    }


    resetImagePreview();


    const list =
        document.getElementById(
            "abilityList"
        );


    if (list) {
        list.innerHTML = "";
    }


    addAbility();


    localStorage.removeItem(
        MCA_DRAFT_KEY
    );


    clearFormErrors();

    updateAbilityCounter();


    showToast(
        "Đã đặt lại biểu mẫu.",
        "normal"
    );
}


/* =========================================================
   AUTOSAVE STATUS
========================================================= */

function updateAutoSaveStatus() {

    const status =
        document.querySelector(
            ".autosave-status"
        );


    if (!status) {
        return;
    }


    const text =
        status.querySelector(
            "span:last-child"
        );


    if (text) {

        text.textContent =
            "Đã tự động lưu";

    }
}


/* =========================================================
   SUCCESS MODAL
========================================================= */

function showSuccessModal(creature) {

    const oldModal =
        document.getElementById(
            "creatureSuccessModal"
        );


    if (oldModal) {
        oldModal.remove();
    }


    const modal =
        document.createElement("div");


    modal.id =
        "creatureSuccessModal";


    modal.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(0, 4, 10, 0.88);
        backdrop-filter: blur(12px);
    `;


    modal.innerHTML = `

        <div style="
            width:min(520px,100%);
            padding:32px;
            border:1px solid rgba(43,220,255,.35);
            background:#06101a;
            box-shadow:0 0 50px rgba(43,220,255,.12);
        ">

            <div style="
                color:#2bdcff;
                font-family:Orbitron,sans-serif;
                font-size:11px;
                letter-spacing:2px;
                margin-bottom:12px;
            ">
                MCA / SUBMISSION RECEIVED
            </div>

            <h2 style="
                color:#e8f8ff;
                font-family:Orbitron,sans-serif;
                margin:0 0 15px;
            ">
                HỒ SƠ ĐÃ ĐƯỢC GỬI
            </h2>

            <p style="
                color:#91a7b8;
                line-height:1.7;
            ">
                Hồ sơ
                <strong style="color:#fff;">
                    ${escapeHTML(
                        creature.name
                    )}
                </strong>
                đã được gửi đến hệ thống MCA.
            </p>

            <div style="
                margin:20px 0;
                padding:15px;
                border:1px solid rgba(43,220,255,.15);
                background:rgba(43,220,255,.04);
            ">

                <div style="
                    color:#718a9c;
                    font-size:12px;
                ">
                    MÃ HỒ SƠ
                </div>

                <strong style="
                    color:#2bdcff;
                    font-family:Orbitron,sans-serif;
                    font-size:20px;
                ">
                    ${escapeHTML(
                        creature.id
                    )}
                </strong>

                <div style="
                    margin-top:12px;
                    color:#ffd45c;
                    font-size:12px;
                ">
                    ● CHỜ XÁC MINH
                </div>

            </div>

            <div style="
                display:flex;
                gap:10px;
                flex-wrap:wrap;
            ">

                <button
                    id="viewCreatureArchive"
                    type="button"
                    style="
                        flex:1;
                        padding:13px;
                        cursor:pointer;
                        border:1px solid #2bdcff;
                        background:#2bdcff;
                        color:#001018;
                        font-weight:700;
                    "
                >
                    XEM KHO DỮ LIỆU
                </button>

                <button
                    id="createAnotherCreature"
                    type="button"
                    style="
                        flex:1;
                        padding:13px;
                        cursor:pointer;
                        border:1px solid #284659;
                        background:transparent;
                        color:#b9d0df;
                    "
                >
                    TẠO HỒ SƠ KHÁC
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    document
        .getElementById(
            "viewCreatureArchive"
        )
        ?.addEventListener(
            "click",
            () => {

                window.location.href =
                    "kho-du-lieu.html";

            }
        );


    document
        .getElementById(
            "createAnotherCreature"
        )
        ?.addEventListener(
            "click",
            () => {

                modal.remove();

                resetCreatureForm();

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );
}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message,
    type = "normal"
) {

    const oldToast =
        document.querySelector(
            ".mca-form-toast"
        );


    if (oldToast) {
        oldToast.remove();
    }


    const toast =
        document.createElement("div");


    toast.className =
        "mca-form-toast";


    let borderColor =
        "#2bdcff";


    if (type === "error") {
        borderColor = "#ff5f72";
    }


    if (type === "success") {
        borderColor = "#48e5a5";
    }


    toast.style.cssText = `

        position:fixed;

        right:24px;
        bottom:24px;

        z-index:100000;

        max-width:420px;

        padding:14px 18px;

        background:#071522;

        color:#dff7ff;

        border:1px solid ${borderColor};

        box-shadow:
            0 12px 40px
            rgba(0,0,0,.4);

        font-size:13px;

    `;


    toast.textContent =
        message;


    document.body.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.remove();

        },
        4000
    );
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}