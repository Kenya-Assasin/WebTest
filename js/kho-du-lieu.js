/* =========================================================
   MCA - KHO-DU-LIEU.JS
   Multiverse Creature Archive

   Chức năng:
   1. Tìm kiếm sinh vật
   2. Lọc trạng thái
   3. Lọc cấp đe dọa
   4. Lọc loài
   5. Lọc nguyên tố
   6. Lọc nguồn gốc
   7. Hiển thị bộ lọc đang dùng
   8. Xóa bộ lọc
   9. Sắp xếp
   10. Grid / List View
========================================================= */


/* =========================================================
   1. KHỞI TẠO
========================================================= */
let archiveCreatures = [];

async function loadCreaturesFromSupabase() {

    const creatureGrid =
        document.getElementById(
            "archiveCreatureGrid"
        );

    const noResult =
        document.getElementById(
            "archiveNoResult"
        );


    if (!creatureGrid) {
        return;
    }


    creatureGrid.innerHTML = `
        <div class="archive-loading">
            Đang kết nối cơ sở dữ liệu MCA...
        </div>
    `;


    try {

        const {
            data,
            error
        } = await mcaSupabase
            .from("creatures")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {
            throw error;
        }


        archiveCreatures =
            data || [];


        renderCreatureCards(
            archiveCreatures
        );


        if (noResult) {

            noResult.style.display =
                archiveCreatures.length === 0
                    ? "block"
                    : "none";

        }

    }
    catch (error) {

        console.error(
            "Không thể tải dữ liệu sinh vật:",
            error
        );


        creatureGrid.innerHTML = `
            <div class="archive-loading archive-loading-error">
                Không thể kết nối cơ sở dữ liệu MCA.
            </div>
        `;

    }

}

function renderCreatureCards(creatures) {

    const creatureGrid =
        document.getElementById(
            "archiveCreatureGrid"
        );


    if (!creatureGrid) {
        return;
    }


    creatureGrid.innerHTML = "";


    if (!creatures.length) {

        const noResult =
            document.getElementById(
                "archiveNoResult"
            );

        if (noResult) {
            noResult.style.display = "block";
        }

        updateArchiveResultCount(0);

        return;
    }


    creatures.forEach(creature => {

        const card =
            createCreatureCard(
                creature
            );


        creatureGrid.appendChild(
            card
        );

    });


    const noResult =
        document.getElementById(
            "archiveNoResult"
        );


    if (noResult) {
        noResult.style.display = "none";
    }


    updateArchiveResultCount(
        creatures.length
    );

}

function createCreatureCard(creature) {

    const card =
        document.createElement("article");


    card.className =
        "archive-creature-card";


    card.dataset.id =
        creature.id;

    card.dataset.name =
        creature.name || "";

    card.dataset.code =
        creature.creature_code || "";

    card.dataset.species =
        creature.species || "";

    card.dataset.threat =
        creature.verified_threat_level ||
        creature.proposed_threat_level ||
        "";

    card.dataset.status =
        creature.status || "";

    card.dataset.element =
        creature.element || "";

    card.dataset.origin =
        creature.galaxy || "";

    card.dataset.likes =
        creature.likes || 0;

    card.dataset.date =
        creature.created_at || "";


    const threat =
        creature.verified_threat_level ||
        creature.proposed_threat_level ||
        "?";


    const image =
        creature.image_url ||
        "assets/mca-background.png";


    card.innerHTML = `

        <div class="archive-creature-image">

            <img
                src="${escapeArchiveHTML(image)}"
                alt="${escapeArchiveHTML(
                    creature.name || "Sinh vật"
                )}"
                loading="lazy"
            >

            <span class="
                archive-status
                ${getStatusClass(
                    creature.status
                )}
            ">
                ${getStatusName(
                    creature.status
                )}
            </span>

            <span class="
                archive-threat
                ${getThreatClass(threat)}
            ">
                ${escapeArchiveHTML(threat)}
            </span>

        </div>


        <div class="archive-card-content">

            <span class="archive-creature-code">

                ${escapeArchiveHTML(
                    creature.creature_code ||
                    `MCA-${creature.id}`
                )}

            </span>


            <h3>

                ${escapeArchiveHTML(
                    creature.name ||
                    "Chưa đặt tên"
                )}

            </h3>


            <p class="archive-creature-type">

                ${escapeArchiveHTML(
                    getSpeciesName(
                        creature.species
                    )
                )}

            </p>


            <div class="archive-tags">

                ${
                    creature.element
                        ? `
                            <span>
                                ${escapeArchiveHTML(
                                    getElementName(
                                        creature.element
                                    )
                                )}
                            </span>
                        `
                        : ""
                }

                ${
                    creature.planet
                        ? `
                            <span>
                                ${escapeArchiveHTML(
                                    creature.planet
                                )}
                            </span>
                        `
                        : ""
                }

            </div>


            <div class="archive-card-footer">

                <span>
                    ◇ ${escapeArchiveHTML(
                        creature.universe || "?"
                    )}
                </span>

                <span>
                    ♡ ${creature.likes || 0}
                </span>

            </div>

        </div>
    `;


    card.addEventListener(
        "click",
        () => {

            window.location.href =
                `chi-tiet-sinh-vat.html?id=${creature.id}`;

        }
    );


    return card;
}

function getStatusName(status) {

    const statuses = {

        verified:
            "Đã xác minh",

        pending:
            "Chờ xác minh",

        investigation:
            "Cần điều tra thêm",

        conflicting:
            "Thông tin mâu thuẫn",

        canon:
            "Chính sử"

    };


    return (
        statuses[status] ||
        "Chưa xác định"
    );

}


function getStatusClass(status) {

    switch (status) {

        case "verified":
            return "verified";

        case "pending":
            return "pending";

        case "investigation":
            return "review";

        case "conflicting":
            return "review";

        case "canon":
            return "verified";

        default:
            return "pending";

    }

}

function getSpeciesName(species) {

    const speciesNames = {

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
        speciesNames[species] ||
        species ||
        "Chưa xác định"
    );

}


function getElementName(element) {

    const elements = {

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
        elements[element] ||
        element
    );

}

function getThreatClass(threat) {

    const highThreats =
        [
            "A",
            "S",
            "SS",
            "X"
        ];


    if (
        highThreats.includes(threat)
    ) {
        return "high";
    }


    return "";

}

function escapeArchiveHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}

function updateArchiveResultCount(count) {

    const resultCount =
        document.getElementById(
            "archiveResultCount"
        );


    if (!resultCount) {
        return;
    }


    resultCount.textContent =
        `${count} hồ sơ`;

}

document.addEventListener("DOMContentLoaded", () => {

    setupArchiveSearch();

    setupStatusFilters();

    setupThreatFilters();

    setupSelectFilters();

    setupClearFilter();

    setupSort();

    setupViewButtons();

    loadCreaturesFromSupabase();

    filterArchiveCreatures();

});


/* =========================================================
   2. TÌM KIẾM
========================================================= */

function setupArchiveSearch() {

    const searchInput =
        document.getElementById("archiveSearchInput");


    if (!searchInput) {
        return;
    }


    searchInput.addEventListener(
        "input",
        filterArchiveCreatures
    );


    searchInput.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                filterArchiveCreatures();

            }

        }
    );

}


/* =========================================================
   3. FILTER TRẠNG THÁI
========================================================= */

function setupStatusFilters() {

    const statusInputs =
        document.querySelectorAll(
            'input[name="archiveStatus"]'
        );


    statusInputs.forEach(input => {

        input.addEventListener(
            "change",
            filterArchiveCreatures
        );

    });

}


/* =========================================================
   4. FILTER CẤP ĐE DỌA
========================================================= */

function setupThreatFilters() {

    const buttons =
        document.querySelectorAll(
            ".threat-filter-button"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                button.classList.toggle(
                    "active"
                );


                filterArchiveCreatures();

            }
        );

    });

}


/* =========================================================
   5. SELECT FILTER
========================================================= */

function setupSelectFilters() {

    const species =
        document.getElementById(
            "archiveSpeciesFilter"
        );


    const element =
        document.getElementById(
            "archiveElementFilter"
        );


    const origin =
        document.getElementById(
            "archiveOriginFilter"
        );


    if (species) {

        species.addEventListener(
            "change",
            filterArchiveCreatures
        );

    }


    if (element) {

        element.addEventListener(
            "change",
            filterArchiveCreatures
        );

    }


    if (origin) {

        origin.addEventListener(
            "change",
            filterArchiveCreatures
        );

    }

}


/* =========================================================
   6. LỌC TOÀN BỘ SINH VẬT
========================================================= */

function filterArchiveCreatures() {

    /* =========================
       SEARCH
    ========================== */

    const searchInput =
        document.getElementById(
            "archiveSearchInput"
        );


    const keyword =
        normalizeArchiveText(
            searchInput?.value || ""
        );


    /* =========================
       STATUS
    ========================== */

    const checkedStatus =
        Array.from(
            document.querySelectorAll(
                'input[name="archiveStatus"]:checked'
            )
        )
        .map(input => input.value);


    /* =========================
       THREAT
    ========================== */

    const selectedThreats =
        Array.from(
            document.querySelectorAll(
                ".threat-filter-button.active"
            )
        )
        .map(button =>
            button.dataset.threat
        );


    /* =========================
       SPECIES
    ========================== */

    const species =
        document.getElementById(
            "archiveSpeciesFilter"
        )?.value || "all";


    /* =========================
       ELEMENT
    ========================== */

    const element =
        document.getElementById(
            "archiveElementFilter"
        )?.value || "all";


    /* =========================
       ORIGIN
    ========================== */

    const origin =
        document.getElementById(
            "archiveOriginFilter"
        )?.value || "all";


    /* =========================
       CREATURE CARDS
    ========================== */

    const cards =
        document.querySelectorAll(
            ".archive-creature-card"
        );


    let visibleCount = 0;


    cards.forEach(card => {

        const name =
            normalizeArchiveText(
                card.dataset.name || ""
            );


        const code =
            normalizeArchiveText(
                card.dataset.code || ""
            );


        const cardStatus =
            card.dataset.status || "";


        const cardThreat =
            card.dataset.threat || "";


        const cardSpecies =
            card.dataset.species || "";


        const cardElement =
            card.dataset.element || "";


        const cardOrigin =
            card.dataset.origin || "";


        /* =========================
           SEARCH
        ========================== */

        const matchSearch =

            keyword === ""

            ||

            name.includes(keyword)

            ||

            code.includes(keyword);


        /* =========================
           STATUS
        ========================== */

        const matchStatus =

            checkedStatus.length === 0

            ||

            checkedStatus.includes(
                cardStatus
            );


        /* =========================
           THREAT
        ========================== */

        const matchThreat =

            selectedThreats.length === 0

            ||

            selectedThreats.includes(
                cardThreat
            );


        /* =========================
           SPECIES
        ========================== */

        const matchSpecies =

            species === "all"

            ||

            cardSpecies === species;


        /* =========================
           ELEMENT
        ========================== */

        const matchElement =

            element === "all"

            ||

            cardElement === element;


        /* =========================
           ORIGIN
        ========================== */

        const matchOrigin =

            origin === "all"

            ||

            cardOrigin === origin;


        /* =========================
           KẾT QUẢ
        ========================== */

        const isVisible =

            matchSearch

            && matchStatus

            && matchThreat

            && matchSpecies

            && matchElement

            && matchOrigin;


        if (isVisible) {

            card.style.display = "";

            visibleCount++;

        }
        else {

            card.style.display =
                "none";

        }

    });


    updateArchiveResultCount(
        visibleCount
    );


    updateArchiveNoResult(
        visibleCount
    );


    updateActiveFilters();

}


/* =========================================================
   7. CHUẨN HÓA TEXT
========================================================= */

function normalizeArchiveText(text) {

    return text
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim();

}


/* =========================================================
   8. SỐ KẾT QUẢ
========================================================= */

function updateArchiveResultCount(count) {

    const element =
        document.getElementById(
            "archiveResultCount"
        );


    if (!element) {
        return;
    }


    element.textContent =
        count.toLocaleString("vi-VN");

}


/* =========================================================
   9. KHÔNG CÓ KẾT QUẢ
========================================================= */

function updateArchiveNoResult(count) {

    const noResult =
        document.getElementById(
            "archiveNoResult"
        );


    if (!noResult) {
        return;
    }


    noResult.style.display =
        count === 0
            ? "block"
            : "none";

}


/* =========================================================
   10. HIỂN THỊ FILTER ĐANG SỬ DỤNG
========================================================= */

function updateActiveFilters() {

    const container =
        document.getElementById(
            "activeFilterList"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    /* =========================
       SEARCH
    ========================== */

    const search =
        document.getElementById(
            "archiveSearchInput"
        )?.value.trim();


    if (search) {

        addActiveFilter(
            `Tìm kiếm: ${search}`
        );

    }


    /* =========================
       STATUS
    ========================== */

    const statuses =
        document.querySelectorAll(
            'input[name="archiveStatus"]:checked'
        );


    statuses.forEach(input => {

        const label =
            input.dataset.label
            || input.value;


        addActiveFilter(
            label
        );

    });


    /* =========================
       THREAT
    ========================== */

    const threats =
        document.querySelectorAll(
            ".threat-filter-button.active"
        );


    threats.forEach(button => {

        addActiveFilter(
            `Cấp ${button.dataset.threat}`
        );

    });


    /* =========================
       SPECIES
    ========================== */

    addSelectFilterTag(
        "archiveSpeciesFilter",
        "Loài"
    );


    /* =========================
       ELEMENT
    ========================== */

    addSelectFilterTag(
        "archiveElementFilter",
        "Nguyên tố"
    );


    /* =========================
       ORIGIN
    ========================== */

    addSelectFilterTag(
        "archiveOriginFilter",
        "Nguồn gốc"
    );

}


/* =========================================================
   11. THÊM FILTER TAG
========================================================= */

function addActiveFilter(text) {

    const container =
        document.getElementById(
            "activeFilterList"
        );


    if (!container) {
        return;
    }


    const tag =
        document.createElement("span");


    tag.className =
        "active-filter";


    tag.textContent =
        text;


    container.appendChild(tag);

}


/* =========================================================
   12. TAG CHO SELECT
========================================================= */

function addSelectFilterTag(
    selectId,
    label
) {

    const select =
        document.getElementById(
            selectId
        );


    if (
        !select
        ||
        select.value === "all"
    ) {

        return;

    }


    const option =
        select.options[
            select.selectedIndex
        ];


    addActiveFilter(
        `${label}: ${option.text}`
    );

}


/* =========================================================
   13. XÓA TẤT CẢ FILTER
========================================================= */

function setupClearFilter() {

    const button =
        document.getElementById(
            "archiveClearFilter"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        clearArchiveFilters
    );

}


/* =========================================================
   14. CLEAR FILTER
========================================================= */

function clearArchiveFilters() {

    /* SEARCH */

    const search =
        document.getElementById(
            "archiveSearchInput"
        );


    if (search) {

        search.value = "";

    }


    /* STATUS */

    document
        .querySelectorAll(
            'input[name="archiveStatus"]'
        )
        .forEach(input => {

            input.checked = false;

        });


    /* THREAT */

    document
        .querySelectorAll(
            ".threat-filter-button"
        )
        .forEach(button => {

            button.classList.remove(
                "active"
            );

        });


    /* SELECT */

    const selectIds = [

        "archiveSpeciesFilter",

        "archiveElementFilter",

        "archiveOriginFilter"

    ];


    selectIds.forEach(id => {

        const select =
            document.getElementById(id);


        if (select) {

            select.value = "all";

        }

    });


    filterArchiveCreatures();

}


/* =========================================================
   15. NÚT ÁP DỤNG FILTER
========================================================= */

function applyArchiveFilters() {

    filterArchiveCreatures();

}


/* =========================================================
   16. SẮP XẾP
========================================================= */

function setupSort() {

    const sort =
        document.getElementById(
            "archiveSort"
        );


    if (!sort) {
        return;
    }


    sort.addEventListener(
        "change",
        sortArchiveCreatures
    );

}


/* =========================================================
   17. SORT CREATURES
========================================================= */

function sortArchiveCreatures() {

    const sort =
        document.getElementById(
            "archiveSort"
        );


    const grid =
        document.getElementById(
            "archiveCreatureGrid"
        );


    if (
        !sort
        ||
        !grid
    ) {

        return;

    }


    const cards =
        Array.from(
            grid.querySelectorAll(
                ".archive-creature-card"
            )
        );


    const mode =
        sort.value;


    cards.sort(
        (a, b) => {


            /* =========================
               NAME A-Z
            ========================== */

            if (mode === "name") {

                return (
                    a.dataset.name || ""
                ).localeCompare(
                    b.dataset.name || "",
                    "vi"
                );

            }


            /* =========================
               POPULAR
            ========================== */

            if (mode === "popular") {

                return (

                    Number(
                        b.dataset.likes || 0
                    )

                    -

                    Number(
                        a.dataset.likes || 0
                    )

                );

            }


            /* =========================
               THREAT
            ========================== */

            if (mode === "threat") {

                return (

                    getThreatValue(
                        b.dataset.threat
                    )

                    -

                    getThreatValue(
                        a.dataset.threat
                    )

                );

            }


            /* =========================
               NEWEST
            ========================== */

            if (mode === "newest") {

                return (

                    new Date(
                        b.dataset.date || 0
                    )

                    -

                    new Date(
                        a.dataset.date || 0
                    )

                );

            }


            return 0;

        }
    );


    cards.forEach(card => {

        grid.appendChild(card);

    });

}


/* =========================================================
   18. GIÁ TRỊ CẤP ĐE DỌA
========================================================= */

function getThreatValue(threat) {

    const threatLevels = {

        F: 1,

        E: 2,

        D: 3,

        C: 4,

        B: 5,

        A: 6,

        S: 7,

        SS: 8,

        X: 9

    };


    return threatLevels[threat] || 0;

}


/* =========================================================
   19. GRID / LIST VIEW
========================================================= */

function setupViewButtons() {

    const gridButton =
        document.getElementById(
            "archiveGridView"
        );


    const listButton =
        document.getElementById(
            "archiveListView"
        );


    if (gridButton) {

        gridButton.addEventListener(
            "click",
            () => {

                changeArchiveView(
                    "grid"
                );

            }
        );

    }


    if (listButton) {

        listButton.addEventListener(
            "click",
            () => {

                changeArchiveView(
                    "list"
                );

            }
        );

    }

}


/* =========================================================
   20. THAY ĐỔI VIEW
========================================================= */

function changeArchiveView(view) {

    const grid =
        document.getElementById(
            "archiveCreatureGrid"
        );


    const gridButton =
        document.getElementById(
            "archiveGridView"
        );


    const listButton =
        document.getElementById(
            "archiveListView"
        );


    if (!grid) {
        return;
    }


    /* =========================
       LIST
    ========================== */

    if (view === "list") {

        grid.classList.add(
            "list-view"
        );


        gridButton?.classList.remove(
            "active"
        );


        listButton?.classList.add(
            "active"
        );

    }


    /* =========================
       GRID
    ========================== */

    else {

        grid.classList.remove(
            "list-view"
        );


        listButton?.classList.remove(
            "active"
        );


        gridButton?.classList.add(
            "active"
        );

    }


    /* Lưu lựa chọn */

    localStorage.setItem(
        "mcaArchiveView",
        view
    );

}


/* =========================================================
   21. KHÔI PHỤC VIEW
========================================================= */

function restoreArchiveView() {

    const savedView =
        localStorage.getItem(
            "mcaArchiveView"
        );


    if (
        savedView === "list"
    ) {

        changeArchiveView(
            "list"
        );

    }
    else {

        changeArchiveView(
            "grid"
        );

    }

}


/* =========================================================
   22. MỞ CHI TIẾT SINH VẬT
========================================================= */

function openArchiveCreature(
    creatureId
) {

    if (!creatureId) {
        return;
    }


    window.location.href =

        "chi-tiet-sinh-vat.html?id="

        +

        encodeURIComponent(
            creatureId
        );

}


/* =========================================================
   23. KHÔI PHỤC VIEW KHI LOAD
========================================================= */

window.addEventListener(
    "load",
    restoreArchiveView
);