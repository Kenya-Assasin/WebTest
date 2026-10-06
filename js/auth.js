/* =========================================================
   MCA AUTH
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupRegister();
        setupLogin();

    }
);


/* =========================================================
   REGISTER
========================================================= */

function setupRegister() {

    const form =
        document.getElementById(
            "registerForm"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const username =
                document
                    .getElementById(
                        "registerUsername"
                    )
                    .value
                    .trim();


            const email =
                document
                    .getElementById(
                        "registerEmail"
                    )
                    .value
                    .trim();


            const password =
                document
                    .getElementById(
                        "registerPassword"
                    )
                    .value;


            const confirmPassword =
                document
                    .getElementById(
                        "registerPasswordConfirm"
                    )
                    .value;


            if (
                password !==
                confirmPassword
            ) {

                showAuthMessage(
                    "Mật khẩu xác nhận không khớp.",
                    "error"
                );

                return;
            }


            if (
                password.length < 6
            ) {

                showAuthMessage(
                    "Mật khẩu phải có ít nhất 6 ký tự.",
                    "error"
                );

                return;
            }


            setAuthLoading(
                true,
                "registerButton"
            );


            try {

                const {
                    data,
                    error
                } = await mcaSupabase
                    .auth
                    .signUp({

                        email:
                            email,

                        password:
                            password,

                        options: {

                            data: {

                                username:
                                    username

                            }

                        }

                    });


                if (error) {
                    throw error;
                }


                console.log(
                    "Register:",
                    data
                );


                /*
                    Nếu project yêu cầu
                    xác nhận email.
                */

                if (
                    data.user &&
                    !data.session
                ) {

                    showAuthMessage(
                        "Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản.",
                        "success"
                    );

                    form.reset();

                    return;
                }


                showAuthMessage(
                    "Đăng ký thành công.",
                    "success"
                );


                setTimeout(
                    () => {

                        window.location.href =
                            "index.html";

                    },
                    1200
                );

            }
            catch (error) {

                console.error(
                    "Register error:",
                    error
                );


                showAuthMessage(
                    translateAuthError(
                        error.message
                    ),
                    "error"
                );

            }
            finally {

                setAuthLoading(
                    false,
                    "registerButton"
                );

            }

        }
    );
}


/* =========================================================
   LOGIN
========================================================= */

function setupLogin() {

    const form =
        document.getElementById(
            "loginForm"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const email =
                document
                    .getElementById(
                        "loginEmail"
                    )
                    .value
                    .trim();


            const password =
                document
                    .getElementById(
                        "loginPassword"
                    )
                    .value;


            setAuthLoading(
                true,
                "loginButton"
            );


            try {

                const {
                    data,
                    error
                } = await mcaSupabase
                    .auth
                    .signInWithPassword({

                        email:
                            email,

                        password:
                            password

                    });


                if (error) {
                    throw error;
                }


                console.log(
                    "Login:",
                    data
                );


                showAuthMessage(
                    "Đăng nhập thành công.",
                    "success"
                );


                setTimeout(
                    () => {

                        window.location.href =
                            "index.html";

                    },
                    700
                );

            }
            catch (error) {

                console.error(
                    "Login error:",
                    error
                );


                showAuthMessage(
                    translateAuthError(
                        error.message
                    ),
                    "error"
                );

            }
            finally {

                setAuthLoading(
                    false,
                    "loginButton"
                );

            }

        }
    );
}


/* =========================================================
   MESSAGE
========================================================= */

function showAuthMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "authMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        `auth-message ${type}`;

}


/* =========================================================
   LOADING
========================================================= */

function setAuthLoading(
    loading,
    buttonId
) {

    const button =
        document.getElementById(
            buttonId
        );


    if (!button) {
        return;
    }


    button.disabled =
        loading;


    if (
        buttonId ===
        "registerButton"
    ) {

        button.textContent =
            loading
                ? "ĐANG TẠO TÀI KHOẢN..."
                : "TẠO TÀI KHOẢN";

    }


    if (
        buttonId ===
        "loginButton"
    ) {

        button.textContent =
            loading
                ? "ĐANG XÁC THỰC..."
                : "ĐĂNG NHẬP";

    }

}


/* =========================================================
   ERROR TRANSLATION
========================================================= */

function translateAuthError(
    message
) {

    const text =
        String(
            message || ""
        ).toLowerCase();


    if (
        text.includes(
            "invalid login credentials"
        )
    ) {

        return "Email hoặc mật khẩu không chính xác.";

    }


    if (
        text.includes(
            "user already registered"
        )
    ) {

        return "Email này đã được đăng ký.";

    }


    if (
        text.includes(
            "password"
        ) &&
        text.includes(
            "characters"
        )
    ) {

        return "Mật khẩu chưa đủ độ dài.";

    }


    if (
        text.includes(
            "email not confirmed"
        )
    ) {

        return "Bạn chưa xác nhận email.";

    }


    return (
        message ||
        "Đã xảy ra lỗi xác thực."
    );

}