/* =========================================================
   MCA - DIEU-TRA-VIEN.JS
   Multiverse Creature Archive

   Chức năng:
   1. Chuyển tab hồ sơ
   2. Lọc hồ sơ sinh vật
   3. Mở chi tiết sinh vật
   4. Chỉnh sửa hồ sơ
   5. Chia sẻ hồ sơ
   6. Hiển thị dữ liệu Điều tra viên
========================================================= */


/* =========================================================
   1. KHỞI TẠO
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    setupInvestigatorTabs();

    setupReportFilter();

    setupEditProfile();

    setupShareProfile();

    loadInvestigatorData();

});


/* =========================================================
   2. CHUYỂN TAB
========================================================= */

function setupInvestigatorTabs() {

    const tabButtons =
        document.querySelectorAll(
            ".investigator-tab"
        );

    const tabContents =
        document.querySelectorAll(
            ".investigator-tab-content"
        );


    tabButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const tabName =
                    button.dataset.tab;


                /* Xóa active khỏi tất cả button */

                tabButtons.forEach(item => {

                    item.classList.remove(
                        "active"
                    );

                });


                /* Ẩn tất cả tab */

                tabContents.forEach(content => {

                    content.classList.remove(
                        "active"
                    );

                });


                /* Active button */

                button.classList.add(
                    "active"
                );


                /* Tìm tab cần mở */

                const targetTab =
                    document.getElementById(
                        `${tabName}Tab`
                    );


                if (targetTab) {

                    targetTab.classList.add(
                        "active"
                    );

                }


                /* Lưu tab hiện tại */

                localStorage.setItem(
                    "mcaInvestigatorTab",
                    tabName
                );

            }
        );

    });


    restoreInvestigatorTab();

}


/* =========================================================
   3. KHÔI PHỤC TAB TRƯỚC ĐÓ
========================================================= */

function restoreInvestigatorTab() {

    const savedTab =
        localStorage.getItem(
            "mcaInvestigatorTab"
        );


    if (!savedTab) {
        return;
    }


    const button =
        document.querySelector(
            `.investigator-tab[data-tab="${savedTab}"]`
        );


    const content =
        document.getElementById(
            `${savedTab}Tab`
        );


    if (!button || !content) {
        return;
    }


    document
        .querySelectorAll(
            ".investigator-tab"
        )
        .forEach(item => {

            item.classList.remove(
                "active"
            );

        });


    document
        .querySelectorAll(
            ".investigator-tab-content"
        )
        .forEach(item => {

            item.classList.remove(
                "active"
            );

        });


    button.classList.add(
        "active"
    );


    content.classList.add(
        "active"
    );

}


/* =========================================================
   4. FILTER HỒ SƠ SINH VẬT
========================================================= */

function setupReportFilter() {

    const filter =
        document.getElementById(
            "profileReportFilter"
        );


    if (!filter) {
        return;
    }


    filter.addEventListener(
        "change",
        filterInvestigatorReports
    );

}


/* =========================================================
   5. LỌC HỒ SƠ
========================================================= */

function filterInvestigatorReports() {

    const filter =
        document.getElementById(
            "profileReportFilter"
        );


    if (!filter) {
        return;
    }


    const selectedStatus =
        filter.value;


    const cards =
        document.querySelectorAll(
            ".investigator-creature-card"
        );


    let visibleCount = 0;


    cards.forEach(card => {

        const cardStatus =
            card.dataset.status || "";


        const showCard =

            selectedStatus === "all"

            ||

            cardStatus === selectedStatus;


        if (showCard) {

            card.style.display = "";

            visibleCount++;

        }
        else {

            card.style.display =
                "none";

        }

    });


    updateInvestigatorEmpty(
        visibleCount
    );

}


/* =========================================================
   6. EMPTY STATE
========================================================= */

function updateInvestigatorEmpty(count) {

    const empty =
        document.getElementById(
            "investigatorCreatureEmpty"
        );


    if (!empty) {
        return;
    }


    if (count === 0) {

        empty.style.display =
            "block";

    }
    else {

        empty.style.display =
            "none";

    }

}


/* =========================================================
   7. MỞ CHI TIẾT SINH VẬT
========================================================= */

function openInvestigatorCreature(
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
   8. CHỈNH SỬA HỒ SƠ
========================================================= */

function setupEditProfile() {

    const button =
        document.getElementById(
            "editProfileButton"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            window.location.href =
                "chinh-sua-ho-so.html";

        }
    );

}


/* =========================================================
   9. CHIA SẺ HỒ SƠ
========================================================= */

function setupShareProfile() {

    const button =
        document.getElementById(
            "shareProfileButton"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        shareInvestigatorProfile
    );

}


/* =========================================================
   10. SHARE
========================================================= */

async function shareInvestigatorProfile() {

    const username =
        document.getElementById(
            "investigatorUsername"
        )?.textContent.trim()
        || "Điều tra viên MCA";


    const shareData = {

        title:
            `${username} | MCA`,

        text:
            `Hồ sơ Điều tra viên ${username} trên Multiverse Creature Archive.`,

        url:
            window.location.href

    };


    /*
        Nếu trình duyệt hỗ trợ Web Share API
    */

    if (navigator.share) {

        try {

            await navigator.share(
                shareData
            );

        }
        catch (error) {

            /*
                AbortError xảy ra khi người dùng
                tự đóng cửa sổ chia sẻ.
            */

            if (
                error.name !==
                "AbortError"
            ) {

                console.error(
                    "Không thể chia sẻ:",
                    error
                );

            }

        }


        return;

    }


    /*
        Nếu máy tính không hỗ trợ
        cửa sổ chia sẻ -> copy link.
    */

    await copyProfileLink();

}


/* =========================================================
   11. COPY LINK PROFILE
========================================================= */

async function copyProfileLink() {

    try {

        await navigator.clipboard.writeText(
            window.location.href
        );


        showProfileMessage(
            "Đã sao chép liên kết hồ sơ."
        );

    }
    catch (error) {

        console.error(
            "Không thể sao chép liên kết:",
            error
        );


        showProfileMessage(
            "Không thể sao chép liên kết."
        );

    }

}


/* =========================================================
   12. THÔNG BÁO NHỎ
========================================================= */

function showProfileMessage(message) {

    /*
        Nếu thông báo cũ đang tồn tại
        thì xóa trước.
    */

    const oldMessage =
        document.querySelector(
            ".profile-toast"
        );


    if (oldMessage) {

        oldMessage.remove();

    }


    const toast =
        document.createElement("div");


    toast.className =
        "profile-toast";


    toast.textContent =
        message;


    /*
        CSS trực tiếp để không bắt buộc
        phải sửa dieu-tra-vien.css.
    */

    Object.assign(
        toast.style,
        {

            position: "fixed",

            right: "25px",

            bottom: "25px",

            zIndex: "9999",

            padding: "12px 16px",

            border:
                "1px solid rgba(43, 220, 255, 0.35)",

            borderRadius: "4px",

            background:
                "rgba(4, 15, 24, 0.96)",

            color: "#2bdcff",

            fontFamily:
                "Orbitron, sans-serif",

            fontSize: "9px",

            letterSpacing: "0.5px",

            boxShadow:
                "0 0 25px rgba(43, 220, 255, 0.12)",

            opacity: "0",

            transform:
                "translateY(10px)",

            transition:
                "0.25s ease"

        }
    );


    document.body.appendChild(
        toast
    );


    /*
        Animation hiện
    */

    requestAnimationFrame(
        () => {

            toast.style.opacity =
                "1";

            toast.style.transform =
                "translateY(0)";

        }
    );


    /*
        Tự động ẩn
    */

    setTimeout(
        () => {

            toast.style.opacity =
                "0";

            toast.style.transform =
                "translateY(10px)";


            setTimeout(
                () => {

                    toast.remove();

                },
                250
            );

        },
        2500
    );

}


/* =========================================================
   13. DỮ LIỆU ĐIỀU TRA VIÊN MẪU

   Sau này phần này sẽ được thay bằng Supabase.
========================================================= */

function loadInvestigatorData() {

    const investigator = {

        username:
            "Kenya",

        level:
            "Cấp III",

        reputation:
            4820,

        reports:
            156,

        verified:
            128,

        investigating:
            21,

        likes:
            12841,

        bio:
            "Điều tra viên chuyên nghiên cứu các sinh vật bất thường và thực thể đến từ những khu vực chưa được xác định trong đa vũ trụ.",

        avatar:
            ""

    };


    updateInvestigatorProfile(
        investigator
    );

}


/* =========================================================
   14. CẬP NHẬT PROFILE
========================================================= */

function updateInvestigatorProfile(
    data
) {

    /* USERNAME */

    setProfileText(
        "investigatorUsername",
        data.username
    );


    /* LEVEL */

    setProfileText(
        "investigatorLevel",
        data.level
    );


    /* BIO */

    setProfileText(
        "investigatorBio",
        data.bio
    );


    /* REPUTATION */

    setProfileNumber(
        "profileReputation",
        data.reputation
    );


    /* REPORTS */

    setProfileNumber(
        "profileReports",
        data.reports
    );


    /* VERIFIED */

    setProfileNumber(
        "profileVerified",
        data.verified
    );


    /* INVESTIGATION */

    setProfileNumber(
        "profileInvestigating",
        data.investigating
    );


    /* LIKES */

    setProfileNumber(
        "profileLikes",
        data.likes
    );


    /* AVATAR */

    if (data.avatar) {

        const avatar =
            document.getElementById(
                "investigatorAvatar"
            );


        if (avatar) {

            avatar.src =
                data.avatar;

        }

    }

}


/* =========================================================
   15. HELPER - TEXT
========================================================= */

function setProfileText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (
        !element
        ||
        value === undefined
        ||
        value === null
    ) {

        return;

    }


    element.textContent =
        value;

}


/* =========================================================
   16. HELPER - NUMBER
========================================================= */

function setProfileNumber(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {
        return;
    }


    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        element.textContent =
            value;

        return;

    }


    element.textContent =
        number.toLocaleString(
            "vi-VN"
        );

}