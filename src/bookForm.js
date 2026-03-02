// src/bookForm.js
import { db, storage } from "./firebase.js";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// DOM references
const addBookBtn = document.getElementById("addBookBtn");
const booksContainer = document.getElementById("booksContainer");

const bookModal = document.getElementById("bookModal");
const bookForm = document.getElementById("bookForm");
const bookFormTitle = document.getElementById("bookFormTitle");
const closeBookModalBtn = document.getElementById("closeBookModal");

// Form fields
const title = document.getElementById("title");
const author = document.getElementById("author");
const description = document.getElementById("description");
const category = document.getElementById("category");
const imageUrl = document.getElementById("imageUrl");
const price = document.getElementById("price");
const principal = document.getElementById("principal");
const stock = document.getElementById("stock");
const allowedPreorder = document.getElementById("allowedPreorder");
const downpaymentType = document.getElementById("downpaymentType");
const downpaymentValue = document.getElementById("downpaymentValue");
const limit = document.getElementById("limit");
const releaseDate = document.getElementById("releaseDate");
const saleEnabled = document.getElementById("saleEnabled");
const discountType = document.getElementById("discountType");
const discountValue = document.getElementById("discountValue");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const sold = document.getElementById("sold");

let editBookId = null; // track if editing

const bookImage = document.getElementById("bookImage"); // Image URL
const previewImage = document.getElementById("previewImage");

const preorderSection = document.getElementById("preorderSection");
const saleSection = document.getElementById("saleSection");

function togglePreorderFields() {
  if (allowedPreorder.checked) {
    preorderSection.style.display = "grid";
    enableInputs(preorderSection, true);
  } else {
    preorderSection.style.display = "none";
    enableInputs(preorderSection, false);
    clearInputs(preorderSection);
  }
}

allowedPreorder.addEventListener("change", togglePreorderFields);

function toggleSaleFields() {
  if (saleEnabled.checked) {
    saleSection.style.display = "grid";
    enableInputs(saleSection, true);
  } else {
    saleSection.style.display = "none";
    enableInputs(saleSection, false);
    clearInputs(saleSection);
  }
}

saleEnabled.addEventListener("change", toggleSaleFields);

function enableInputs(container, enable) {
  container.querySelectorAll("input, select").forEach((input) => {
    input.disabled = !enable;
  });
}

function clearInputs(container) {
  container.querySelectorAll("input, select").forEach((input) => {
    if (input.type === "checkbox") {
      input.checked = false;
    } else {
      input.value = "percentage";
    }
  });
}

bookImage.addEventListener("change", () => {
  const file = bookImage.files[0];
  if (file) {
    previewImage.src = URL.createObjectURL(file);
    previewImage.style.display = "block";
  } else {
    previewImage.src = "";
    previewImage.style.display = "none";
  }
});

// Inside form submission
let existingImageUrl = "";

// Delete the row
booksContainer.addEventListener("click", async (e) => {
  const target = e.target;

  // ---------------- DELETE ----------------
  if (target.classList.contains("deleteBtn")) {
    const docId = target.dataset.id;
    const bookRef = doc(db, "books", docId);

    if (confirm("Are you sure you want to delete this book?")) {
      await deleteDoc(bookRef);
      alert("Book deleted!");
    }
    return;
  }

  // ---------------- EDIT ----------------
  if (target.classList.contains("editBtn")) {
    editBookId = target.dataset.id;
    bookFormTitle.textContent = "Edit Book";

    const bookRef = doc(db, "books", editBookId);
    const bookSnap = await getDoc(bookRef);

    if (!bookSnap.exists()) {
      alert("Book not found!");
      return;
    }

    const bookData = bookSnap.data();
    existingImageUrl = bookData.imageUrl || "";

    // preview image
    if (existingImageUrl) {
      previewImage.src = existingImageUrl;
      previewImage.style.display = "block";
    } else {
      previewImage.style.display = "none";
    }

    // populate fields
    title.value = bookData.title || "";
    author.value = bookData.author || "";
    price.value = bookData.price || "";
    principal.value = bookData.principal || "";
    stock.value = bookData.stockQuantity || "";
    sold.value = bookData.sold;
    allowedPreorder.checked = bookData.allowedPreorder || false;

    downpaymentType.value = bookData.preorder?.downpaymentType || "";
    downpaymentValue.value = bookData.preorder?.downpaymentValue || "";
    limit.value = bookData.preorder?.limit || "";

    releaseDate.value = formatDateForInput(bookData.preorder?.releaseDate);

    saleEnabled.checked = bookData.sale?.enabled || false;
    discountType.value = bookData.sale?.discountType || "";
    discountValue.value = bookData.sale?.discountValue || "";

    startDate.value = formatDateForInput(bookData.sale?.startDate);
    endDate.value = formatDateForInput(bookData.sale?.endDate);

    description.value = bookData.description || "";

    await loadCategoryCheckboxes(
      Array.isArray(bookData.category)
        ? bookData.category
        : [bookData.category].filter(Boolean),
    );

    bookModal.style.display = "flex";
  }

  togglePreorderFields();
  toggleSaleFields();
});

function formatDateForInput(timestamp) {
  if (!timestamp) return "";

  // Firestore Timestamp object has .toDate() method
  const date = timestamp.toDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // months are 0-based
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// For adding a new book
addBookBtn.addEventListener("click", async () => {
  editBookId = null;
  existingImageUrl = ""; // ✅ reset old image
  previewImage.style.display = "none"; // hide preview
  bookFormTitle.textContent = "Add Book";
  bookForm.reset();
  await loadCategoryCheckboxes();
  bookModal.style.display = "flex";
  togglePreorderFields();
  toggleSaleFields();
});

// Close modal
closeBookModalBtn.addEventListener("click", () => {
  bookModal.style.display = "none";
  existingImageUrl = "";
  editBookId = null;
  bookImage.value = "";
  previewImage.style.display = "none";
  bookForm.reset();
});

// Populate category checkboxes
async function loadCategoryCheckboxes(selectedCategories = []) {
  const container = document.getElementById("bookCategoryContainer");
  container.innerHTML = ""; // clear previous

  const categoriesSnapshot = await getDocs(collection(db, "categories"));
  categoriesSnapshot.forEach((doc) => {
    const category = doc.data().name;
    const id = doc.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = category;
    checkbox.id = `cat-${id}`;
    checkbox.classList = `checkbox`;

    // check if this category is selected (for editing)
    if (selectedCategories.includes(category)) {
      checkbox.checked = true;
    }

    const label = document.createElement("label");
    label.htmlFor = `cat-${id}`;
    label.textContent = category;

    const wrapper = document.createElement("div");
    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);

    container.appendChild(wrapper);
  });
}
let submitting = false;
// Handle form submission
bookForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (submitting) return; //Prevent Double Submit (Hidden Bug)
  submitting = true;

  const selectedCategories = Array.from(
    document.querySelectorAll("#bookCategoryContainer input:checked"),
  ).map((cb) => cb.value);

  let finalImageUrl = existingImageUrl; // default old image

  const file = bookImage.files[0];

  // Upload new image if selected
  if (file) {
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const storageRef = ref(storage, `bookImages/${fileName}`);

      // upload
      const snapshot = await uploadBytes(storageRef, file);

      // get URL
      finalImageUrl = await getDownloadURL(snapshot.ref);

      console.log("Uploaded image URL:", finalImageUrl);
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Image upload failed!");
      return;
    }
  }
  // Get form values
  const formData = {
    title: title.value,
    author: author.value,
    description: description.value || "", // Optional field
    category: selectedCategories.length ? selectedCategories : [],
    imageUrl: finalImageUrl || "", // Optional field

    price: price.value,
    principal: principal.value,
    stock: stock.value,
    sold: sold.value,

    allowedPreorder: allowedPreorder.checked, // Checkbox is either true or false

    downpaymentType: downpaymentType.value,
    downpaymentValue: downpaymentValue.value,
    limit: limit.value,
    releaseDate: releaseDate.value,

    saleEnabled: saleEnabled.checked,

    discountType: discountType.value,
    discountValue: discountValue.value,
    startDate: startDate.value,
    endDate: endDate.value,
  };

  // Pass the formData to your addBook function
  addBook(formData);
  submitting = false;

  previewImage.src = "";
  previewImage.style.display = "none";
  existingImageUrl = "";
  bookModal.style.display = "none";
  bookForm.reset();
});

async function addBook(formData) {
  console.log("dasdasa", formData.sold);
  const bookData = {
    title: formData.title,
    author: formData.author,
    description: formData.description,
    category: formData.category,
    imageUrl: formData.imageUrl,
    price: Number(formData.price) || 0,
    principal: Number(formData.principal) || 0,
    stockQuantity: Number(formData.stock) || 0,
    sold: Number(formData.sold) || 0,
    allowedPreorder: formData.allowedPreorder,
    preorder: {
      downpaymentType: formData.allowedPreorder
        ? formData.downpaymentType
        : null,
      downpaymentValue: formData.allowedPreorder
        ? Number(formData.downpaymentValue)
        : 0,
      limit: formData.allowedPreorder ? Number(formData.limit) : 0,
      count: 0,
      releaseDate:
        formData.allowedPreorder && formData.releaseDate
          ? Timestamp.fromDate(new Date(formData.releaseDate))
          : null,
    },
    sale: {
      enabled: formData.saleEnabled,
      discountType: formData.saleEnabled ? formData.discountType : null,
      discountValue: formData.saleEnabled ? Number(formData.discountValue) : 0,
      startDate:
        formData.saleEnabled && formData.startDate
          ? Timestamp.fromDate(new Date(formData.startDate))
          : null,
      endDate:
        formData.saleEnabled && formData.endDate
          ? Timestamp.fromDate(new Date(formData.endDate))
          : null,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (editBookId) {
    const bookRef = doc(db, "books", editBookId); // use the ID
    await updateDoc(bookRef, {
      ...bookData,
      updatedAt: serverTimestamp(), // ensure updatedAt updates
    });
    alert("Book updated!");
  } else {
    await addDoc(collection(db, "books"), bookData);
    alert("Book added!");
  }

  editBookId = null;
}
