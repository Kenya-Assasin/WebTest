/* =========================================================
   MCA - SHARED COMPONENTS
   File: js/components.js
========================================================= */


/* =========================================================
   GLOBAL CURRENT USER
========================================================= */

/*
    Các file JS khác có thể đọc:

    window.mcaCurrentUser
    window.mcaCurrentProfile

    Ví dụ:

    window.mcaCurrentUser.id
    window.mcaCurrentProfile.role
*/

window.mcaCurrentUser = null;
window.mcaCurrentProfile = null;


/* =========================================================
   KHỞI ĐỘNG
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            /*
                Load Header + Footer
            */

            await Promise.all([
                loadHeader(),
                loadFooter()
            ]);


            /*
                Sau khi header đã tồn tại
                mới kiểm tra tài khoản.
            */

            await loadCurrentMCAUser();


            /*
                Theo dõi đăng nhập / đăng xuất.
            */

            setupAuthStateListener();

        }
        catch (error) {

            console.error(
                "Lỗi khởi tạo MCA Components:",
                error
            );

        }

    }
);


/* =========================================================
   LOAD HEADER
========================================================= */

async function loadHeader() {

    const container =
        document.getElementById(
            "site-header"
        );


    /*
        Trang nào không có site-header
        thì bỏ qua.
    */

    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                "components/header.html"
            );


        if (!response.ok) {

            throw new Error(
                `Không tải được header: ${response.status}`
            );

        }


        const html =
            await response.text();


        container.innerHTML =
            html;


        /*
            Sau khi HTML Header xuất hiện
            mới active menu.
        */

        setupActiveNavigation();


        /*
            Setup notification tạm thời.
        */

        setupNotificationButton();

    }
    catch (error) {

        console.error(
            "Lỗi load Header:",
            error
        );


        container.innerHTML = `
            <div style="
                padding:15px;
                color:#ff6b7a;
                background:#071522;
                border-bottom:1px solid rgba(255,107,122,.2);
            ">
                Không thể tải Header MCA.
            </div>
        `;

    }

}


/* =========================================================
   LOAD FOOTER
========================================================= */

async function loadFooter() {

    const container =
        document.getElementById(
            "site-footer"
        );


    /*
        Trang nào không có footer
        thì bỏ qua.
    */

    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                "components/footer.html"
            );


        if (!response.ok) {

            throw new Error(
                `Không tải được footer: ${response.status}`
            );

        }


        const html =
            await response.text();


        container.innerHTML =
            html;


        /*
            Nếu footer có năm hiện tại.
        */

        setupFooterYear();

    }
    catch (error) {

        console.error(
            "Lỗi load Footer:",
            error
        );

    }

}


/* =========================================================
   ACTIVE NAVIGATION
========================================================= */

function setupActiveNavigation() {

    const bodyPage =
        document.body.dataset.page;


    const links =
        document.querySelectorAll(
            ".nav-link"
        );


    links.forEach(link => {

        link.classList.remove(
            "active"
        );


        const linkPage =
            link.dataset.page;


        /*
            Cách 1:
            dùng data-page trên body.
        */

        if (
            bodyPage &&
            linkPage === bodyPage
        ) {

            link.classList.add(
                "active"
            );

        }

    });


    /*
        Nếu trang chưa có data-page,
        xác định bằng tên file.
    */

    if (!bodyPage) {

        setupActiveNavigationByURL();

    }

}


/* =========================================================
   ACTIVE NAVIGATION THEO URL
========================================================= */

function setupActiveNavigationByURL() {

    const fileName =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();


    const pageMap = {

        "":
            "home",

        "index.html":
            "home",

        "kho-du-lieu.html":
            "archive",

        "chi-tiet-sinh-vat.html":
            "archive",

        "tao-ho-so.html":
            "create",

        "dieu-tra-vien.html":
            "profile",

        "bang-xep-hang.html":
            "ranking",

        "cong-dong.html":
            "community"

    };


    const currentPage =
        pageMap[fileName];


    if (!currentPage) {
        return;
    }


    document
        .querySelectorAll(
            ".nav-link"
        )
        .forEach(link => {

            if (
                link.dataset.page ===
                currentPage
            ) {

                link.classList.add(
                    "active"
                );

            }

        });

}


/* =========================================================
   LOAD CURRENT MCA USER
========================================================= */

async function loadCurrentMCAUser() {

    const guest =
        document.getElementById(
            "headerGuest"
        );


    const account =
        document.getElementById(
            "headerAccount"
        );


    /*
        Kiểm tra Supabase đã được load chưa.
    */

    if (
        typeof mcaSupabase ===
        "undefined"
    ) {

        console.warn(
            "mcaSupabase chưa được load."
        );


        showGuestHeader(
            guest,
            account
        );


        return null;
    }


    try {

        /* =================================================
           LẤY USER TỪ SUPABASE AUTH
        ================================================= */

        const {
            data,
            error
        } = await mcaSupabase
            .auth
            .getUser();


        if (error) {

            console.warn(
                "Supabase getUser:",
                error.message
            );

        }


        const user =
            data?.user;


        /* =================================================
           CHƯA ĐĂNG NHẬP
        ================================================= */

        if (!user) {

            window.mcaCurrentUser =
                null;


            window.mcaCurrentProfile =
                null;


            showGuestHeader(
                guest,
                account
            );


            return null;
        }


        /* =================================================
           ĐÃ ĐĂNG NHẬP
        ================================================= */

        window.mcaCurrentUser =
            user;


        showAccountHeader(
            guest,
            account
        );


        /* =================================================
           LOAD PROFILE
        ================================================= */

        const profile =
            await loadUserProfile(
                user
            );


        window.mcaCurrentProfile =
            profile;


        /* =================================================
           HIỂN THỊ PROFILE
        ================================================= */

        renderHeaderProfile(
            user,
            profile
        );


        /* =================================================
           ĐẾM VERIFIED CREATURES
        ================================================= */

        await loadVerifiedCreatureCount(
            user.id
        );


        /* =================================================
           LOGOUT
        ================================================= */

        setupLogoutButton();


        /* =================================================
           ADMIN
        ================================================= */

        setupAdminAccess(
            profile
        );


        /*
            Cho file khác biết
            Auth đã load xong.
        */

        document.dispatchEvent(
            new CustomEvent(
                "mcaAuthReady",
                {
                    detail: {
                        user:
                            user,

                        profile:
                            profile
                    }
                }
            )
        );


        return {
            user,
            profile
        };

    }
    catch (error) {

        console.error(
            "Lỗi loadCurrentMCAUser:",
            error
        );


        showGuestHeader(
            guest,
            account
        );


        return null;
    }

}


/* =========================================================
   LOAD PROFILE
========================================================= */

async function loadUserProfile(user) {

    if (!user) {
        return null;
    }


    try {

        const {
            data: profile,
            error
        } = await mcaSupabase
            .from("profiles")
            .select(`
                id,
                username,
                avatar_url,
                role,
                investigator_level,
                reputation,
                created_at,
                updated_at
            `)
            .eq(
                "id",
                user.id
            )
            .single();


        if (error) {

            console.error(
                "Không tải được profile:",
                error
            );


            /*
                Nếu profile lỗi,
                vẫn trả profile tạm từ Auth
                để Header không bị hỏng.
            */

            return {

                id:
                    user.id,

                username:
                    user.user_metadata
                        ?.username ||
                    getEmailUsername(
                        user.email
                    ),

                avatar_url:
                    null,

                role:
                    "user",

                investigator_level:
                    "Cấp I",

                reputation:
                    0

            };

        }


        return profile;

    }
    catch (error) {

        console.error(
            "loadUserProfile error:",
            error
        );


        return null;
    }

}


/* =========================================================
   RENDER HEADER PROFILE
========================================================= */

function renderHeaderProfile(
    user,
    profile
) {

    const username =

        profile?.username ||

        user?.user_metadata
            ?.username ||

        getEmailUsername(
            user?.email
        ) ||

        "Investigator";


    const level =

        profile
            ?.investigator_level ||

        "Cấp I";


    const reputation =

        profile
            ?.reputation ??

        0;


    /* =====================================================
       USERNAME
    ===================================================== */

    setHeaderText(
        "headerUsername",
        username
    );


    /* =====================================================
       LEVEL
    ===================================================== */

    setHeaderText(
        "headerLevel",
        level
    );


    /* =====================================================
       REPUTATION
    ===================================================== */

    setHeaderText(
        "headerReputation",
        reputation
    );


    /* =====================================================
       AVATAR
    ===================================================== */

    renderHeaderAvatar(
        username,
        profile?.avatar_url
    );

}


/* =========================================================
   AVATAR
========================================================= */

function renderHeaderAvatar(
    username,
    avatarUrl
) {

    const avatar =
        document.getElementById(
            "headerAvatar"
        );


    if (!avatar) {
        return;
    }


    /*
        Nếu sau này người dùng
        đã có avatar_url.
    */

    if (
        avatarUrl &&
        typeof avatarUrl === "string"
    ) {

        avatar.innerHTML = "";


        const image =
            document.createElement(
                "img"
            );


        image.src =
            avatarUrl;


        image.alt =
            username;


        image.style.width =
            "100%";


        image.style.height =
            "100%";


        image.style.objectFit =
            "cover";


        image.style.borderRadius =
            "50%";


        image.onerror =
            function () {

                avatar.innerHTML = "";

                avatar.textContent =
                    getFirstCharacter(
                        username
                    );

            };


        avatar.appendChild(
            image
        );


        return;
    }


    /*
        Chưa có avatar:
        dùng chữ cái đầu username.
    */

    avatar.textContent =
        getFirstCharacter(
            username
        );

}


/* =========================================================
   VERIFIED CREATURE COUNT
========================================================= */

async function loadVerifiedCreatureCount(
    userId
) {

    if (!userId) {

        setHeaderText(
            "headerVerified",
            0
        );

        return;
    }


    try {

        const {
            count,
            error
        } = await mcaSupabase
            .from("creatures")
            .select(
                "id",
                {
                    count:
                        "exact",

                    head:
                        true
                }
            )
            .eq(
                "creator_id",
                userId
            )
            .eq(
                "status",
                "verified"
            );


        if (error) {

            console.warn(
                "Không đếm được hồ sơ verified:",
                error
            );


            setHeaderText(
                "headerVerified",
                0
            );


            return;
        }


        setHeaderText(
            "headerVerified",
            count ?? 0
        );

    }
    catch (error) {

        console.error(
            "loadVerifiedCreatureCount:",
            error
        );


        setHeaderText(
            "headerVerified",
            0
        );

    }

}


/* =========================================================
   GUEST HEADER
========================================================= */

function showGuestHeader(
    guest,
    account
) {

    if (guest) {

        guest.hidden =
            false;

    }


    if (account) {

        account.hidden =
            true;

    }

}


/* =========================================================
   ACCOUNT HEADER
========================================================= */

function showAccountHeader(
    guest,
    account
) {

    if (guest) {

        guest.hidden =
            true;

    }


    if (account) {

        account.hidden =
            false;

    }

}


/* =========================================================
   LOGOUT BUTTON
========================================================= */

function setupLogoutButton() {

    const button =
        document.getElementById(
            "headerLogoutButton"
        );


    if (!button) {
        return;
    }


    /*
        Tránh addEventListener
        nhiều lần.
    */

    if (
        button.dataset.ready ===
        "true"
    ) {
        return;
    }


    button.dataset.ready =
        "true";


    button.addEventListener(
        "click",
        async () => {

            button.disabled =
                true;


            const oldText =
                button.textContent;


            button.textContent =
                "...";


            try {

                const {
                    error
                } = await mcaSupabase
                    .auth
                    .signOut();


                if (error) {
                    throw error;
                }


                window.mcaCurrentUser =
                    null;


                window.mcaCurrentProfile =
                    null;


                window.location.href =
                    "index.html";

            }
            catch (error) {

                console.error(
                    "Đăng xuất thất bại:",
                    error
                );


                button.disabled =
                    false;


                button.textContent =
                    oldText;

            }

        }
    );

}


/* =========================================================
   AUTH STATE LISTENER
========================================================= */

function setupAuthStateListener() {

    if (
        typeof mcaSupabase ===
        "undefined"
    ) {
        return;
    }


    /*
        Khi đăng nhập / đăng xuất
        Supabase sẽ báo cho website.
    */

    mcaSupabase
        .auth
        .onAuthStateChange(
            async (
                event,
                session
            ) => {

                console.log(
                    "MCA Auth:",
                    event
                );


                /*
                    Tránh reload profile
                    không cần thiết lúc khởi tạo.
                */

                if (
                    event ===
                    "INITIAL_SESSION"
                ) {
                    return;
                }


                if (
                    event ===
                    "SIGNED_OUT"
                ) {

                    window.mcaCurrentUser =
                        null;


                    window.mcaCurrentProfile =
                        null;


                    showGuestHeader(
                        document.getElementById(
                            "headerGuest"
                        ),

                        document.getElementById(
                            "headerAccount"
                        )
                    );


                    return;
                }


                if (
                    event ===
                    "SIGNED_IN"
                ) {

                    await loadCurrentMCAUser();

                }

            }
        );

}


/* =========================================================
   ADMIN ACCESS
========================================================= */

function setupAdminAccess(
    profile
) {

    /*
        Header hiện tại chưa bắt buộc
        phải có nút Admin.

        Nhưng ta chuẩn bị sẵn logic.
    */

    const adminLink =
        document.getElementById(
            "headerAdminLink"
        );


    if (!adminLink) {
        return;
    }


    if (
        profile?.role ===
        "admin"
    ) {

        adminLink.hidden =
            false;

    }
    else {

        adminLink.hidden =
            true;

    }

}


/* =========================================================
   KIỂM TRA USER ĐÃ LOGIN
========================================================= */

/*
    Có thể dùng ở file khác:

    const user =
        await getCurrentMCAUser();

    if (!user) {
        ...
    }
*/

async function getCurrentMCAUser() {

    if (
        window.mcaCurrentUser
    ) {

        return window
            .mcaCurrentUser;

    }


    if (
        typeof mcaSupabase ===
        "undefined"
    ) {

        return null;

    }


    const {
        data,
        error
    } = await mcaSupabase
        .auth
        .getUser();


    if (error) {

        console.warn(
            error
        );

        return null;
    }


    return (
        data?.user ||
        null
    );

}


/* =========================================================
   KIỂM TRA ADMIN
========================================================= */

/*
    Sau này admin.js có thể dùng:

    if (isCurrentUserAdmin()) {
        ...
    }
*/

function isCurrentUserAdmin() {

    return (
        window
            .mcaCurrentProfile
            ?.role ===
        "admin"
    );

}


/* =========================================================
   NOTIFICATION BUTTON
========================================================= */

function setupNotificationButton() {

    const button =
        document.getElementById(
            "notificationButton"
        );


    if (!button) {
        return;
    }


    if (
        button.dataset.ready ===
        "true"
    ) {
        return;
    }


    button.dataset.ready =
        "true";


    button.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            /*
                Chức năng thông báo
                sẽ làm sau.

                Hiện tại chỉ log.
            */

            console.log(
                "Notification system chưa được triển khai."
            );

        }
    );

}


/* =========================================================
   FOOTER YEAR
========================================================= */

function setupFooterYear() {

    /*
        Nếu footer.html có:

        <span id="footerYear"></span>

        thì tự động hiện năm.
    */

    const year =
        document.getElementById(
            "footerYear"
        );


    if (!year) {
        return;
    }


    year.textContent =
        new Date()
            .getFullYear();

}


/* =========================================================
   SET HEADER TEXT
========================================================= */

function setHeaderText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.textContent =
        value ?? "";

}


/* =========================================================
   GET FIRST CHARACTER
========================================================= */

function getFirstCharacter(
    value
) {

    const text =
        String(
            value || "?"
        )
        .trim();


    if (!text) {
        return "?";
    }


    return text
        .charAt(0)
        .toUpperCase();

}


/* =========================================================
   GET USERNAME FROM EMAIL
========================================================= */

function getEmailUsername(
    email
) {

    if (!email) {
        return "Investigator";
    }


    return String(email)
        .split("@")[0] ||
        "Investigator";

}