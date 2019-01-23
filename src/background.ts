
function onHeaders( request: chrome.webRequest.WebRequestHeadersDetails ){
    console.log(`onHeaders: ${request.requestHeaders}`);

    const headers = request.requestHeaders;

    if(headers){
        headers.forEach(header => {
            console.log(`header: ${header.name}: ${header.value}`);
        })
    }
}

const filter: chrome.webRequest.RequestFilter = {
    urls: [
        "https://connect.garmin.com/*"
    ]
}

console.log(`Add listener`);

chrome.webRequest.onSendHeaders.addListener(
    onHeaders, 
    filter,
    ["requestHeaders"] 
    );
