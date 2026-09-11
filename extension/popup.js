document
.getElementById("scanButton")
.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
    });

    const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: getPageText
        });

         const pageText = results[0].result;

         const events = extractEvents(pageText);

         displayEvents(events);
         
        });

        function extractEvents(text) {
  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const events = [];

  const monthPattern =
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}(?:-\d{1,2})?\b/i;

  for (let i = 0; i < lines.length; i++) {

    const line = lines[i];

    if (monthPattern.test(line)) {
      events.push(line);
    }
  }

  return [...new Set(events)];
}

function displayEvents(events) {
  const resultDiv = document.getElementById("result");

  resultDiv.innerHTML = "";

  if (events.length === 0) {
    resultDiv.textContent = "No events found.";
    return;
  }

  const heading = document.createElement("h3");
  heading.textContent = `Found ${events.length} possible events`;

  resultDiv.appendChild(heading);

  events.forEach(event => {

    const item = document.createElement("div");

    item.textContent = event;

    item.style.marginBottom = "10px";
    item.style.padding = "8px";
    item.style.border = "1px solid #ddd";
    item.style.borderRadius = "6px";

    resultDiv.appendChild(item);
  });
}

function getPageText() {
    return document.body.innerText;
}