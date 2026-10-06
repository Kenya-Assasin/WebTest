/* =========================================================
   MCA ADMIN CREATURE REVIEW
========================================================= */

let currentReviewCreature = null;


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await initializeReviewPage();

    }
);


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeReviewPage() {

    try {

        const isAdmin =
            await verifyReviewAdmin();


        if (!isAdmin) {
            return;
        }


        const params =
            new URLSearchParams(
                window.location.search
            );


        const creatureId =
            params.get("id");


        if (!creatureId) {

            throw new Error(
                "URL không chứa ID hồ sơ."
            );

        }


        await loadReviewCreature(
            creatureId
        );


        setupReviewActions();

    }
    catch (error) {

        console.error(
            "Review initialization error:",
            error
        );


        showReviewError(
            error.message
        );

    }

}


/* =========================================================
   VERIFY ADMIN
========================================================= */

async function verifyReviewAdmin() {

    const {
        data: {
            user
        },
        error
    } = await mcaSupabase
        .auth
        .getUser();


    if (
        error ||
        !user
    ) {

        showReviewError(
            "Bạn chưa đăng nhập."
        );

        return false;
    }


    const {
        data: profile,
        error: profileError
    } = await mcaSupabase
        .from("profiles")
        .select("role")
        .eq(
            "id",
            user.id
        )
        .single();


    if (
        profileError ||
        !profile
    ) {

        showReviewError(
            "Không thể xác minh tài khoản."
        );

        return false;
    }


    if (
        profile.role !==
        "admin"
    ) {

        showReviewError(
            "Tài khoản không có quyền Admin."
        );

        return false;
    }


    return true;

}


/* =========================================================
   LOAD CREATURE
========================================================= */

async function loadReviewCreature(
    creatureId
) {

    const {
        data: creature,
        error: creatureError
    } = await mcaSupabase
        .from("creatures")
        .select("*")
        .eq(
            "id",
            creatureId
        )
        .single();


    if (creatureError) {
        throw creatureError;
    }


    if (!creature) {

        throw new Error(
            "Không tìm thấy hồ sơ."
        );

    }


    const {
        data: abilities,
        error: abilityError
    } = await mcaSupabase
        .from("creature_abilities")
        .select("*")
        .eq(
            "creature_id",
            creature.id
        )
        .order(
            "id",
            {
                ascending: true
            }
        );


    if (abilityError) {

        console.error(
            "Ability error:",
            abilityError
        );

    }


    currentReviewCreature =
        creature;


    renderReviewCreature(
        creature,
        abilities || []
    );


    document.getElementById(
        "reviewLoading"
    ).hidden = true;


    document.getElementById(
        "reviewError"
    ).hidden = true;


    document.getElementById(
        "reviewContent"
    ).hidden = false;


    document.title =
        `Kiểm duyệt ${creature.name} | MCA`;

}


/* =========================================================
   RENDER CREATURE
========================================================= */

function renderReviewCreature(
    creature,
    abilities
) {

    const code =
        creature.creature_code ||
        `MCA-${creature.id}`;


    const species =
        getReviewSpeciesName(
            creature.species
        );


    const element =
        getReviewElementName(
            creature.element
        );


    const rarity =
        getReviewRarityName(
            creature.rarity
        );


    const proposedThreat =
        creature.proposed_threat_level ||
        "?";


    /* IMAGE */

    const image =
        document.getElementById(
            "reviewCreatureImage"
        );


    if (image) {

        image.src =
            creature.image_url ||
            "assets/mca-background.png";


        image.onerror =
            function () {

                this.onerror = null;

                this.src =
                    "assets/mca-background.png";

            };

    }


    /* CODE */

    setReviewText(
        "reviewBreadcrumbCode",
        code
    );

    setReviewText(
        "reviewImageCode",
        code
    );

    setReviewText(
        "reviewCreatureCode",
        code
    );


    /* BASIC */

    setReviewText(
        "reviewCreatureName",
        creature.name ||
        "UNKNOWN CREATURE"
    );


    setReviewText(
        "reviewCreatureSpecies",
        species
    );


    setReviewText(
        "reviewUniverse",
        creature.universe || "—"
    );


    setReviewText(
        "reviewPlanet",
        creature.planet || "—"
    );


    setReviewText(
        "reviewElement",
        element
    );


    setReviewText(
        "reviewRarity",
        rarity
    );


    /* DESCRIPTION */

    setReviewText(
        "reviewDescription",
        creature.description ||
        "Chưa có dữ liệu."
    );


    /* ORIGIN */

    setReviewText(
        "reviewOriginUniverse",
        creature.universe || "—"
    );


    setReviewText(
        "reviewGalaxy",
        creature.galaxy || "—"
    );


    setReviewText(
        "reviewOriginPlanet",
        creature.planet || "—"
    );


    setReviewText(
        "reviewWorld",
        creature.world || "—"
    );


    /* CLASSIFICATION */

    setReviewText(
        "reviewSpecies",
        species
    );


    setReviewText(
        "reviewAge",
        creature.age || "—"
    );


    setReviewText(
        "reviewSize",
        creature.size || "—"
    );


    setReviewText(
        "reviewPowerSource",
        creature.power_source ||
        "—"
    );


    /* APPEARANCE */

    setReviewText(
        "reviewAppearance",
        creature.appearance ||
        "Chưa có dữ liệu."
    );


    /* WEAKNESS */

    setReviewText(
        "reviewWeaknesses",
        creature.weaknesses ||
        "Chưa có dữ liệu."
    );


    setReviewText(
        "reviewLimitations",
        creature.limitations ||
        "Chưa có dữ liệu."
    );


    setReviewText(
        "reviewStrongestCondition",
        creature
            .strongest_ability_condition ||
        "Chưa có dữ liệu."
    );


    /* THREAT */

    setReviewText(
        "reviewProposedThreat",
        proposedThreat
    );


    setReviewText(
        "adminProposedThreat",
        proposedThreat
    );


    const select =
        document.getElementById(
            "adminThreatSelect"
        );


    if (
        select &&
        creature.verified_threat_level
    ) {

        select.value =
            creature
                .verified_threat_level;


        setReviewText(
            "adminVerifiedThreatPreview",
            creature
                .verified_threat_level
        );

    }


    /* STATUS */

    const status =
        document.getElementById(
            "reviewCurrentStatus"
        );


    if (status) {

        status.textContent =
            getReviewStatusName(
                creature.status
            );

    }


    renderReviewAbilities(
        abilities
    );

}


/* =========================================================
   ABILITIES
========================================================= */

function renderReviewAbilities(
    abilities
) {

    const container =
        document.getElementById(
            "reviewAbilityList"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !abilities ||
        abilities.length === 0
    ) {

        container.innerHTML = `
            <p class="review-text">
                Chưa có dữ liệu kỹ năng.
            </p>
        `;

        return;
    }


    abilities.forEach(
        (ability, index) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "review-ability";


            const number =
                document.createElement(
                    "div"
                );


            number.className =
                "review-ability-number";


            number.textContent =
                String(index + 1)
                    .padStart(
                        2,
                        "0"
                    );


            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "review-ability-info";


            const title =
                document.createElement(
                    "strong"
                );


            title.textContent =
                ability.ability_name ||
                "UNKNOWN";


            const description =
                document.createElement(
                    "p"
                );


            description.textContent =
                ability
                    .ability_description ||
                "Chưa có mô tả.";


            info.appendChild(
                title
            );


            info.appendChild(
                description
            );


            item.appendChild(
                number
            );


            item.appendChild(
                info
            );


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   ACTIONS
========================================================= */

function setupReviewActions() {

    const select =
        document.getElementById(
            "adminThreatSelect"
        );


    const verifyButton =
        document.getElementById(
            "verifyCreatureButton"
        );


    const investigationButton =
        document.getElementById(
            "markInvestigationButton"
        );


    const conflictingButton =
        document.getElementById(
            "markConflictingButton"
        );


    if (select) {

        select.addEventListener(
            "change",
            () => {

                setReviewText(
                    "adminVerifiedThreatPreview",
                    select.value || "—"
                );

            }
        );

    }


    if (verifyButton) {

        verifyButton.addEventListener(
            "click",
            async () => {

                const threat =
                    select?.value;


                if (!threat) {

                    showReviewMessage(
                        "Hãy chọn cấp đe dọa chính thức trước khi xác minh.",
                        "error"
                    );

                    return;
                }


                await reviewCreature(
                    "verified",
                    threat
                );

            }
        );

    }


    if (investigationButton) {

        investigationButton.addEventListener(
            "click",
            async () => {

                await reviewCreature(
                    "investigation",
                    null
                );

            }
        );

    }


    if (conflictingButton) {

        conflictingButton.addEventListener(
            "click",
            async () => {

                await reviewCreature(
                    "conflicting",
                    null
                );

            }
        );

    }

}


/* =========================================================
   REVIEW RPC
========================================================= */

async function reviewCreature(
    status,
    threat
) {

    if (!currentReviewCreature) {
        return;
    }


    const message =
        getReviewConfirmationMessage(
            status,
            threat
        );


    const confirmed =
        window.confirm(
            message
        );


    if (!confirmed) {
        return;
    }


    setReviewButtonsLoading(
        true
    );


    showReviewMessage(
        "Đang cập nhật hồ sơ...",
        ""
    );


    try {

        const {
            error
        } = await mcaSupabase
            .rpc(
                "admin_review_creature",
                {
                    p_creature_id:
                        currentReviewCreature.id,

                    p_status:
                        status,

                    p_verified_threat_level:
                        threat
                }
            );


        if (error) {
            throw error;
        }


        currentReviewCreature.status =
            status;


        currentReviewCreature
            .verified_threat_level =
                status === "verified"
                    ? threat
                    : null;


        setReviewText(
            "reviewCurrentStatus",
            getReviewStatusName(
                status
            )
        );


        showReviewMessage(
            getReviewSuccessMessage(
                status
            ),
            "success"
        );


        /*
            Sau 1.2 giây quay về
            Dashboard.
        */

        setTimeout(
            () => {

                window.location.href =
                    "admin.html";

            },
            1200
        );

    }
    catch (error) {

        console.error(
            "Review RPC error:",
            error
        );


        showReviewMessage(
            translateReviewError(
                error.message
            ),
            "error"
        );


        setReviewButtonsLoading(
            false
        );

    }

}


/* =========================================================
   CONFIRMATION
========================================================= */

function getReviewConfirmationMessage(
    status,
    threat
) {

    if (
        status ===
        "verified"
    ) {

        return (
            "Xác minh hồ sơ này với cấp đe dọa " +
            threat +
            "?"
        );

    }


    if (
        status ===
        "investigation"
    ) {

        return (
            "Chuyển hồ sơ này sang trạng thái " +
            "\"Cần điều tra thêm\"?"
        );

    }


    if (
        status ===
        "conflicting"
    ) {

        return (
            "Đánh dấu hồ sơ này là " +
            "\"Thông tin mâu thuẫn\"?"
        );

    }


    return "Xác nhận thay đổi?";

}


/* =========================================================
   SUCCESS MESSAGE
========================================================= */

function getReviewSuccessMessage(
    status
) {

    const messages = {

        verified:
            "Hồ sơ đã được xác minh thành công.",

        investigation:
            "Hồ sơ đã được chuyển sang Cần điều tra thêm.",

        conflicting:
            "Hồ sơ đã được đánh dấu Thông tin mâu thuẫn."

    };


    return (
        messages[status] ||
        "Đã cập nhật hồ sơ."
    );

}


/* =========================================================
   BUTTON LOADING
========================================================= */

function setReviewButtonsLoading(
    loading
) {

    const buttons = [

        document.getElementById(
            "verifyCreatureButton"
        ),

        document.getElementById(
            "markInvestigationButton"
        ),

        document.getElementById(
            "markConflictingButton"
        )

    ];


    buttons.forEach(
        button => {

            if (button) {

                button.disabled =
                    loading;

            }

        }
    );

}


/* =========================================================
   MESSAGE
========================================================= */

function showReviewMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "reviewMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        "review-message";


    if (type) {

        element.classList.add(
            type
        );

    }

}


/* =========================================================
   ERROR PAGE
========================================================= */

function showReviewError(
    message
) {

    const loading =
        document.getElementById(
            "reviewLoading"
        );


    const content =
        document.getElementById(
            "reviewContent"
        );


    const error =
        document.getElementById(
            "reviewError"
        );


    if (loading) {
        loading.hidden = true;
    }


    if (content) {
        content.hidden = true;
    }


    if (error) {
        error.hidden = false;
    }


    setReviewText(
        "reviewErrorMessage",
        message
    );

}


/* =========================================================
   STATUS
========================================================= */

function getReviewStatusName(
    status
) {

    const names = {

        pending:
            "CHỜ XÁC MINH",

        verified:
            "ĐÃ XÁC MINH",

        investigation:
            "CẦN ĐIỀU TRA THÊM",

        conflicting:
            "THÔNG TIN MÂU THUẪN",

        canon:
            "HỒ SƠ CHÍNH SỬ"

    };


    return (
        names[status] ||
        "CHƯA XÁC ĐỊNH"
    );

}


/* =========================================================
   SPECIES
========================================================= */

function getReviewSpeciesName(
    value
) {

    const names = {

        dragon: "Rồng",
        beast: "Thú",
        entity: "Thực thể",
        insect: "Côn trùng",

        mythical:
            "Sinh vật thần thoại",

        humanoid:
            "Dạng người",

        machine:
            "Sinh vật cơ giới",

        plant:
            "Thực vật",

        unknown:
            "Chưa xác định"

    };


    return (
        names[value] ||
        value ||
        "Chưa xác định"
    );

}


/* =========================================================
   ELEMENT
========================================================= */

function getReviewElementName(
    value
) {

    const names = {

        fire: "Lửa",
        ice: "Băng",
        water: "Nước",
        earth: "Đất",
        wind: "Gió",

        light:
            "Ánh sáng",

        dark:
            "Bóng tối",

        void:
            "Hư không",

        space:
            "Không gian",

        crystal:
            "Tinh thể",

        electric:
            "Điện",

        multi:
            "Đa thuộc tính",

        unknown:
            "Chưa xác định"

    };


    return (
        names[value] ||
        value ||
        "Chưa xác định"
    );

}


/* =========================================================
   RARITY
========================================================= */

function getReviewRarityName(
    value
) {

    const names = {

        common:
            "Phổ biến",

        uncommon:
            "Không phổ biến",

        rare:
            "Hiếm",

        epic:
            "Sử thi",

        legendary:
            "Huyền thoại",

        unique:
            "Độc nhất",

        unknown:
            "Chưa xác định"

    };


    return (
        names[value] ||
        value ||
        "Chưa xác định"
    );

}


/* =========================================================
   RPC ERROR
========================================================= */

function translateReviewError(
    message
) {

    const value =
        String(
            message || ""
        );


    if (
        value.includes(
            "ADMIN_REQUIRED"
        )
    ) {

        return (
            "Bạn không có quyền thực hiện thao tác này."
        );

    }


    if (
        value.includes(
            "INVALID_STATUS"
        )
    ) {

        return (
            "Trạng thái kiểm duyệt không hợp lệ."
        );

    }


    if (
        value.includes(
            "INVALID_THREAT_LEVEL"
        )
    ) {

        return (
            "Cấp đe dọa không hợp lệ."
        );

    }


    if (
        value.includes(
            "CREATURE_NOT_FOUND"
        )
    ) {

        return (
            "Không tìm thấy hồ sơ sinh vật."
        );

    }


    return (
        message ||
        "Không thể cập nhật hồ sơ."
    );

}


/* =========================================================
   SET TEXT
========================================================= */

function setReviewText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    element.textContent =
        value ?? "—";

}