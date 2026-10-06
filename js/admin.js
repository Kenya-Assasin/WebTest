/* =========================================================
   MCA ADMIN DASHBOARD
   File: js/admin.js
========================================================= */

let adminCreatures = [];

let currentAdminFilter =
    "pending";


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await initializeAdmin();

    }
);


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeAdmin() {

    try {

        const admin =
            await checkAdminAccess();


        if (!admin) {
            return;
        }


        setupAdminFilters();

        setupAdminSearch();


        await loadAdminCreatures();

    }
    catch (error) {

        console.error(
            "Admin initialization error:",
            error
        );


        showAccessDenied(
            "Không thể xác minh quyền quản trị."
        );

    }

}


/* =========================================================
   CHECK ADMIN
========================================================= */

async function checkAdminAccess() {

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

        showAccessDenied(
            "Bạn cần đăng nhập bằng tài khoản Admin."
        );

        return null;
    }


    const {
        data: profile,
        error: profileError
    } = await mcaSupabase
        .from("profiles")
        .select(`
            id,
            username,
            role
        `)
        .eq(
            "id",
            user.id
        )
        .single();


    if (profileError) {

        console.error(
            "Profile error:",
            profileError
        );


        showAccessDenied(
            "Không thể đọc thông tin tài khoản."
        );

        return null;
    }


    if (
        profile.role !==
        "admin"
    ) {

        showAccessDenied(
            "Tài khoản của bạn không có quyền quản trị MCA."
        );

        return null;
    }


    document.getElementById(
        "adminLoading"
    ).hidden = true;


    document.getElementById(
        "adminAccessDenied"
    ).hidden = true;


    document.getElementById(
        "adminDashboard"
    ).hidden = false;


    setAdminText(
        "adminUsername",
        profile.username ||
        "ADMIN"
    );


    return profile;

}


/* =========================================================
   ACCESS DENIED
========================================================= */

function showAccessDenied(
    message
) {

    const loading =
        document.getElementById(
            "adminLoading"
        );


    const denied =
        document.getElementById(
            "adminAccessDenied"
        );


    const dashboard =
        document.getElementById(
            "adminDashboard"
        );


    if (loading) {
        loading.hidden = true;
    }


    if (dashboard) {
        dashboard.hidden = true;
    }


    if (denied) {
        denied.hidden = false;
    }


    setAdminText(
        "adminDeniedMessage",
        message
    );

}


/* =========================================================
   LOAD CREATURES
========================================================= */

async function loadAdminCreatures() {

    const list =
        document.getElementById(
            "adminCreatureList"
        );


    if (list) {

        list.innerHTML = `
            <div class="admin-access-loading">
                <div class="admin-loading-symbol">
                    ◇
                </div>

                <p>
                    ĐANG TẢI HỒ SƠ...
                </p>
            </div>
        `;

    }


    try {

        const {
            data,
            error
        } = await mcaSupabase
            .from("creatures")
            .select(`
                id,
                creature_code,
                name,
                species,
                universe,
                galaxy,
                planet,
                element,
                rarity,
                proposed_threat_level,
                verified_threat_level,
                image_url,
                status,
                creator_id,
                created_at,
                updated_at
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {
            throw error;
        }


        adminCreatures =
            data || [];


        updateAdminStatistics();


        applyAdminFilters();

    }
    catch (error) {

        console.error(
            "Load creatures error:",
            error
        );


        if (list) {

            list.innerHTML = `
                <div class="admin-empty">
                    <div>!</div>

                    <h3>
                        KHÔNG THỂ TẢI DATABASE
                    </h3>

                    <p>
                        ${escapeAdminHTML(
                            error.message
                        )}
                    </p>
                </div>
            `;

        }

    }

}


/* =========================================================
   STATISTICS
========================================================= */

function updateAdminStatistics() {

    const pending =
        adminCreatures.filter(
            creature =>
                creature.status ===
                "pending"
        ).length;


    const verified =
        adminCreatures.filter(
            creature =>
                creature.status ===
                "verified"
        ).length;


    const investigation =
        adminCreatures.filter(
            creature =>
                creature.status ===
                "investigation"
        ).length;


    const conflicting =
        adminCreatures.filter(
            creature =>
                creature.status ===
                "conflicting"
        ).length;


    setAdminText(
        "statPending",
        pending
    );


    setAdminText(
        "statVerified",
        verified
    );


    setAdminText(
        "statInvestigation",
        investigation
    );


    setAdminText(
        "statConflicting",
        conflicting
    );


    setAdminText(
        "statTotal",
        adminCreatures.length
    );

}


/* =========================================================
   FILTER BUTTONS
========================================================= */

function setupAdminFilters() {

    const buttons =
        document.querySelectorAll(
            ".admin-filter"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    currentAdminFilter =
                        button.dataset.status;


                    buttons.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    button.classList.add(
                        "active"
                    );


                    updateQueueTitle();

                    applyAdminFilters();

                }
            );

        }
    );

}


/* =========================================================
   SEARCH
========================================================= */

function setupAdminSearch() {

    const input =
        document.getElementById(
            "adminSearchInput"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        () => {

            applyAdminFilters();

        }
    );

}


/* =========================================================
   APPLY FILTER
========================================================= */

function applyAdminFilters() {

    const searchInput =
        document.getElementById(
            "adminSearchInput"
        );


    const keyword =
        (
            searchInput?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    let result =
        [...adminCreatures];


    /* STATUS */

    if (
        currentAdminFilter !==
        "all"
    ) {

        result =
            result.filter(
                creature =>
                    creature.status ===
                    currentAdminFilter
            );

    }


    /* SEARCH */

    if (keyword) {

        result =
            result.filter(
                creature => {

                    const searchable = [

                        creature.name,

                        creature.creature_code,

                        creature.species,

                        creature.universe,

                        creature.galaxy,

                        creature.planet

                    ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                    return searchable.includes(
                        keyword
                    );

                }
            );

    }


    renderAdminCreatures(
        result
    );

}


/* =========================================================
   RENDER
========================================================= */

function renderAdminCreatures(
    creatures
) {

    const list =
        document.getElementById(
            "adminCreatureList"
        );


    const empty =
        document.getElementById(
            "adminEmpty"
        );


    if (!list) {
        return;
    }


    list.innerHTML = "";


    setAdminText(
        "queueCount",
        `${creatures.length} HỒ SƠ`
    );


    if (
        creatures.length === 0
    ) {

        if (empty) {
            empty.hidden = false;
        }

        return;
    }


    if (empty) {
        empty.hidden = true;
    }


    creatures.forEach(
        creature => {

            const card =
                createAdminCreatureCard(
                    creature
                );


            list.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   CREATE CARD
========================================================= */

function createAdminCreatureCard(
    creature
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "admin-creature-card";


    const image =
        creature.image_url ||
        "assets/mca-background.png";


    const threat =
        creature
            .verified_threat_level ||
        creature
            .proposed_threat_level ||
        "?";


    const code =
        creature.creature_code ||
        `MCA-${creature.id}`;


    const statusName =
        getAdminStatusName(
            creature.status
        );


    card.innerHTML = `

        <div class="admin-creature-image">

            <img
                src="${escapeAdminHTML(image)}"
                alt="${escapeAdminHTML(
                    creature.name ||
                    "Sinh vật"
                )}"
            >

        </div>


        <div class="admin-creature-main">

            <span class="admin-creature-code">

                ${escapeAdminHTML(code)}

            </span>


            <h3>

                ${escapeAdminHTML(
                    creature.name ||
                    "UNKNOWN"
                )}

            </h3>


            <p>

                ${escapeAdminHTML(
                    getAdminSpeciesName(
                        creature.species
                    )
                )}

            </p>


            <span
                class="
                    admin-status-badge
                    ${escapeAdminHTML(
                        creature.status ||
                        ""
                    )}
                "
            >

                ${escapeAdminHTML(
                    statusName
                )}

            </span>

        </div>


        <div class="admin-creature-origin">

            <span class="admin-data-label">
                NGUỒN GỐC
            </span>

            <strong class="admin-data-value">

                ${escapeAdminHTML(
                    creature.universe ||
                    "—"
                )}

            </strong>

            <span class="admin-data-value">

                ${escapeAdminHTML(
                    creature.planet ||
                    "—"
                )}

            </span>

        </div>


        <div class="admin-creature-threat">

            <span class="admin-data-label">
                THREAT
            </span>

            <strong class="admin-threat-value">

                ${escapeAdminHTML(
                    threat
                )}

            </strong>

        </div>


        <div class="admin-creature-action">

            <a
                href="
                    admin-chi-tiet.html?id=${creature.id}
                "
                class="admin-review-button"
            >

                KIỂM DUYỆT →

            </a>

        </div>

    `;


    const img =
        card.querySelector(
            "img"
        );


    if (img) {

        img.addEventListener(
            "error",
            () => {

                img.src =
                    "assets/mca-background.png";

            },
            {
                once: true
            }
        );

    }


    return card;

}


/* =========================================================
   QUEUE TITLE
========================================================= */

function updateQueueTitle() {

    const titles = {

        pending:
            "HÀNG CHỜ XÁC MINH",

        all:
            "TOÀN BỘ HỒ SƠ",

        verified:
            "HỒ SƠ ĐÃ XÁC MINH",

        investigation:
            "HỒ SƠ CẦN ĐIỀU TRA THÊM",

        conflicting:
            "THÔNG TIN MÂU THUẪN",

        canon:
            "HỒ SƠ CHÍNH SỬ"

    };


    setAdminText(
        "queueTitle",
        titles[currentAdminFilter] ||
        "HỒ SƠ MCA"
    );

}


/* =========================================================
   STATUS
========================================================= */

function getAdminStatusName(
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

function getAdminSpeciesName(
    species
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
        names[species] ||
        species ||
        "Chưa xác định"
    );

}


/* =========================================================
   TEXT
========================================================= */

function setAdminText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    element.textContent =
        value ?? "";

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeAdminHTML(
    value
) {

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