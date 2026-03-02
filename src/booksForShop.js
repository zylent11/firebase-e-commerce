import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";

let cart = [];

let books = [];
let currentPage = 1;
const rowsPerPage = 5;

const q = query(collection(db, "books"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  books = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  renderShop();
});

const main = document.getElementById("indexMain");
function renderShop() {
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedBooks = books.slice(start, end);

  // ONLY clear when rendering first page
  if (currentPage === 1) {
    main.innerHTML = "";
  }

  paginatedBooks.forEach((book) => {
    const mainChildDiv = document.createElement("div");

    // If on sale, display the sale price; otherwise, show regular price
    const priceToDisplay = book.sale.enabled
      ? `₱${getEffectivePrice(book)}`
      : `₱${book.price}`;
    const originalPrice = book.sale.enabled
      ? `<span class="text-sm line-through text-gray-400">₱${book.price}</span>`
      : "";

    mainChildDiv.innerHTML = `
        <div class="group bg-card rounded-lg overflow-hidden border border-border hover:border-primary/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex flex-col relative h-full">
            <a href="#" class="block">
                <div class="aspect-[3/4] overflow-hidden bg-muted relative">
                    <img src="${book.imageUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 lazy-image" data-src="${book.imageUrl}" loading="lazy">
                </div>
            </a>
            <div class="p-2 sm:p-4 flex flex-col flex-1">
                <a class="block flex-1" href="#">
                    <p class="text-[10px] sm:text-xs uppercase tracking-[.5em] text-[hsl(0,0%,45%)] mb-0.5 sm:mb-1 line-clamp-1">
                        ${Array.isArray(book.category) ? book.category.join(", ") : book.category}
                    </p>
                    <h3 class="font-light text-sm sm:text-base mb-0.5 sm:mb-1 line-clamp-2 overflow-hidden group-hover:text-black transition-colors">${book.title}</h3>
                    <p class="text-[10px] sm:text-xs text-[hsl(0,0%,45%)] tracking-[.1em] mb-2 sm:mb-3 truncate">
                        ${book.author}
                    </p>
                </a>
                <div class="flex items-center justify-between mt-auto min-h-[2.5rem] sm:min-h-[3rem]">
                    <div class="flex flex-col justify-center">
                        <span class="text-xs sm:text-sm font-medium text-[hsl(0,0%,15%)]">
                            ${originalPrice} <span class="text-sm font-semibold text-accent">${priceToDisplay}</span>
                        </span>
                    </div>
                    <div class="flex gap-1 sm:gap-2">
                        <button data-id="${book.id}" class="addToCartBtn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-6 w-6 sm:h-8 sm:w-8" title="Pre-order">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shopping-cart h-3 w-3 sm:h-4 sm:w-4">
                                <circle cx="8" cy="21" r="1"></circle>
                                <circle cx="19" cy="21" r="1"></circle>
                                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    main.appendChild(mainChildDiv);
  });

  // Intersection Observer for infinite scroll
  const observer = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Load next page of books if the "load more" button or last book comes into view
          loadNextPage();
          observer.disconnect(); // Stop observing once it has triggered
        }
      });
    },
    {
      rootMargin: "100px", // Start observing before the element is in view
    },
  );

  // Add the observer to the last book in the list (or a load more button)
  const lastBook = document.querySelector(".group:last-child");
  if (lastBook) {
    observer.observe(lastBook);
  }
}

// Load the next page of books
function loadNextPage() {
  currentPage++;
  renderShop(); // This will re-render with the next set of books
}

// Lazy load images when they come into view
const lazyImages = document.querySelectorAll(".lazy-image");

lazyImages.forEach((image) => {
  lazyImageObserver.observe(image);
});

const lazyImageObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src; // Set the src from data-src
        img.classList.remove("lazy-image"); // Remove lazy class to prevent re-observing
        observer.unobserve(img); // Stop observing once image has loaded
      }
    });
  },
  {
    rootMargin: "200px", // Start loading images before they come into the viewport
  },
);

lazyImages.forEach((image) => {
  lazyImageObserver.observe(image);
});

function cartListener() {
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("addToCartBtn")) {
      const id = e.target.dataset.id;
      addToCart(id);
    }
  });
}

cartListener();

function addToCart(bookId) {
  const book = books.find((b) => b.id === bookId);

  console.log(bookId);
  if (!book) return;

  if (book.stockQuantity <= 0) {
    alert("Out of stock!");
    return;
  }

  const existingItem = cart.find((item) => item.id === bookId);

  if (existingItem) {
    if (existingItem.quantity < book.stockQuantity) {
      existingItem.quantity++;
    } else {
      alert("Not enough stock.");
    }
  } else {
    cart.push({
      id: book.id,
      title: book.title,
      price: getEffectivePrice(book),
      quantity: 1,
    });
  }

  renderCart();
}

const cartList = document.getElementById("cartList");
const cartTotal = document.getElementById("cartTotal");
const notifCount = document.getElementById("notifCount");

if (cart.length === 0) {
  notifCount.style.display = "none";
}

function renderCart() {
  cartList.innerHTML = "";
  let total = 0;

  cart.forEach((item) => {
    total += item.price * item.quantity;

    const li = document.createElement("li");
    li.innerHTML = `<span class="cartLiSpan1"> ${item.title} </span> 
                      <span class="cartLiSpan2"> qty: <strong> ${item.quantity} </strong> </span> 
                      <span class="cartLiSpan3">*</span> 
                      <span class="cartLiSpan4"><strong>${item.price.toFixed(2)}</strong></span>`;
    cartList.appendChild(li);
  });

  if (cart.length > 0) {
    notifCount.style.display = "flex";
    notifCount.textContent = cart.length;
  } else {
    notifCount.style.display = "none";
  }
  cartTotal.textContent = total.toFixed(2);
}

const cancelCheckoutBtn = document.getElementById("cancelCheckoutBtn");
const cartContainer = document.getElementById("cartContainer");
const navCartBtn = document.getElementById("navCartBtn");

navCartBtn.addEventListener("click", () => {
  cartContainer.style.display = "block";
});
cancelCheckoutBtn.addEventListener("click", () => {
  cartContainer.style.display = "none";
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

// CHECKOUT CHECKOUT CHECKOUT CHECKOUT CHECKOUT CHECKOUT CHECKOUT CHECKOUT CHECKOUT CHECKOUT CHECKOUT CHECKOUT CHECKOUT CHECKOUT CHECKOUT CHECKOUT

const checkoutForm = document.getElementById("checkoutForm");

checkoutForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (cart.length === 0) {
    alert("Cart is empty");
    return;
  }

  // 🔹 Get guest info
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const address = document.getElementById("address").value.trim();

  // 🔹 Basic validation
  if (!firstName || !lastName || !phone || !email || !address) {
    alert("Please fill in all required fields.");
    return;
  }

  try {
    const orderNumber = await incrementOrderNumber();

    let totalAmount = 0;
    let orderItems = [];

    for (const item of cart) {
      const book = books.find((b) => b.id === item.id);
      const effectivePrice = getEffectivePrice(book);

      totalAmount += effectivePrice * item.quantity;

      orderItems.push({
        bookId: book.id,
        title: book.title,
        author: book.author,
        price: effectivePrice,
        quantity: item.quantity,
        isSale: book.sale.enabled,
        discountType: book.sale.discountType,
        discountValue: book.sale.discountValue,
      });
    }

    // 🔥 Transaction: update stock + sold
    await runTransaction(db, async (transaction) => {
      // -------------------------
      // PHASE 1: READS ONLY
      // -------------------------
      const bookSnapshots = [];

      for (const item of cart) {
        const bookRef = doc(db, "books", item.id);
        const snap = await transaction.get(bookRef);

        if (!snap.exists()) {
          throw new Error("Book not found");
        }

        bookSnapshots.push({
          ref: bookRef,
          data: snap.data(),
          quantity: item.quantity,
        });
      }

      // -------------------------
      // VALIDATION
      // -------------------------
      for (const book of bookSnapshots) {
        if (book.data.stockQuantity < book.quantity) {
          throw new Error("Not enough stock");
        }
      }

      // -------------------------
      // PHASE 2: WRITES ONLY
      // -------------------------
      for (const book of bookSnapshots) {
        transaction.update(book.ref, {
          stockQuantity: book.data.stockQuantity - book.quantity,
          sold: increment(book.quantity),
          updatedAt: serverTimestamp(),
        });
      }

      // Create order AFTER reads finished
      const orderRef = doc(collection(db, "orders"));

      transaction.set(orderRef, {
        orderNumber,
        customer: {
          firstName,
          lastName,
          phone,
          email,
          address,
        },
        items: orderItems,
        totalAmount,
        status: "pending",
        guest: true,
        createdAt: serverTimestamp(),
      });
    });
    cartContainer.style.display = "none";

    alert(`Order successful! Order #${orderNumber}`);

    cart = [];
    renderCart();
    checkoutForm.reset();
  } catch (error) {
    console.error(error);
    alert("Checkout failed. Please try again.");
  }
});

async function incrementOrderNumber() {
  const orderNumberRef = doc(db, "orderNumber", "currentOrderNumber");

  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(orderNumberRef);

    if (!snap.exists()) throw "Order counter missing";

    const newNumber = snap.data().number + 1;

    transaction.update(orderNumberRef, {
      number: newNumber,
    });

    return newNumber;
  });
}

localStorage.setItem("cart", JSON.stringify(cart));
