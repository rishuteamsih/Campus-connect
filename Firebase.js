// ✅ Campus Connect Firebase Configuration (v10.8.1)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, getDocs, updateDoc, addDoc,
  collection, query, where, orderBy, onSnapshot, serverTimestamp,
  arrayUnion, arrayRemove, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
  getStorage, ref as sRef, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// 🔧 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAFKmM22FUSQPYy-eMsBzcZN3bmAxglXl0",
  authDomain: "smart-timetable-266fe.firebaseapp.com",
  projectId: "smart-timetable-266fe",
  storageBucket: "smart-timetable-266fe.appspot.com",
};

// 🚀 Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

//
// ─── PROFILE HELPERS ──────────────────────────────
//
export async function getUserProfile(uid) {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("Error fetching profile:", err);
    return null;
  }
}

export async function saveUserProfile(uid, data) {
  try {
    const ref = doc(db, "users", uid);
    await setDoc(ref, data, { merge: true });
    return true;
  } catch (err) {
    console.error("Error saving profile:", err);
    return false;
  }
}

//
// ─── AUTH HELPERS ──────────────────────────────────
//
export function requireAuth(callback) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert("Session expired or not logged in. Please sign in again.");
      window.location.href = "index.html";
    } else {
      callback(user);
    }
  });
}

export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user || null);
    });
  });
}

//
// ─── CLASSROOM / ASSIGNMENT HELPERS ──────────────
//

// ✅ Create a classroom (faculty only)
export async function createClassroom(uid, name, code) {
  const docRef = await addDoc(collection(db, "classes"), {
    name,
    code,
    creator: uid,
    members: [uid],
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

// ✅ Get classrooms where user is a member
export async function getUserClassrooms(uid) {
  const q = query(collection(db, "classes"), where("members", "array-contains", uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ✅ Classroom notices
export async function postClassNotice(classId, facultyUid, title, message, file = null) {
  let fileURL = "", fileName = "";
  if (file) {
    const path = `classroom_notices/${classId}/${Date.now()}_${file.name}`;
    const ref = sRef(storage, path);
    const uploadTask = await uploadBytesResumable(ref, file);
    fileURL = await getDownloadURL(uploadTask.ref);
    fileName = file.name;
  }
  return await addDoc(collection(db, "classroom_notices", classId, "notices"), {
    facultyUid,
    title,
    message,
    fileURL,
    fileName,
    createdAt: serverTimestamp()
  });
}

export async function getClassNotices(classId) {
  const q = query(collection(db, "classroom_notices", classId, "notices"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ✅ Assignments
export async function postAssignment(classId, facultyUid, title, description, file = null, dueDate = null) {
  let fileURL = "", fileName = "";
  if (file) {
    const path = `assignments/${classId}/${Date.now()}_${file.name}`;
    const ref = sRef(storage, path);
    const uploadTask = await uploadBytesResumable(ref, file);
    fileURL = await getDownloadURL(uploadTask.ref);
    fileName = file.name;
  }
  return await addDoc(collection(db, "assignments", classId, "list"), {
    facultyUid,
    title,
    description,
    fileURL,
    fileName,
    dueDate,
    createdAt: serverTimestamp()
  });
}

export async function getAssignments(classId) {
  const q = query(collection(db, "assignments", classId, "list"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ✅ Assignment submissions
export async function submitAssignment(classId, assignmentId, studentUid, file) {
  let fileURL = "", fileName = "";
  if (file) {
    const path = `assignment_submissions/${classId}/${assignmentId}/${Date.now()}_${file.name}`;
    const ref = sRef(storage, path);
    const uploadTask = await uploadBytesResumable(ref, file);
    fileURL = await getDownloadURL(uploadTask.ref);
    fileName = file.name;
  }
  return await addDoc(collection(db, "assignment_submissions", classId, assignmentId), {
    studentUid,
    fileURL,
    fileName,
    submittedAt: serverTimestamp()
  });
}

export async function getAssignmentSubmissions(classId, assignmentId) {
  const q = query(collection(db, "assignment_submissions", classId, assignmentId), orderBy("submittedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ✅ Classroom questions
export async function postStudentQuestion(classId, studentUid, question) {
  return await addDoc(collection(db, "classroom_questions", classId), {
    studentUid,
    question,
    createdAt: serverTimestamp()
  });
}

export async function getStudentQuestions(classId) {
  const q = query(collection(db, "classroom_questions", classId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function answerStudentQuestion(classId, questionId, answer) {
  const ref = doc(db, "classroom_questions", classId, questionId);
  await updateDoc(ref, { answer, answeredAt: serverTimestamp() });
}

//
// ─── EXPORT EVERYTHING ────────────────────────────
export {
  app, auth, db, storage,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  doc, setDoc, getDoc, getDocs, updateDoc, addDoc,
  collection, query, where, orderBy, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove, deleteDoc,
  sRef, uploadBytesResumable, getDownloadURL
};
