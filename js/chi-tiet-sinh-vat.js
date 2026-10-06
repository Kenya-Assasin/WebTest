/* =========================================================
   MCA - CHI TIẾT SINH VẬT
   File: js/chi-tiet-sinh-vat.js
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadCreatureDetail();

    }
);


/* =========================================================
   LOAD CREATURE
========================================================= */

async function loadCreatureDetail() {

    const loading =
        document.getElementById(
            "creatureLoading"
        );

    const content =
        document.getElementById(
            "creatureDetailContent"
        );

    const errorBox =
        document.getElementById(
            "creatureError"
        );


    try {

        /* =============================================
           LẤY ID TỪ URL
        ============================================= */

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


        /* =============================================
           ĐỌC CREATURE
        ============================================= */

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

            console.error(
                creatureError
            );

            throw new Error(
                "Không tìm thấy hồ sơ sinh vật."
            );

        }


        if (!creature) {

            throw new Error(
                "Hồ sơ không tồn tại."
            );

        }


        /* =============================================
           ĐỌC ABILITIES
        ============================================= */

        const {
            data: abilities,
            error: abilitiesError
        } = await mcaSupabase
            .from(
                "creature_abilities"
            )
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


        if (abilitiesError) {

            console.error(
                "Không tải được kỹ năng:",
                abilitiesError
            );

        }


        /* =============================================
           RENDER
        ============================================= */

        renderCreatureDetail(
            creature,
            abilities || []
        );


        loading.hidden = true;

        errorBox.hidden = true;

        content.hidden = false;


        document.title =
            `${creature.name} | MCA`;


    }
    catch (error) {

        console.error(
            "Lỗi tải hồ sơ:",
            error
        );


        loading.hidden = true;

        content.hidden = true;

        errorBox.hidden = false;


        const message =
            document.getElementById(
                "creatureErrorMessage"
            );


        if (message) {

            message.textContent =
                error.message;

        }

    }

}


/* =========================================================
   RENDER
========================================================= */

function renderCreatureDetail(
    creature,
    abilities
) {

    const code =
        creature.creature_code ||
        `MCA-${creature.id}`;


    const species =
        getSpeciesName(
            creature.species
        );


    const element =
        getElementName(
            creature.element
        );


    const rarity =
        getRarityName(
            creature.rarity
        );


    const status =
        getStatusName(
            creature.status
        );


    const threat =
        creature.verified_threat_level ||
        creature.proposed_threat_level ||
        "?";


    /* =============================================
       IMAGE
    ============================================= */

    const image =
        document.getElementById(
            "detailCreatureImage"
        );


    if (image) {

        image.src =
            creature.image_url ||
            "assets/mca-background.png";


        image.alt =
            creature.name ||
            "Sinh vật MCA";


        image.onerror =
            function () {

                this.onerror = null;

                this.src =
                    "assets/mca-background.png";

            };

    }


    /* =============================================
       BASIC
    ============================================= */

    setText(
        "breadcrumbCode",
        code
    );

    setText(
        "imageCreatureCode",
        code
    );

    setText(
        "detailCreatureCode",
        code
    );

    setText(
        "sidebarCreatureCode",
        code
    );


    setText(
        "detailCreatureName",
        creature.name ||
        "UNKNOWN CREATURE"
    );


    setText(
        "detailCreatureSpecies",
        species
    );


    setText(
        "detailCreatureDescription",
        creature.description ||
        "Chưa có mô tả."
    );


    /* =============================================
       PROFILE META
    ============================================= */

    setText(
        "detailUniverse",
        creature.universe || "—"
    );

    setText(
        "detailPlanet",
        creature.planet || "—"
    );

    setText(
        "detailElement",
        element
    );

    setText(
        "detailRarity",
        rarity
    );


    /* =============================================
       ORIGIN
    ============================================= */

    setText(
        "originUniverse",
        creature.universe || "—"
    );

    setText(
        "originGalaxy",
        creature.galaxy || "—"
    );

    setText(
        "originPlanet",
        creature.planet || "—"
    );

    setText(
        "originWorld",
        creature.world || "—"
    );


    /* =============================================
       APPEARANCE
    ============================================= */

    setText(
        "detailAppearance",
        creature.appearance ||
        "Chưa có dữ liệu ngoại hình."
    );


    setText(
        "detailAge",
        creature.age || "—"
    );


    setText(
        "detailSize",
        creature.size || "—"
    );


    /* =============================================
       WEAKNESS
    ============================================= */

    setText(
        "detailWeaknesses",
        creature.weaknesses ||
        "Chưa có dữ liệu."
    );


    setText(
        "detailLimitations",
        creature.limitations ||
        "Chưa có dữ liệu."
    );


    setText(
        "detailStrongestCondition",
        creature
            .strongest_ability_condition ||
        "Chưa có dữ liệu."
    );


    /* =============================================
       SIDEBAR
    ============================================= */

    setText(
        "sidebarSpecies",
        species
    );


    setText(
        "sidebarPowerSource",
        creature.power_source ||
        "Chưa xác định"
    );


    setText(
        "sidebarElement",
        element
    );


    setText(
        "sidebarRarity",
        rarity
    );


    setText(
        "databaseId",
        creature.id
    );


    setText(
        "recordCreatedAt",
        formatDate(
            creature.created_at
        )
    );


    setText(
        "recordUpdatedAt",
        formatDate(
            creature.updated_at
        )
    );


    /* =============================================
       STATUS
    ============================================= */

    renderStatus(
        creature.status,
        status
    );


    /* =============================================
       THREAT
    ============================================= */

    setText(
        "detailThreat",
        threat
    );


    setText(
        "proposedThreat",
        creature
            .proposed_threat_level ||
        "—"
    );


    setText(
        "verifiedThreat",
        creature
            .verified_threat_level ||
        "Chưa có"
    );


    setText(
        "threatVerification",

        creature
            .verified_threat_level

            ? "ĐÃ XÁC MINH"

            : "CẤP ĐỀ XUẤT"
    );


    /* =============================================
       ABILITIES
    ============================================= */

    renderAbilities(
        abilities
    );

}


/* =========================================================
   ABILITIES
========================================================= */

function renderAbilities(
    abilities
) {

    const container =
        document.getElementById(
            "detailAbilityList"
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

            <div class="no-abilities">

                Chưa có dữ liệu kỹ năng.

            </div>

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
                "ability-detail-item";


            const number =
                document.createElement(
                    "div"
                );


            number.className =
                "ability-detail-number";


            number.textContent =
                String(index + 1)
                    .padStart(
                        2,
                        "0"
                    );


            const content =
                document.createElement(
                    "div"
                );


            content.className =
                "ability-detail-content";


            const title =
                document.createElement(
                    "h3"
                );


            title.textContent =
                ability.ability_name ||
                "UNKNOWN ABILITY";


            const description =
                document.createElement(
                    "p"
                );


            description.textContent =
                ability
                    .ability_description ||
                "Chưa có mô tả.";


            content.appendChild(
                title
            );


            content.appendChild(
                description
            );


            item.appendChild(
                number
            );


            item.appendChild(
                content
            );


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   STATUS
========================================================= */

function renderStatus(
    statusCode,
    statusName
) {

    const status =
        document.getElementById(
            "detailStatus"
        );


    if (status) {

        status.textContent =
            statusName;


        status.className =
            "detail-status";


        if (statusCode) {

            status.classList.add(
                statusCode
            );

        }

    }


    setText(
        "sidebarStatus",
        statusName
    );


    const dot =
        document.getElementById(
            "verificationDot"
        );


    if (!dot) {
        return;
    }


    const colors = {

        verified:
            "#48e5a5",

        pending:
            "#ffd45c",

        investigation:
            "#9b7cff",

        conflicting:
            "#ff7c8d",

        canon:
            "#2bdcff"

    };


    dot.style.background =
        colors[statusCode] ||
        "#718795";


    dot.style.color =
        colors[statusCode] ||
        "#718795";

}


/* =========================================================
   STATUS NAME
========================================================= */

function getStatusName(status) {

    const names = {

        verified:
            "ĐÃ XÁC MINH",

        pending:
            "CHỜ XÁC MINH",

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

function getSpeciesName(species) {

    const names = {

        dragon:
            "Rồng",

        beast:
            "Thú",

        entity:
            "Thực thể",

        insect:
            "Côn trùng",

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
        names[species] ||
        species ||
        "Chưa xác định"
    );

}


/* =========================================================
   ELEMENT
========================================================= */

function getElementName(element) {

    const names = {

        fire: "Lửa",

        ice: "Băng",

        water: "Nước",

        earth: "Đất",

        wind: "Gió",

        light: "Ánh sáng",

        dark: "Bóng tối",

        void: "Hư không",

        space: "Không gian",

        crystal: "Tinh thể",

        electric: "Điện",

        multi: "Đa thuộc tính",

        unknown:
            "Chưa xác định"

    };


    return (
        names[element] ||
        element ||
        "Chưa xác định"
    );

}


/* =========================================================
   RARITY
========================================================= */

function getRarityName(rarity) {

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
        names[rarity] ||
        rarity ||
        "Chưa xác định"
    );

}


/* =========================================================
   DATE
========================================================= */

function formatDate(dateValue) {

    if (!dateValue) {
        return "—";
    }


    const date =
        new Date(dateValue);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }


    return date.toLocaleDateString(
        "vi-VN",
        {
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric"
        }
    );

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
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