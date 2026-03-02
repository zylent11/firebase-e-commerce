//  Import Firebase Firestore and your initialized db
import { db } from "./firebase.js";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";

//  DOM references
const totalBooksEl = document.getElementById("totalBooks");
const totalStockEl = document.getElementById("totalStock");
const totalSoldEl = document.getElementById("totalSold");
const totalProspectEl = document.getElementById("totalProspect");
const totalPrincipalEl = document.getElementById("totalPrincipal");
const totalRoiEl = document.getElementById("totalROI");
const totalCategoriesEl = document.getElementById("totalCategories");

const booksContainer = document.getElementById("booksContainer");

const categoriesTableBody = document
  .getElementById("categoriesTable")
  .querySelector("tbody");

const auth = getAuth();
const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    alert("Logged out successfully!");
    window.location.href = "/"; // or your login page
  } catch (error) {
    console.error("Logout error:", error);
  }
});

const ADMIN_UID = "5ZyPCxfTfCRBu0MgJCnPyR0ZCPp1";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Not logged in → redirect to login
    window.location.href = "/";
  }

  if (user.uid !== ADMIN_UID) {
    alert("Access denied.");
    signOut(auth);
    window.location.href = "/";
  }
});

//  Real-time listener for books
let books = [];
let currentPage = 1;
const rowsPerPage = 5;

const q = query(collection(db, "books"), orderBy("createdAt", "desc"));

console.log(q);
onSnapshot(q, (snapshot) => {
  books = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  calculateTotals();
  renderCards();
});

function calculateTotals() {
  let totalStock = 0;
  let totalProspect = 0;
  let totalPrincipal = 0;
  let totalRoi = 0;
  let totalSold = 0;

  books.forEach((book) => {
    totalProspect += book.stockQuantity * book.price;
    totalPrincipal += book.stockQuantity * book.principal;
    totalRoi += book.sold * book.price;
    totalStock += book.stockQuantity;
    totalSold += book.sold;
  });

  totalBooksEl.textContent = books.length;
  totalProspectEl.textContent = totalProspect;
  totalPrincipalEl.textContent = totalPrincipal;
  totalRoiEl.textContent = totalRoi;
  totalStockEl.textContent = totalStock;
  totalSoldEl.textContent = totalSold;
}

function renderCards() {
  booksContainer.innerHTML = "";

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedBooks = books.slice(start, end);

  paginatedBooks.forEach((book) => {
    const isPreOrder = book.allowedPreorder ? "Yes" : "No";
    const isSale = book.sale?.enabled ? "Yes" : "No";

    const card = document.createElement("div");
    card.classList.add("book-card");

    card.innerHTML = `
      <img src="${book.imageUrl || ""}" alt="${book.title}" />
      <div class="card-content">
        <h3>${book.title}</h3>
        <p><strong>Author:</strong> ${book.author}</p>
        <p><strong>Price:</strong> ${getEffectivePrice(book)}</p>
        <p><strong>Stock:</strong> ${book.stockQuantity}</p>
        <p><strong>Sold:</strong> ${book.sold}</p>
        <p><strong>Preorder:</strong> ${isPreOrder}</p>
        <p><strong>On Sale:</strong> ${isSale}</p>

        <div class="card-actions">
          <button data-id="${book.id}" class="editBtn">Edit</button>
          <button data-id="${book.id}" class="deleteBtn">Delete</button>
        </div>
      </div>
    `;

    booksContainer.appendChild(card);
  });

  updatePaginationControls();
}

const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");

prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderCards();
  }
});

nextBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(books.length / rowsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderCards();
  }
});

function updatePaginationControls() {
  const totalPages = Math.ceil(books.length / rowsPerPage);
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

onSnapshot(collection(db, "categories"), (snapshot) => {
  categoriesTableBody.innerHTML = "";
  let totalCategories = 0;

  snapshot.forEach((doc) => {
    const categories = doc.data();

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${categories.name}</td>
      <td>
        <button data-id="${doc.id}" class="editBtn">Edit</button>
        <button data-id="${doc.id}" class="deleteBtn">Delete</button>
      </td>
    `;
    categoriesTableBody.appendChild(tr);
  });

  totalCategoriesEl.textContent = snapshot.size;
});

// Search Input
const bookSearch = document.getElementById("bookSearch");

bookSearch.addEventListener("input", () => {
  const filter = bookSearch.value.toLowerCase();

  document.querySelectorAll(".book-card").forEach((card) => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(filter) ? "" : "none";
  });
});

function getEffectivePrice(book) {
  const now = new Date();

  if (book.sale?.enabled && book.sale.startDate && book.sale.endDate) {
    const startTimestamp = book.sale.startDate; // Assuming this is a Unix timestamp in seconds
    const endTimestamp = book.sale.endDate; // Assuming this is a Unix timestamp in seconds
    const startDate = new Date(startTimestamp.seconds * 1000);
    const endDate = new Date(endTimestamp.seconds * 1000);

    if (now >= startDate && now <= endDate) {
      if (book.sale.discountType === "percentage") {
        return book.price - (book.price * book.sale.discountValue) / 100;
      }

      if (book.sale.discountType === "fixed") {
        return book.price - book.sale.discountValue;
      }
    }
  }

  return book.price;
}
