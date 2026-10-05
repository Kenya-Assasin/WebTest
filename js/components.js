/* =========================================================
   MCA - COMPONENTS.JS

   Chức năng:
   1. Load Header
   2. Load Footer
   3. Đánh dấu menu đang mở
   4. Cập nhật thông tin người dùng
========================================================= */


/* =========================================================
   1. LOAD COMPONENT
========================================================= */

async function loadComponent(elementId, filePath) {

    // Tìm vị trí cần chèn component
    const element = document.getElementById(elementId);

    // Nếu không tìm thấy thì dừng
    if (!element) {
        console.warn(
            `Không tìm thấy phần tử #${elementId}`
        );

        return;
    }


    try {

        // Đọc file HTML
        const response = await fetch(filePath);


        // Kiểm tra lỗi
        if (!response.ok) {

            throw new Error(
                `Không thể tải ${filePath}`
            );

        }


        // Chuyển dữ liệu thành HTML
        const html = await response.text();


        // Chèn vào trang
        element.innerHTML = html;

    }
    catch (error) {

        console.error(
            "Lỗi khi tải component:",
            error
        );


        element.innerHTML = `
            <div class="component-error">
                Không thể tải giao diện.
            </div>
        `;

    }

}


/* =========================================================
   2. LOAD HEADER
========================================================= */

async function loadHeader() {

    await loadComponent(
        "site-header",
        "components/header.html"
    );

}


/* =========================================================
   3. LOAD FOOTER
========================================================= */

async function loadFooter() {

    await loadComponent(
        "site-footer",
        "components/footer.html"
    );

}


/* =========================================================
   4. ACTIVE MENU
========================================================= */

function setActiveNavigation() {

    /*
        Trong mỗi trang chúng ta đặt:

        Trang chủ:
        <body data-page="home">

        Kho dữ liệu:
        <body data-page="archive">

        Khám phá:
        <body data-page="explore">
    */


    // Lấy tên trang hiện tại
    const currentPage =
        document.body.dataset.page;


    // Nếu body không có data-page
    if (!currentPage) {

        console.warn(
            "Trang hiện tại chưa có data-page."
        );

        return;

    }


    // Tìm tất cả menu
    const navigationLinks =
        document.querySelectorAll(
            ".nav-link"
        );


    // Kiểm tra từng menu
    navigationLinks.forEach(link => {

        const page =
            link.dataset.page;


        // Xóa active cũ
        link.classList.remove(
            "active"
        );


        // Nếu đúng trang hiện tại
        if (page === currentPage) {

            link.classList.add(
                "active"
            );

        }

    });

}


/* =========================================================
   5. THÔNG TIN NGƯỜI DÙNG
========================================================= */

function updateHeaderUser(userData) {

    /*
        Sau này dữ liệu này có thể lấy
        trực tiếp từ Supabase.

        Ví dụ:

        {
            username: "Kenya",
            level: "Cấp III",
            reputation: 4820,
            verified: 128,
            notifications: 3,
            avatar: "..."
        }
    */


    /* =========================
       USERNAME
    ========================== */

    const username =
        document.getElementById(
            "headerUsername"
        );


    if (
        username &&
        userData.username
    ) {

        username.textContent =
            userData.username;

    }


    /* =========================
       LEVEL
    ========================== */

    const level =
        document.getElementById(
            "headerLevel"
        );


    if (
        level &&
        userData.level
    ) {

        level.textContent =
            userData.level;

    }


    /* =========================
       REPUTATION
    ========================== */

    const reputation =
        document.getElementById(
            "headerReputation"
        );


    if (
        reputation &&
        userData.reputation !== undefined
    ) {

        reputation.textContent =
            Number(
                userData.reputation
            ).toLocaleString(
                "vi-VN"
            );

    }


    /* =========================
       VERIFIED REPORTS
    ========================== */

    const verified =
        document.getElementById(
            "headerVerified"
        );


    if (
        verified &&
        userData.verified !== undefined
    ) {

        verified.textContent =
            Number(
                userData.verified
            ).toLocaleString(
                "vi-VN"
            );

    }


    /* =========================
       NOTIFICATIONS
    ========================== */

    const notification =
        document.getElementById(
            "notificationCount"
        );


    if (
        notification &&
        userData.notifications !== undefined
    ) {

        notification.textContent =
            userData.notifications;


        /*
            Nếu không có thông báo
            thì ẩn số đi.
        */

        if (
            Number(
                userData.notifications
            ) === 0
        ) {

            notification.style.display =
                "none";

        }
        else {

            notification.style.display =
                "flex";

        }

    }


    /* =========================
       AVATAR
    ========================== */

    const avatar =
        document.getElementById(
            "headerAvatar"
        );


    if (
        avatar &&
        userData.avatar
    ) {

        avatar.src =
            userData.avatar;

    }


    /* =========================
       AVATAR FALLBACK
    ========================== */

    const avatarFallback =
        document.querySelector(
            ".avatar-fallback"
        );


    if (
        avatarFallback &&
        userData.username
    ) {

        avatarFallback.textContent =
            userData.username
                .charAt(0)
                .toUpperCase();

    }

}


/* =========================================================
   6. DỮ LIỆU USER TẠM THỜI
========================================================= */

function loadTemporaryUser() {

    /*
        Đây chỉ là dữ liệu DEMO.

        Khi kết nối Supabase
        chúng ta sẽ xóa phần này
        và lấy dữ liệu thật.
    */


    const temporaryUser = {

        username: "Kenya",

        level: "Cấp III",

        reputation: 4820,

        verified: 128,

        notifications: 3,

        avatar: ""
    };


    updateHeaderUser(
        temporaryUser
    );

}


/* =========================================================
   7. XỬ LÝ NÚT THÔNG BÁO
========================================================= */

function setupNotificationButton() {

    const button =
        document.getElementById(
            "notificationButton"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            /*
                Sau này có thể đổi thành
                notification panel.

                Hiện tại chuyển sang
                trang notifications.
            */

            window.location.href =
                "notifications.html";

        }
    );

}


/* =========================================================
   8. KHỞI TẠO COMPONENT
========================================================= */

async function initializeComponents() {

    /*
        Header và Footer có thể
        tải cùng lúc.
    */

    await Promise.all([

        loadHeader(),

        loadFooter()

    ]);


    /*
        Header phải load xong
        thì mới chạy những phần sau.
    */


    setActiveNavigation();


    loadTemporaryUser();


    setupNotificationButton();

}


/* =========================================================
   9. CHẠY KHI HTML LOAD XONG
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeComponents
);