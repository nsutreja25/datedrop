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

        document.getElementById("result").textContent =
            pageText.substring(0, 3000);
    });


function getPageText() {
    return document.body.innerText;
}