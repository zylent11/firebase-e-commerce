// categoryForm.js
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

// DOM references
const addCategoryBtn = document.getElementById("addCategoryBtn");
const categoriesTableBody = document
  .getElementById("categoriesTable")
  .querySelector("tbody");

// Add Category
addCategoryBtn.addEventListener("click", async () => {
  const name = prompt("Category name:");
  if (!name) return alert("Name is required");

  await addDoc(collection(db, "categories"), {
    name,
    createdAt: new Date(),
  });

  alert("Category added!");
});

// Edit Category
categoriesTableBody.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("editCategoryBtn")) return;

  const docId = e.target.dataset.id;
  const categoryRef = doc(db, "categories", docId);

  const newName = prompt("New category name:");
  if (!newName) return alert("Name required");

  await updateDoc(categoryRef, { name: newName });
  alert("Category updated!");
  window.location.reload();
});

// Delete Category
categoriesTableBody.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("deleteCategoryBtn")) return;

  const docId = e.target.dataset.id;
  const categoryRef = doc(db, "categories", docId);

  if (confirm("Are you sure you want to delete this category?")) {
    await deleteDoc(categoryRef);
    alert("Category deleted!");
    window.location.reload();
  }
});
