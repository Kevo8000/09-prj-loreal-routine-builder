/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput"); // Added for chat input

// Store chat history as an array of messages
// This array keeps all messages (system, user, and assistant) so the AI remembers the conversation.
const messages = [
  {
    role: "system",
    content:
      "You are a helpful assistant for L’Oréal. Only answer questions related to L’Oréal products or associated brands, beauty routines, and product recommendations. If a question is not about L’Oréal or beauty, politely explain that you can only help with L’Oréal-related topics.",
  },
];

const selectedProducts = []; // Array to store selected products

// Save selected products to localStorage
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

// Load selected products from localStorage
function loadSelectedProducts() {
  const data = localStorage.getItem("selectedProducts");
  if (data) {
    try {
      const arr = JSON.parse(data);
      // Only keep valid product objects (with at least a name)
      if (Array.isArray(arr)) {
        selectedProducts.length = 0;
        arr.forEach((p) => {
          if (p && p.name) selectedProducts.push(p);
        });
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
}

// Helper to check if a product is selected
function isProductSelected(product) {
  return selectedProducts.some((p) => p.name === product.name);
}

// Highlight selected cards in the grid
function highlightSelectedCards() {
  document.querySelectorAll(".product-card").forEach((card) => {
    const name = card.getAttribute("data-name");
    if (selectedProducts.some((p) => p.name === name)) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card${isProductSelected(product) ? " selected" : ""}" 
         data-name="${product.name}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info" tabindex="0" role="button" aria-label="Show description for ${
        product.name
      }">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `
    )
    .join("");

  // Add click event listeners to product cards for selection
  document.querySelectorAll(".product-card").forEach((card, idx) => {
    card.addEventListener("click", (e) => {
      // Only select/unselect if not clicking the info area
      if (e.target.closest(".product-info")) return;
      const name = card.getAttribute("data-name");
      const product = products.find((p) => p.name === name);
      if (!product) return;

      if (isProductSelected(product)) {
        const i = selectedProducts.findIndex((p) => p.name === product.name);
        if (i !== -1) selectedProducts.splice(i, 1);
      } else {
        selectedProducts.push(product);
      }
      updateSelectedProductsList();
      highlightSelectedCards();
    });
  });

  // Add click event listeners to product-info for modal
  document
    .querySelectorAll(".product-card .product-info")
    .forEach((infoDiv) => {
      infoDiv.addEventListener("click", (e) => {
        e.stopPropagation();
        const card = infoDiv.closest(".product-card");
        const name = card.getAttribute("data-name");
        const product = products.find((p) => p.name === name);
        if (product) showProductModal(product);
      });
      // Accessibility: open modal on Enter/Space
      infoDiv.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const card = infoDiv.closest(".product-card");
          const name = card.getAttribute("data-name");
          const product = products.find((p) => p.name === name);
          if (product) showProductModal(product);
        }
      });
    });

  highlightSelectedCards();
}

// Modal logic for product descriptions
function showProductModal(product) {
  let modal = document.getElementById("productModal");
  if (!modal) {
    // Create modal if it doesn't exist
    modal = document.createElement("div");
    modal.id = "productModal";
    modal.className = "product-modal";
    modal.innerHTML = `
      <div class="product-modal-content" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <button class="modal-close-btn" aria-label="Close">&times;</button>
        <img class="modal-img" src="" alt="" />
        <h3 id="modalTitle" class="modal-title"></h3>
        <p class="modal-brand"></p>
        <div class="modal-description"></div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close modal on close button
    modal.querySelector(".modal-close-btn").addEventListener("click", () => {
      modal.style.display = "none";
    });
    // Close modal when clicking outside content
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
  }

  // Fill modal content
  modal.querySelector(".modal-img").src = product.image;
  modal.querySelector(".modal-img").alt = product.name;
  modal.querySelector(".modal-title").textContent = product.name;
  modal.querySelector(".modal-brand").textContent = product.brand;
  modal.querySelector(".modal-description").textContent =
    product.description || "No description available.";

  modal.style.display = "flex";
}

// Function to add a message to the chat window
function addMessageToChat(role, content) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${role}`;
  // Add "You: " before user messages
  if (role === "user") {
    msgDiv.textContent = `You: ${content}`;
  } else {
    msgDiv.textContent = content;
  }
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Set initial message
chatWindow.textContent = "";
addMessageToChat("ai", "👋 Hello! How can I help you today?");

/* Show initial placeholder until user selects a category or searches */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category or search to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products || [];
  filterAndDisplayProducts();
}

// Store all loaded products for filtering/searching
let allProducts = [];

// Helper: get current search and category filter values
function getFilterValues() {
  const searchInput = document.getElementById("productSearch");
  const searchText = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const selectedCategory = categoryFilter.value;
  return { searchText, selectedCategory };
}

// Filter and display products by category and search
function filterAndDisplayProducts() {
  const { searchText, selectedCategory } = getFilterValues();
  let filtered = allProducts;

  // Only show products if a category is selected, "all" is selected, or search text is entered
  if (!selectedCategory && !searchText) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Select a category or search to view products
      </div>
    `;
    return;
  }

  // Show all products if "Show All Products" is selected
  if (selectedCategory && selectedCategory !== "all") {
    filtered = filtered.filter(
      (product) => product.category === selectedCategory
    );
  }

  // Filter by search text (name or description or brand)
  if (searchText) {
    filtered = filtered.filter((product) => {
      return (
        product.name.toLowerCase().includes(searchText) ||
        (product.description &&
          product.description.toLowerCase().includes(searchText)) ||
        (product.brand && product.brand.toLowerCase().includes(searchText))
      );
    });
  }

  // If no products match, show a message
  if (filtered.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found.
      </div>
    `;
    return;
  }

  displayProducts(filtered);
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", () => {
  filterAndDisplayProducts();
});

// Handle product search input
const productSearchInput = document.getElementById("productSearch");
if (productSearchInput) {
  productSearchInput.addEventListener("input", () => {
    filterAndDisplayProducts();
  });
}

/* Handle chat form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get user input
  const userText = userInput.value;
  if (!userText) return;

  // Add user message to chat window and messages array
  addMessageToChat("user", userText);
  messages.push({ role: "user", content: userText }); // Add user message to history
  userInput.value = "";

  // Show loading message
  addMessageToChat("ai", "Thinking...");

  try {
    // Call your Cloudflare Worker endpoint instead of OpenAI directly
    // Replace the URL below with your actual deployed Cloudflare Worker endpoint
    const response = await fetch(
      "https://loreal-chatbot.kevinhernandez3.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o", // Use the gpt-4o model
          messages: messages,
        }),
      }
    );

    const data = await response.json();
    // Get the AI's reply from the response
    const aiReply = data.choices[0].message.content;
    // Add AI reply to chat window and messages array
    // Remove the 'Thinking...' message first
    const lastMsg = chatWindow.querySelector(".msg.ai:last-child");
    if (lastMsg && lastMsg.textContent === "Thinking...") {
      chatWindow.removeChild(lastMsg);
    }
    addMessageToChat("ai", aiReply);
    messages.push({ role: "assistant", content: aiReply }); // Add AI reply to history
  } catch (error) {
    // Remove the 'Thinking...' message if error
    const lastMsg = chatWindow.querySelector(".msg.ai:last-child");
    if (lastMsg && lastMsg.textContent === "Thinking...") {
      chatWindow.removeChild(lastMsg);
    }
    addMessageToChat(
      "ai",
      "Sorry, I couldn't connect to the AI. Please try again."
    );
  }
});

// Handle Generate Routine button click
const generateBtn = document.getElementById("generateRoutine");
generateBtn.addEventListener("click", async () => {
  // If no products selected, show a message and return
  if (selectedProducts.length === 0) {
    addMessageToChat(
      "ai",
      "Please select products before generating a routine."
    );
    return;
  }

  // Collect only needed info for each selected product
  const productData = selectedProducts.map((p) => ({
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description,
  }));

  // If no descriptions, add a fallback
  const hasDescriptions = productData.some(
    (p) => p.description && p.description.trim() !== ""
  );

  // Build a clear, explicit user message for the AI
  let userMsg =
    "Build a step-by-step beauty routine using ONLY these products. If any product is not typically used in a routine, explain how it could fit or suggest a creative way to use it. List the steps clearly and use the product names:\n";
  userMsg += productData
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} (${p.brand}) - ${p.category}${
          p.description && p.description.trim() !== ""
            ? `\n${p.description}`
            : ""
        }`
    )
    .join("\n\n");
  if (!hasDescriptions) {
    userMsg +=
      "\n\nSome products may not have descriptions. Please do your best to build a routine anyway.";
  }

  addMessageToChat("user", userMsg);
  messages.push({ role: "user", content: userMsg });

  // Show loading message
  addMessageToChat("ai", "Generating your routine...");

  try {
    // Call your Cloudflare Worker endpoint (uses OpenAI API)
    const response = await fetch(
      "https://loreal-chatbot.kevinhernandez3.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: messages,
        }),
      }
    );

    const data = await response.json();
    const aiReply = data.choices[0].message.content;

    // Remove the 'Generating your routine...' message first
    const lastMsg = chatWindow.querySelector(".msg.ai:last-child");
    if (lastMsg && lastMsg.textContent === "Generating your routine...") {
      chatWindow.removeChild(lastMsg);
    }
    addMessageToChat("ai", aiReply);
    messages.push({ role: "assistant", content: aiReply });
  } catch (error) {
    // Remove the 'Generating your routine...' message if error
    const lastMsg = chatWindow.querySelector(".msg.ai:last-child");
    if (lastMsg && lastMsg.textContent === "Generating your routine...") {
      chatWindow.removeChild(lastMsg);
    }
    addMessageToChat(
      "ai",
      "Sorry, I couldn't generate a routine. Please try again."
    );
  }
});

// Function to update the Selected Products section
function updateSelectedProductsList() {
  const selectedList = document.getElementById("selectedProductsList");
  selectedList.innerHTML = "";

  // Add "Clear All" button if there are selections
  const clearBtnId = "clearSelectedBtn";
  let clearBtn = document.getElementById(clearBtnId);
  if (selectedProducts.length > 0) {
    if (!clearBtn) {
      clearBtn = document.createElement("button");
      clearBtn.id = clearBtnId;
      clearBtn.className = "remove-selected-btn";
      clearBtn.style.marginLeft = "auto";
      clearBtn.style.marginBottom = "10px";
      clearBtn.innerHTML = `<i class="fa-solid fa-trash"></i> Clear All`;
      clearBtn.addEventListener("click", () => {
        selectedProducts.length = 0;
        saveSelectedProducts();
        updateSelectedProductsList();
        highlightSelectedCards();
      });
      selectedList.parentElement.insertBefore(clearBtn, selectedList);
    }
  } else if (clearBtn) {
    clearBtn.remove();
  }

  if (selectedProducts.length === 0) {
    selectedList.innerHTML = `<div style="color:#888;">No products selected.</div>`;
    return;
  }

  selectedProducts.forEach((product, idx) => {
    const item = document.createElement("div");
    item.className = "selected-product-item";
    item.innerHTML = `
      <img src="${product.image}" alt="${product.name}" class="selected-product-img">
      <span class="selected-product-name">${product.name}</span>
      <button class="remove-selected-btn" title="Remove" data-index="${idx}">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    selectedList.appendChild(item);
  });

  // Add event listeners to remove buttons
  selectedList.querySelectorAll(".remove-selected-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(btn.getAttribute("data-index"));
      // Remove from selectedProducts
      selectedProducts.splice(idx, 1);
      saveSelectedProducts();
      updateSelectedProductsList();
      highlightSelectedCards();
    });
  });

  // Save to localStorage after any update
  saveSelectedProducts();
}

// On page load, restore selected products and load all products
loadSelectedProducts();
updateSelectedProductsList();
loadProducts();

// The messages array is sent to the API each time, so the AI can see the whole conversation.
