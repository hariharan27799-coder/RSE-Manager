/** @type {string[]} */
let reviewers = [];
/** @type {string[]} */
let authorFormatted = [];

// ---------- STEP 1 FUNCTIONS ----------
function cleanName(name) {
  name = name.split("http")[0];
  name = name.replace(/[0-9]/g, "").replace(/[^\w\s]/gi, "");
  return name.trim();
}

function formatName(name) {
  let parts = name.split(" ").filter(function (p) { return p; });

  if (parts.length === 1) return parts[0] + " [Au]";

  if (parts.length === 2) {
    let first = parts[0];
    let last = parts[1];
    if (first.length > 5) {
      return last + "," + first + " [Au]"; // Asian style
    }
    return last + " " + first[0] + " [Au]";
  }

  let initials = parts.slice(0, -1).map(function (p) { return p[0]; }).join("");
  let last = parts[parts.length - 1];

  return last + " " + initials + " [Au]";
}

// ---------- AUTHOR COI ----------
function generateAuthorCOI() {
  let inputElem = document.getElementById("authorInput");
  let input = "";
  if (inputElem) {
    input = inputElem.value;
  }
  let authors = input.split(",");
  authorFormatted = authors.map(function (a) { return formatName(cleanName(a)); });
  let coi = "(" + authorFormatted.join(" OR ") + ")";
  let box = document.getElementById("authorCOI");
  if (box) {
    box.value = coi;
  }

  // PubMed link
  generatePubMedLink("authorCOI", coi);
}

// ---------- ADD REVIEWER ----------
function addReviewer() {
  let inputElem = document.getElementById("reviewerInput");
  let name = "";
  if (inputElem) {
    name = inputElem.value.trim();
  }
  if (!name) return;

  if (name.toLowerCase() === "revert back") {
    reviewers.pop();
  } else {
    if (reviewers.length >= 10) {
      alert("Maximum 10 reviewers reached");
      return;
    }
    reviewers.push(name);
  }

  if (inputElem) {
    inputElem.value = "";
  }
  updateUI();
}

// ---------- UPDATE UI ----------
function updateUI() {
  let reviewerListBox = document.getElementById("reviewerList");
  if (reviewerListBox) {
    reviewerListBox.innerHTML = reviewers.map(function (r) {
      return '<span style="background:#667eea;color:white;padding:5px 10px;border-radius:15px;margin:3px;display:inline-block;font-family:sans-serif;">' + r + '</span>';
    }).join("");
  }

  generateAuthorReviewerCOI();
  generateReviewerReviewerCOI();
}

// ---------- AUTHOR-REVIEWER COI ----------
function generateAuthorReviewerCOI() {
  if (reviewers.length === 0 || authorFormatted.length === 0) return;

  let latestReviewer = formatName(cleanName(reviewers[reviewers.length - 1]));
  let authorPart = "(" + authorFormatted.join(" OR ") + ")";
  let reviewerPart = "(" + latestReviewer + ")";
  let final = reviewerPart + " AND " + authorPart;

  let box = document.getElementById("authorReviewerCOI");
  if (box) {
    box.value = final;
  }

  // PubMed link
  generatePubMedLink("authorReviewerPubMed", final);

  // Validate conflict
  validateConflict(final);
}

// ---------- REVIEWER-REVIEWER COI ----------
function generateReviewerReviewerCOI() {
  let box = document.getElementById("reviewerReviewerCOI");
  let linkEl = document.getElementById("reviewerReviewerPubMed");
  if (!box || !linkEl) return;

  if (reviewers.length < 2) {
    box.value = "Need at least 2 reviewers";
    linkEl.innerText = "";
    linkEl.href = "#";
    return;
  }

  let latest = formatName(cleanName(reviewers[reviewers.length - 1]));
  let previous = reviewers.slice(0, -1).map(function (r) { return formatName(cleanName(r)); });

  let prevBlock = "(" + previous.join(" OR ") + ")";
  let latestBlock = "(" + latest + ")";
  let final = latestBlock + " AND " + prevBlock;

  box.value = final;

  // PubMed link
  generatePubMedLink("reviewerReviewerPubMed", final);
}

// ---------- PUBMED LINK GENERIC FUNCTION ----------
function generatePubMedLink(elementId, query) {
  let encoded = encodeURIComponent(query);
  let link = "https://pubmed.ncbi.nlm.nih.gov/?term=" + encoded;

  let el = document.getElementById(elementId);
  if (el) {
    el.href = link;
    el.innerText = link;
  }
}

// ---------- CONFLICT VALIDATION ----------
async function validateConflict(query) {
  let url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term=" + encodeURIComponent(query);

  try {
    let response = await fetch(url);
    let data = await response.json();

    let count = parseInt(data.esearchresult.count, 10) || 0;
    let resultBox = document.getElementById("validationResult");
    if (!resultBox) return;

    if (count > 0) {
      resultBox.innerText = "⚠️ COI Conflict Detected (Publications found)";
      resultBox.style.color = "red";
    } else {
      resultBox.innerText = "✅ No Conflict (No shared publications)";
      resultBox.style.color = "green";
    }
  } catch (error) {
    console.error(error);
  }
}