/* =========================================================
   MCA - HOME.JS
   Multiverse Creature Archive

   Chức năng:
   1. Tìm kiếm sinh vật
   2. Lọc theo cấp đe dọa
   3. Lọc theo loài
   4. Lọc theo trạng thái
   5. Chuyển tab
   6. Like / Unlike
   7. Hiển thị khi không có kết quả
========================================================= */


/* =========================================================
   1. CHỜ TRANG LOAD
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    setupSearch();

    setupFilters();

    setupCreatureTabs();

    setupLikeButtons();

});


/* =========================================================
   2. TÌM KIẾM
========================================================= */

function setupSearch() {

    const searchInput =
        document.getElementById("homeSearchInput");

    const searchButton =
        document.getElementById("homeSearchButton");


    if (!searchInput) {
        return;
    }


    /* Tìm ngay khi người dùng nhập */

    searchInput.addEventListener(
        "input",
        filterCreatures
    );


    /* Nhấn Enter để tìm */

    searchInput.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {

                event.preventDefault();

                filterCreatures();

            }

        }
    );


    /* Nhấn nút tìm kiếm */

    if (searchButton) {

        searchButton.addEventListener(
            "click",
            filterCreatures
        );

    }

}


/* =========================================================
   3. BỘ LỌC
========================================================= */

function setupFilters() {

    const threatFilter =
        document.getElementById(
            "homeThreatFilter"
        );

    const speciesFilter =
        document.getElementById(
            "homeSpeciesFilter"
        );

    const statusFilter =
        document.getElementById(
            "homeStatusFilter"
        );


    if (threatFilter) {

        threatFilter.addEventListener(
            "change",
            filterCreatures
        );

    }


    if (speciesFilter) {

        speciesFilter.addEventListener(
            "change",
            filterCreatures
        );

    }


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            filterCreatures
        );

    }

}


/* =========================================================
   4. HÀM LỌC SINH VẬT
========================================================= */

function filterCreatures() {

    /* =========================
       LẤY GIÁ TRỊ SEARCH
    ========================== */

    const searchInput =
        document.getElementById(
            "homeSearchInput"
        );


    const keyword =
        searchInput
            ? normalizeText(
                searchInput.value
            )
            : "";


    /* =========================
       THREAT
    ========================== */

    const threatFilter =
        document.getElementById(
            "homeThreatFilter"
        );


    const selectedThreat =
        threatFilter
            ? threatFilter.value
            : "all";


    /* =========================
       SPECIES
    ========================== */

    const speciesFilter =
        document.getElementById(
            "homeSpeciesFilter"
        );


    const selectedSpecies =
        speciesFilter
            ? speciesFilter.value
            : "all";


    /* =========================
       STATUS
    ========================== */

    const statusFilter =
        document.getElementById(
            "homeStatusFilter"
        );


    const selectedStatus =
        statusFilter
            ? statusFilter.value
            : "all";


    /* =========================
       LẤY CARD
    ========================== */

    const cards =
        document.querySelectorAll(
            ".home-creature-card"
        );


    let visibleCount = 0;


    cards.forEach(card => {

        /* =========================
           DỮ LIỆU CARD
        ========================== */

        const name =
            normalizeText(
                card.dataset.name || ""
            );


        const code =
            normalizeText(
                card.dataset.code || ""
            );


        const species =
            card.dataset.species || "";


        const threat =
            card.dataset.threat || "";


        const status =
            card.dataset.status || "";


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
           THREAT
        ========================== */

        const matchThreat =

            selectedThreat === "all"

            ||

            threat === selectedThreat;


        /* =========================
           SPECIES
        ========================== */

        const matchSpecies =

            selectedSpecies === "all"

            ||

            species === selectedSpecies;


        /* =========================
           STATUS
        ========================== */

        const matchStatus =

            selectedStatus === "all"

            ||

            status === selectedStatus;


        /* =========================
           HIỂN THỊ CARD
        ========================== */

        if (
            matchSearch &&
            matchThreat &&
            matchSpecies &&
            matchStatus
        ) {

            card.style.display = "";

            visibleCount++;

        }
        else {

            card.style.display = "none";

        }

    });


    /* =========================
       KIỂM TRA EMPTY
    ========================== */

    updateNoResult(
        visibleCount
    );


    /* =========================
       CẬP NHẬT SỐ KẾT QUẢ
    ========================== */

    updateResultCount(
        visibleCount
    );

}


/* =========================================================
   5. CHUẨN HÓA TEXT
========================================================= */

function normalizeText(text) {

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
   6. KHÔNG CÓ KẾT QUẢ
========================================================= */

function updateNoResult(count) {

    const noResult =
        document.getElementById(
            "homeNoResult"
        );


    if (!noResult) {
        return;
    }


    if (count === 0) {

        noResult.style.display =
            "block";

    }
    else {

        noResult.style.display =
            "none";

    }

}


/* =========================================================
   7. CẬP NHẬT SỐ KẾT QUẢ
========================================================= */

function updateResultCount(count) {

    const resultCount =
        document.getElementById(
            "homeResultCount"
        );


    if (!resultCount) {
        return;
    }


    resultCount.textContent =
        count;

}


/* =========================================================
   8. CREATURE TABS
========================================================= */

function setupCreatureTabs() {

    const buttons =
        document.querySelectorAll(
            ".creature-tabs button"
        );


    if (
        buttons.length === 0
    ) {

        return;

    }


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {


                /* =========================
                   XÓA ACTIVE
                ========================== */

                buttons.forEach(item => {

                    item.classList.remove(
                        "active"
                    );

                });


                /* =========================
                   ACTIVE BUTTON MỚI
                ========================== */

                button.classList.add(
                    "active"
                );


                /* =========================
                   LẤY TAB
                ========================== */

                const tab =
                    button.dataset.tab;


                filterByTab(tab);

            }
        );

    });

}


/* =========================================================
   9. LỌC THEO TAB
========================================================= */

function filterByTab(tab) {

    const cards =
        document.querySelectorAll(
            ".home-creature-card"
        );


    let visibleCount = 0;


    cards.forEach(card => {

        let show = false;


        /* =========================
           FEATURED
        ========================== */

        if (
            tab === "featured"
        ) {

            show =
                card.dataset.featured
                === "true";

        }


        /* =========================
           NEW
        ========================== */

        else if (
            tab === "new"
        ) {

            show =
                card.dataset.new
                === "true";

        }


        /* =========================
           POPULAR
        ========================== */

        else if (
            tab === "popular"
        ) {

            show =
                card.dataset.popular
                === "true";

        }


        /* =========================
           ALL
        ========================== */

        else {

            show = true;

        }


        if (show) {

            card.style.display = "";

            visibleCount++;

        }
        else {

            card.style.display =
                "none";

        }

    });


    updateNoResult(
        visibleCount
    );


    updateResultCount(
        visibleCount
    );

}


/* =========================================================
   10. LIKE BUTTON
========================================================= */

function setupLikeButtons() {

    const likeButtons =
        document.querySelectorAll(
            ".creature-like"
        );


    likeButtons.forEach(button => {

        button.addEventListener(
            "click",
            (event) => {


                /*
                    Ngăn click Like
                    kích hoạt link của card.
                */

                event.preventDefault();

                event.stopPropagation();


                toggleLike(button);

            }
        );

    });

}


/* =========================================================
   11. LIKE / UNLIKE
========================================================= */

function toggleLike(button) {

    /* =========================
       TRẠNG THÁI HIỆN TẠI
    ========================== */

    const liked =
        button.classList.contains(
            "liked"
        );


    /* =========================
       LIKE COUNT
    ========================== */

    const countElement =
        button.querySelector(
            ".like-count"
        );


    let count = 0;


    if (countElement) {

        count =
            parseInt(
                countElement.textContent
            )
            || 0;

    }


    /* =========================
       UNLIKE
    ========================== */

    if (liked) {

        button.classList.remove(
            "liked"
        );


        button.setAttribute(
            "aria-pressed",
            "false"
        );


        if (countElement) {

            countElement.textContent =
                Math.max(
                    0,
                    count - 1
                );

        }

    }


    /* =========================
       LIKE
    ========================== */

    else {

        button.classList.add(
            "liked"
        );


        button.setAttribute(
            "aria-pressed",
            "true"
        );


        if (countElement) {

            countElement.textContent =
                count + 1;

        }

    }

}


/* =========================================================
   12. RESET HOME FILTER
========================================================= */

function resetHomeFilters() {

    const searchInput =
        document.getElementById(
            "homeSearchInput"
        );


    const threatFilter =
        document.getElementById(
            "homeThreatFilter"
        );


    const speciesFilter =
        document.getElementById(
            "homeSpeciesFilter"
        );


    const statusFilter =
        document.getElementById(
            "homeStatusFilter"
        );


    if (searchInput) {

        searchInput.value = "";

    }


    if (threatFilter) {

        threatFilter.value = "all";

    }


    if (speciesFilter) {

        speciesFilter.value = "all";

    }


    if (statusFilter) {

        statusFilter.value = "all";

    }


    filterCreatures();

}


/* =========================================================
   13. XEM CHI TIẾT SINH VẬT
========================================================= */

function openCreature(
    creatureId
) {

    if (!creatureId) {
        return;
    }


    /*
        Ví dụ:

        creature.html?id=VX-2047

        Sau này Supabase sẽ dùng ID này
        để lấy dữ liệu sinh vật.
    */


    window.location.href =

        "creature.html?id="

        +

        encodeURIComponent(
            creatureId
        );

}