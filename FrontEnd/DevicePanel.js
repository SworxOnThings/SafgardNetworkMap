

export function addDevicePanel(content) {
    const panel = document.getElementById('devicePanel');
    panel.classList.add('open');
    panel.innerHTML = colorStatus(content);  
}

export function refreshDevicePanel(content) {
    const panel = document.getElementById('devicePanel');
    panel.innerHTML = colorStatus(content);
}

function colorStatus(htmlString) {
  return htmlString
    .replace(/\bOFFLINE\b/g, '<span style="color: red;">OFFLINE</span>')
    .replace(/\bONLINE\b/g, '<span style="color: green;">ONLINE</span>');
}

export function removeDevicePanel() {
    const panel = document.getElementById('devicePanel');
    panel.classList.remove('open');
}


window.addDevicePanel = addDevicePanel;