document
  .getElementById("scanButton")
  .addEventListener("click", async () => {
    const resultDiv = document.getElementById("result");

    try {
      resultDiv.textContent = "Scanning...";

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getPageText
      });

      const pageText = results[0].result;

      const lines = pageText
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean);

      let events = extractEvents(lines);

      events = removeDuplicateEvents(events);
      // Sort by date
      events = sortEventsByDate(events);


      displayEvents(events);

    } catch (error) {
      console.error("DateDrop error:", error);
      resultDiv.textContent = `Error: ${error.message}`;
    }
  });


// -----------------------------------------------------
// GET PAGE TEXT
// -----------------------------------------------------

function getPageText() {
  return document.body.innerText;
}


// -----------------------------------------------------
// EXTRACT EVENTS
// -----------------------------------------------------

function extractEvents(lines) {
  const events = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isJunkLine(line)) {
      continue;
    }

    const date = extractDate(line);

    if (!date) {
      continue;
    }

    const time = extractTime(line);

    let title = removeDateAndTime(line);

    // Example:
    //
    // Sept. 11
    // Wear Red, White, and Blue
    //
    // If the date is on its own line,
    // use the next line as the title.
    if (!title && i + 1 < lines.length) {
      const nextLine = lines[i + 1];

      if (
        !extractDate(nextLine) &&
        !isJunkLine(nextLine)
      ) {
        title = nextLine;
      }
    }

    if (!title) {
      continue;
    }

    title = cleanTitle(title);

    if (!isValidTitle(title)) {
      continue;
    }

    events.push({
      title: title,
      date: date,
      time: time
    });
  }

  return events;
}


// -----------------------------------------------------
// EXTRACT DATE
// -----------------------------------------------------

function extractDate(text) {
  const patterns = [
    // September 11 / Sept. 11 / Sep 11
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}\b/i,

    // 9/9/2026
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,

    // 9/9
    /\b\d{1,2}\/\d{1,2}\b/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return match[0];
    }
  }

  return null;
}


// -----------------------------------------------------
// EXTRACT TIME
// -----------------------------------------------------

function extractTime(text) {
  const match = text.match(
    /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i
  );

  return match ? match[0] : null;
}


// -----------------------------------------------------
// REMOVE DATE + TIME FROM TITLE
// -----------------------------------------------------

function removeDateAndTime(text) {
  let title = text;

  const date = extractDate(title);
  const time = extractTime(title);

  if (date) {
    title = title.replace(date, "");
  }

  if (time) {
    title = title.replace(time, "");
  }

  return title
    .replace(/^[\s\-–—:|]+/, "")
    .replace(/[\s\-–—:|]+$/, "")
    .trim();
}


// -----------------------------------------------------
// CLEAN TITLE
// -----------------------------------------------------

function cleanTitle(title) {
  return title
    // Remove numeric date at the end:
    // WEAR RED, WHITE, AND BLUE - 9/11
    .replace(
      /\s*[-–—]\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/i,
      ""
    )

    // Remove leftover bullets
    .replace(/^[•\-–—]\s*/, "")

    // Normalize spaces
    .replace(/\s+/g, " ")

    .trim();
}


// -----------------------------------------------------
// VALID EVENT TITLE
// -----------------------------------------------------

function isValidTitle(title) {
  if (!title) {
    return false;
  }

  if (title.length < 3) {
    return false;
  }

  const lower = title.toLowerCase();

  const junkTitles = [
    "translate",
    "accessibility",
    "table of contents",
    "school hours",
    "newsletter"
  ];

  if (
    junkTitles.some(junk =>
      lower === junk ||
      lower.startsWith(junk)
    )
  ) {
    return false;
  }

  // Don't treat a bare year as an event
  if (/^\d{4}$/.test(title)) {
    return false;
  }

  // Avoid weird punctuation-only titles
  if (!/[a-z]/i.test(title)) {
    return false;
  }

  return true;
}


// -----------------------------------------------------
// FILTER PAGE JUNK
// -----------------------------------------------------

function isJunkLine(text) {
  const lower = text
    .toLowerCase()
    .trim();

  return (
    lower === "translate" ||
    lower === "accessibility" ||
    lower === "table of contents" ||
    lower === "image" ||
    lower === "click here" ||
    lower.includes("accessibility_new") ||
    lower.includes("remove_red_eye") ||
    lower.includes("vertical_align_top") ||
    lower.includes("zoom_out_map") ||
    lower.includes("show in original size") ||
    lower.includes("user uploaded image")
  );
}


// -----------------------------------------------------
// NORMALIZE TITLE FOR DUPLICATE CHECKING
// -----------------------------------------------------

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}


// -----------------------------------------------------
// NORMALIZE DATE
//
// Sept. 11 -> 09/11
// September 11 -> 09/11
// 9/11 -> 09/11
// -----------------------------------------------------

function normalizeDate(date) {
  if (!date) {
    return "";
  }

  const numericMatch = date.match(
    /\b(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\b/
  );

  if (numericMatch) {
    const month = numericMatch[1].padStart(2, "0");
    const day = numericMatch[2].padStart(2, "0");

    return `${month}/${day}`;
  }

  const monthMap = {
    jan: "01",
    january: "01",

    feb: "02",
    february: "02",

    mar: "03",
    march: "03",

    apr: "04",
    april: "04",

    may: "05",

    jun: "06",
    june: "06",

    jul: "07",
    july: "07",

    aug: "08",
    august: "08",

    sep: "09",
    sept: "09",
    september: "09",

    oct: "10",
    october: "10",

    nov: "11",
    november: "11",

    dec: "12",
    december: "12"
  };

  const textMatch = date.match(
    /\b([A-Za-z]+)\.?\s+(\d{1,2})\b/
  );

  if (!textMatch) {
    return date
      .toLowerCase()
      .replace(/\./g, "")
      .trim();
  }

  const monthName =
    textMatch[1].toLowerCase();

  const month =
    monthMap[monthName];

  const day =
    textMatch[2].padStart(2, "0");

  if (!month) {
    return date.toLowerCase().trim();
  }

  return `${month}/${day}`;
}


// -----------------------------------------------------
// REMOVE DUPLICATE EVENTS
// -----------------------------------------------------

function removeDuplicateEvents(events) {
  const uniqueEvents = [];

  events.forEach(event => {
    const normalizedTitle =
      normalizeTitle(event.title);

    const normalizedDate =
      normalizeDate(event.date);

    const existing =
      uniqueEvents.find(savedEvent => {
        const savedTitle =
          normalizeTitle(savedEvent.title);

        const savedDate =
          normalizeDate(savedEvent.date);

        const sameDate =
          savedDate === normalizedDate;

        const sameTitle =
          savedTitle === normalizedTitle ||
          savedTitle.includes(normalizedTitle) ||
          normalizedTitle.includes(savedTitle);

        return sameDate && sameTitle;
      });

    if (!existing) {
      uniqueEvents.push(event);
      return;
    }

    // Keep time if one duplicate has it
    if (!existing.time && event.time) {
      existing.time = event.time;
    }

    // Prefer shorter title
    if (
      event.title.length <
      existing.title.length
    ) {
      existing.title = event.title;
    }
  });

  return uniqueEvents;
}

// -----------------------------------------------------
// SORT EVENTS BY DATE
// -----------------------------------------------------

function sortEventsByDate(events) {
  return events.sort((a, b) => {
    const dateA = normalizeDate(a.date);
    const dateB = normalizeDate(b.date);

    const [monthA, dayA] = dateA.split("/").map(Number);
    const [monthB, dayB] = dateB.split("/").map(Number);

    if (monthA !== monthB) {
      return monthA - monthB;
    }

    return dayA - dayB;
  });
}


// -----------------------------------------------------
// DISPLAY EVENTS
// -----------------------------------------------------

function displayEvents(events) {
  const resultDiv =
    document.getElementById("result");

  resultDiv.innerHTML = "";

  if (events.length === 0) {
    resultDiv.textContent =
      "No events found.";

    return;
  }

  const heading =
    document.createElement("h3");

  heading.textContent =
    `Found ${events.length} possible events`;

  resultDiv.appendChild(heading);

  events.forEach(event => {
    const item =
      document.createElement("div");

    item.style.marginBottom = "12px";
    item.style.padding = "10px";
    item.style.border =
      "1px solid #ddd";
    item.style.borderRadius = "6px";

    const title =
      document.createElement("strong");

    title.textContent =
      event.title;

    item.appendChild(title);

    const date =
      document.createElement("div");

    date.textContent =
      `Date: ${event.date}`;

    item.appendChild(date);

    if (event.time) {
      const time =
        document.createElement("div");

      time.textContent =
        `Time: ${event.time}`;

      item.appendChild(time);
    }

    resultDiv.appendChild(item);
  });
}