
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const emptyForm = {
  name: "",
  duration: 30,
  topics: "",
  price: 0,
  maxStudents: 20,
  status: "Open",
};

export default function App() {
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("course_auth"));
    } catch {
      return null;
    }
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [courses, setCourses] = useState([]);
  const [enrolled, setEnrolled] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function api(path, options = {}, session = auth) {
    const response = await fetch(API + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.token || ""}`,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Request failed: ${response.status}`);
    }

    return data;
  }

  async function loadData(session = auth) {
    if (!session) return;

    try {
      const list = await api("/api/course", {}, session);
      setCourses(Array.isArray(list) ? list : []);

      if (session.user.role === "Student") {
        const mine = await api("/api/user/enrolled", {}, session);
        setEnrolled(Array.isArray(mine) ? mine : []);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (auth) loadData(auth);
  }, [auth]);

  async function login(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }, null);

      const session = { user: data.user, token: data.token };
      localStorage.setItem("course_auth", JSON.stringify(session));
      setAuth(session);
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("course_auth");
    setAuth(null);
    setCourses([]);
    setEnrolled([]);
    setSelected(null);
    setMessage("");
    setError("");
  }

  async function saveCourse(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      const body = {
        ...form,
        duration: Number(form.duration),
        price: Number(form.price),
        maxStudents: Number(form.maxStudents),
        topics: form.topics.split(",").map(t => t.trim()).filter(Boolean),
      };

      await api(
        editing ? `/api/course/${editing}` : "/api/course",
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify(body),
        }
      );

      setMessage(editing ? "Course updated!" : "Course created!");
      setEditing(null);
      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function editCourse(course) {
    setEditing(course._id);
    setForm({
      name: course.name,
      duration: course.duration,
      topics: course.topics.join(", "),
      price: course.price,
      maxStudents: course.maxStudents,
      status: course.status,
    });
    setSelected(null);
    window.scrollTo(0, 0);
  }

  async function deleteCourse(id) {
    if (!window.confirm("Delete this course?")) return;

    try {
      await api(`/api/course/${id}`, { method: "DELETE" });
      setMessage("Course deleted!");
      setSelected(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function enroll(id) {
    setError("");
    setMessage("");

    try {
      await api(`/api/course/${id}/enroll`, { method: "POST" });
      setMessage("Enrollment successful!");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const teacher = auth?.user.role === "Teacher";
  const filtered = courses.filter(c =>
    (c.name + " " + (c.teacherName || ""))
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const box = {
    background: "white",
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
    boxShadow: "0 2px 10px #00000012",
  };

  const input = {
    width: "100%",
    padding: 12,
    marginBottom: 12,
    border: "1px solid #ccc",
    borderRadius: 6,
    boxSizing: "border-box",
  };

  const button = {
    padding: "10px 16px",
    marginRight: 8,
    marginTop: 8,
    background: "#2563eb",
    color: "white",
    border: 0,
    borderRadius: 6,
    cursor: "pointer",
  };

  return (
    <main style={{
      minHeight: "100vh",
      padding: 24,
      background: "#f1f5f9",
      color: "#111827",
      fontFamily: "Arial, sans-serif",
    }}>
      <div style={{ maxWidth: 1050, margin: "auto" }}>
        <h1>Online Course Service</h1>

        {!auth ? (
          <form onSubmit={login} style={{ ...box, maxWidth: 420 }}>
            <h2>Login</h2>
            <input style={input} placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required />
            <input style={input} type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required />
            <button style={button} disabled={busy}>
              {busy ? "Logging in..." : "Login"}
            </button>
          </form>
        ) : (
          <>
            <div style={box}>
              <strong>Welcome, {auth.user.username}</strong>
              <p>Role: {auth.user.role}</p>
              <button style={button} onClick={logout}>Logout</button>
              <button style={button} onClick={() => loadData()}>
                Refresh
              </button>
            </div>

            {teacher && (
              <form onSubmit={saveCourse} style={box}>
                <h2>{editing ? "Edit Course" : "Create Course"}</h2>

                {[
                  ["name", "Course Name", "text"],
                  ["duration", "Duration (days)", "number"],
                  ["topics", "Topics (comma-separated)", "text"],
                  ["price", "Price", "number"],
                  ["maxStudents", "Maximum Students", "number"],
                ].map(([key, label, type]) => (
                  <div key={key}>
                    <label>{label}</label>
                    <input style={input} type={type}
                      value={form[key]}
                      required
                      onChange={e => setForm({
                        ...form, [key]: e.target.value
                      })} />
                  </div>
                ))}

                <label>Status</label>
                <select style={input} value={form.status}
                  onChange={e => setForm({
                    ...form, status: e.target.value
                  })}>
                  <option>Open</option>
                  <option>Close</option>
                  <option>Cancel</option>
                </select>

                <button style={button} disabled={busy}>
                  {editing ? "Update Course" : "Create Course"}
                </button>

                {editing && (
                  <button type="button" style={button}
                    onClick={() => {
                      setEditing(null);
                      setForm(emptyForm);
                    }}>
                    Cancel Edit
                  </button>
                )}
              </form>
            )}

            <div style={box}>
              <h2>{teacher ? "My Courses" : "Available Courses"}</h2>
              <input style={input}
                placeholder="Search by course or teacher name"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              {filtered.length === 0 && <p>No courses found.</p>}

              {filtered.map(course => {
                const count = course.enrolledStudents?.length || 0;
                const joined = enrolled.some(c => c._id === course._id);

                return (
                  <div key={course._id} style={{
                    border: "1px solid #ddd",
                    padding: 16,
                    marginBottom: 12,
                    borderRadius: 8,
                  }}>
                    <h3>{course.name}</h3>
                    <p>Teacher: {course.teacherName}</p>
                    <p>Duration: {course.duration} days</p>
                    <p>Topics: {course.topics?.join(", ")}</p>
                    <p>Price: {course.price}</p>
                    <p>Status: <strong>{course.status}</strong></p>
                    <p>Students: {count}/{course.maxStudents}</p>

                    <button style={button}
                      onClick={() => setSelected(
                        selected?._id === course._id ? null : course
                      )}>
                      Details
                    </button>

                    {teacher ? (
                      <>
                        <button style={button}
                          onClick={() => editCourse(course)}>
                          Edit
                        </button>
                        <button style={{
                          ...button, background: "#dc2626"
                        }} onClick={() => deleteCourse(course._id)}>
                          Delete
                        </button>
                      </>
                    ) : (
                      <button style={button}
                        disabled={
                          joined ||
                          course.status !== "Open" ||
                          count >= course.maxStudents
                        }
                        onClick={() => enroll(course._id)}>
                        {joined ? "Enrolled" :
                         course.status !== "Open" ? "Closed" :
                         count >= course.maxStudents ? "Full" : "Enroll"}
                      </button>
                    )}

                    {selected?._id === course._id && (
                      <div style={{
                        marginTop: 14,
                        background: "#e0f2fe",
                        padding: 14,
                        borderRadius: 6
                      }}>
                        <h4>Course Details</h4>
                        <p>{course.name}</p>
                        <p>Topics: {course.topics?.join(", ")}</p>
                        {teacher && (
                          <>
                            <h4>Enrolled Student IDs</h4>
                            {count === 0 ? <p>No students yet.</p> :
                              <ul>
                                {course.enrolledStudents.map(id =>
                                  <li key={id}>{id}</li>
                                )}
                              </ul>
                            }
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!teacher && (
              <div style={box}>
                <h2>My Enrolled Courses</h2>
                {enrolled.length === 0
                  ? <p>You have not enrolled in any courses.</p>
                  : enrolled.map(c =>
                    <p key={c._id}>✓ {c.name} — {c.teacherName}</p>
                  )}
              </div>
            )}
          </>
        )}

        {error && (
          <p role="alert" style={{
            color: "#b91c1c", background: "#fee2e2", padding: 12
          }}>{error}</p>
        )}
        {message && (
          <p role="status" style={{
            color: "#166534", background: "#dcfce7", padding: 12
          }}>{message}</p>
        )}
      </div>
    </main>
  );
}
