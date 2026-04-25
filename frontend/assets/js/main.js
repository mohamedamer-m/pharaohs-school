document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = "http://127.0.0.1:8000";
    const pathname = window.location.pathname;
    const pageName = pathname.split("/").pop() || "";

    const showMessage = (message, type = "success") => {
        const messageBox = document.getElementById("appMessage") || document.getElementById("loginMessage");
        if (!messageBox) {
            alert(message);
            return;
        }
        messageBox.className = `alert alert-${type}`;
        messageBox.textContent = message;
    };

    const setButtonLoading = (button, loadingText, isLoading) => {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.disabled = true;
            button.textContent = loadingText;
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || button.textContent;
        }
    };

    const getAuth = () => ({
        token: localStorage.getItem("token"),
        role: localStorage.getItem("role"),
        userName: localStorage.getItem("userName"),
    });

    const authFetch = async (url, options = {}) => {
        const { token } = getAuth();
        const headers = { ...(options.headers || {}) };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
        if (response.status === 401 || response.status === 403) {
            localStorage.clear();
            window.location.href = pathname.includes("/dashboard/") ? "../login.html" : "login.html";
            throw new Error("Unauthorized");
        }
        return response;
    };

    const handleNavbarEffects = () => {
        const navbar = document.getElementById("mainNavbar");
        const navLinks = document.querySelectorAll(".navbar .nav-link");
        const sections = document.querySelectorAll("section[id], header[id]");
        if (!navbar) return;

        const handleNavbarScroll = () => {
            if (window.scrollY > 20) navbar.classList.add("scrolled");
            else navbar.classList.remove("scrolled");
        };

        const setActiveLink = () => {
            if (!sections.length || !navLinks.length) return;
            const scrollPosition = window.scrollY + 140;
            sections.forEach((section) => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute("id");
                if (
                    sectionId &&
                    scrollPosition >= sectionTop &&
                    scrollPosition < sectionTop + sectionHeight
                ) {
                    navLinks.forEach((link) => link.classList.remove("active"));
                    const activeLink = document.querySelector(`.navbar .nav-link[href="#${sectionId}"]`);
                    if (activeLink) activeLink.classList.add("active");
                }
            });
        };

        window.addEventListener("scroll", () => {
            handleNavbarScroll();
            setActiveLink();
        });
        handleNavbarScroll();
        setActiveLink();
    };

    const setupSidebar = () => {
        const sidebar = document.getElementById("dashboardSidebar");
        const sidebarToggle = document.getElementById("sidebarToggle");
        const sidebarOverlay = document.getElementById("sidebarOverlay");
        if (!sidebar) return;

        const openSidebar = () => {
            sidebar.classList.add("open");
            if (sidebarOverlay) sidebarOverlay.classList.add("show");
        };

        const closeSidebar = () => {
            sidebar.classList.remove("open");
            if (sidebarOverlay) sidebarOverlay.classList.remove("show");
        };

        if (sidebarToggle) {
            sidebarToggle.addEventListener("click", () => {
                if (sidebar.classList.contains("open")) closeSidebar();
                else openSidebar();
            });
        }

        if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);
        window.addEventListener("resize", () => {
            if (window.innerWidth >= 992) closeSidebar();
        });
    };

    const setupLogout = () => {
        const logoutBtn = document.getElementById("logoutBtn");
        if (!logoutBtn) return;
        logoutBtn.addEventListener("click", (event) => {
            event.preventDefault();
            localStorage.clear();
            window.location.href = "../login.html";
        });
    };

    const guardDashboardRoute = (requiredRole) => {
        const { token, role, userName } = getAuth();
        if (!token || role !== requiredRole) {
            localStorage.clear();
            window.location.href = "../login.html";
            return false;
        }
        const nameLabel = document.getElementById("userNameLabel");
        const roleLabel = document.getElementById("userRoleLabel");
        if (nameLabel && userName) nameLabel.textContent = userName;
        if (roleLabel) roleLabel.textContent = `Role: ${requiredRole[0].toUpperCase()}${requiredRole.slice(1)}`;
        return true;
    };

    const setupHomeContact = () => {
        const contactForm = document.getElementById("contactForm");
        if (!contactForm) return;
        contactForm.addEventListener("submit", (event) => {
            event.preventDefault();
            alert("Thank you! Your message has been received.");
            contactForm.reset();
        });
    };

    const setupLogin = () => {
        const loginForm = document.getElementById("loginForm");
        if (!loginForm) return;
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value;
            const submitBtn = loginForm.querySelector("button[type='submit']");

            try {
                setButtonLoading(submitBtn, "Logging in...", true);
                const body = new URLSearchParams({ username: email, password });
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: body.toString(),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.detail || "Login failed");

                localStorage.setItem("token", data.access_token);
                localStorage.setItem("role", data.role);
                localStorage.setItem("userName", email.split("@")[0]);
                showMessage("Login successful. Redirecting...", "success");

                if (data.role === "admin") window.location.href = "dashboard/admin.html";
                else if (data.role === "teacher") window.location.href = "dashboard/teacher.html";
                else window.location.href = "dashboard/student.html";
            } catch (error) {
                showMessage(error.message || "Unable to login", "danger");
            } finally {
                setButtonLoading(submitBtn, "", false);
            }
        });
    };

    const setupAdminPage = () => {
        if (!guardDashboardRoute("admin")) return;

        const studentsBody = document.getElementById("studentsTableBody");
        const teachersBody = document.getElementById("teachersTableBody");
        const subjectsBody = document.getElementById("subjectsTableBody");

        const renderStudents = (students) => {
            studentsBody.innerHTML = students.map((student) => `
                <tr>
                    <td>${student.name}</td>
                    <td>${student.class_name}</td>
                    <td>${student.age}</td>
                    <td class="d-flex gap-2">
                        <button class="btn btn-outline-primary btn-sm edit-student-btn" data-id="${student.id}" data-name="${student.name}" data-email="${student.email}" data-class="${student.class_name}" data-age="${student.age}">Edit</button>
                        <button class="btn btn-outline-danger btn-sm delete-student-btn" data-id="${student.id}">Delete</button>
                    </td>
                </tr>
            `).join("");
        };

        const renderTeachers = (teachers) => {
            teachersBody.innerHTML = teachers.map((teacher) => `
                <tr><td>${teacher.name}</td><td>${teacher.subject}</td></tr>
            `).join("");
        };

        const renderSubjects = (subjects) => {
            subjectsBody.innerHTML = subjects.map((subject) => `<tr><td>${subject.name}</td></tr>`).join("");
        };

        const loadData = async () => {
            try {
                const [studentsRes, teachersRes, subjectsRes] = await Promise.all([
                    authFetch("/admin/students"),
                    authFetch("/admin/teachers"),
                    authFetch("/admin/subjects"),
                ]);
                renderStudents(await studentsRes.json());
                renderTeachers(await teachersRes.json());
                renderSubjects(await subjectsRes.json());
            } catch (error) {
                showMessage(error.message || "Failed to load dashboard data", "danger");
            }
        };

        document.getElementById("addStudentBtn").addEventListener("click", async () => {
            const name = prompt("Student name:");
            if (!name) return;
            const email = prompt("Student email:");
            const password = prompt("Student password:");
            const className = prompt("Class name:");
            const age = Number(prompt("Age:"));
            if (!email || !password || !className || !age) return;
            try {
                const res = await authFetch("/admin/students", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password, class_name: className, age }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || "Create student failed");
                showMessage("Student added successfully", "success");
                await loadData();
            } catch (error) {
                showMessage(error.message, "danger");
            }
        });

        document.getElementById("addTeacherBtn").addEventListener("click", async () => {
            const name = prompt("Teacher name:");
            if (!name) return;
            const email = prompt("Teacher email:");
            const password = prompt("Teacher password:");
            const subject = prompt("Subject:");
            if (!email || !password || !subject) return;
            try {
                const res = await authFetch("/admin/teachers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password, subject }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || "Create teacher failed");
                showMessage("Teacher added successfully", "success");
                await loadData();
            } catch (error) {
                showMessage(error.message, "danger");
            }
        });

        document.getElementById("addSubjectBtn").addEventListener("click", async () => {
            const name = prompt("Subject name:");
            if (!name) return;
            try {
                const res = await authFetch("/admin/subjects", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || "Create subject failed");
                showMessage("Subject added successfully", "success");
                await loadData();
            } catch (error) {
                showMessage(error.message, "danger");
            }
        });

        studentsBody.addEventListener("click", async (event) => {
            const target = event.target;
            if (target.classList.contains("edit-student-btn")) {
                const studentId = target.dataset.id;
                const name = prompt("Student name:", target.dataset.name);
                const email = prompt("Student email:", target.dataset.email);
                const className = prompt("Class name:", target.dataset.class);
                const age = Number(prompt("Age:", target.dataset.age));
                if (!name || !email || !className || !age) return;
                try {
                    const res = await authFetch(`/admin/students/${studentId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name, email, class_name: className, age }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.detail || "Update failed");
                    showMessage("Student updated successfully", "success");
                    await loadData();
                } catch (error) {
                    showMessage(error.message, "danger");
                }
            }

            if (target.classList.contains("delete-student-btn")) {
                const studentId = target.dataset.id;
                if (!confirm("Delete this student?")) return;
                try {
                    const res = await authFetch(`/admin/students/${studentId}`, { method: "DELETE" });
                    if (!res.ok) throw new Error("Delete failed");
                    showMessage("Student deleted successfully", "success");
                    await loadData();
                } catch (error) {
                    showMessage(error.message, "danger");
                }
            }
        });

        loadData();
    };

    const setupTeacherPage = () => {
        if (!guardDashboardRoute("teacher")) return;
        const studentsBody = document.getElementById("teacherStudentsBody");
        const studentSelect = document.getElementById("gradeStudent");
        const subjectSelect = document.getElementById("gradeSubject");
        const gradeForm = document.getElementById("gradeForm");

        const loadTeacherData = async () => {
            try {
                const [studentsRes, subjectsRes] = await Promise.all([
                    authFetch("/teacher/students"),
                    authFetch("/teacher/subjects"),
                ]);
                const students = await studentsRes.json();
                const subjects = await subjectsRes.json();

                studentsBody.innerHTML = students
                    .map((student) => `<tr><td>${student.name}</td><td>${student.class_name}</td></tr>`)
                    .join("");

                studentSelect.innerHTML = '<option value="">Choose...</option>' + students
                    .map((student) => `<option value="${student.id}">${student.name}</option>`)
                    .join("");
                subjectSelect.innerHTML = '<option value="">Choose...</option>' + subjects
                    .map((subject) => `<option value="${subject.id}">${subject.name}</option>`)
                    .join("");
            } catch (error) {
                showMessage(error.message || "Failed to load teacher data", "danger");
            }
        };

        gradeForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const payload = {
                student_id: Number(studentSelect.value),
                subject_id: Number(subjectSelect.value),
                grade: document.getElementById("gradeValue").value.trim(),
            };
            try {
                const res = await authFetch("/teacher/grades", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || "Failed to submit grade");
                showMessage("Grade submitted successfully", "success");
                gradeForm.reset();
            } catch (error) {
                showMessage(error.message, "danger");
            }
        });

        loadTeacherData();
    };

    const setupStudentPage = () => {
        if (!guardDashboardRoute("student")) return;
        const gradesBody = document.getElementById("studentGradesBody");
        const gradeBadgeClass = (value) => {
            if (value.startsWith("A")) return "text-bg-success";
            if (value.startsWith("B")) return "text-bg-primary";
            return "text-bg-warning";
        };

        const loadGrades = async () => {
            try {
                const res = await authFetch("/student/my-grades");
                const grades = await res.json();
                gradesBody.innerHTML = grades
                    .map((row) => `<tr><td>${row.subject}</td><td><span class="badge ${gradeBadgeClass(row.grade)}">${row.grade}</span></td></tr>`)
                    .join("") || '<tr><td colspan="2" class="text-muted">No grades found yet.</td></tr>';
            } catch (error) {
                showMessage(error.message || "Failed to load grades", "danger");
            }
        };

        loadGrades();
    };

    handleNavbarEffects();
    setupHomeContact();
    setupLogin();
    setupSidebar();
    setupLogout();

    if (pageName === "admin.html") setupAdminPage();
    if (pageName === "teacher.html") setupTeacherPage();
    if (pageName === "student.html") setupStudentPage();
});
